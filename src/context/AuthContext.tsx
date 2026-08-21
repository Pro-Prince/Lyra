import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, SupabaseProfile } from '../lib/supabaseClient';
import { getLocalProfile, saveLocalProfile } from '../lib/storage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: SupabaseProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isGuestMode: boolean;
  signUp: (email: string, password: string, birthdate: string, aiDisclosure: boolean) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: (birthdate?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const calculateAge = (dobString: string): number => {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SupabaseProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);

  const fetchProfile = async (userId: string, userEmail?: string): Promise<SupabaseProfile | null> => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Could not fetch Supabase profile:', error.message);
      }

      if (data) {
        setProfile(data as SupabaseProfile);
        // Sync local IndexedDB profile
        await saveLocalProfile({
          isAdultConfirmed: data.is_adult_confirmed,
          birthdate: data.birthdate,
          name: data.email?.split('@')[0] || 'Friend',
          initialized: true,
        });
        return data as SupabaseProfile;
      } else if (userEmail) {
        // Fallback: If profile row doesn't exist yet, inspect auth user metadata
        const userMeta = user?.user_metadata || {};
        const isAdult = Boolean(userMeta.is_adult_confirmed ?? true);
        const fallbackProfile: SupabaseProfile = {
          id: userId,
          email: userEmail,
          birthdate: userMeta.birthdate || undefined,
          is_adult_confirmed: isAdult,
          ai_disclosure_accepted: Boolean(userMeta.ai_disclosure_accepted ?? true),
        };
        setProfile(fallbackProfile);
        return fallbackProfile;
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
    return null;
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (isSupabaseConfigured) {
          const { data: { session: initialSession } } = await supabase.auth.getSession();
          if (initialSession?.user) {
            setUser(initialSession.user);
            setSession(initialSession);
            await fetchProfile(initialSession.user.id, initialSession.user.email);
          } else {
            // Check local profile for guest mode
            const local = await getLocalProfile();
            if (local?.isAdultConfirmed) {
              setIsGuestMode(true);
            }
          }

          // Listen for auth state changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!mounted) return;
            setSession(newSession);
            setUser(newSession?.user || null);

            if (newSession?.user) {
              setIsGuestMode(false);
              await fetchProfile(newSession.user.id, newSession.user.email);
            } else {
              setProfile(null);
            }
          });

          return () => {
            subscription.unsubscribe();
          };
        } else {
          // Supabase not configured -> fallback to local IndexedDB guest mode
          const local = await getLocalProfile();
          if (local?.isAdultConfirmed) {
            setIsGuestMode(true);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    birthdate: string,
    aiDisclosure: boolean
  ): Promise<{ error: string | null }> => {
    // 1. Client & Server Age Enforcement
    if (!birthdate) {
      return { error: 'Please enter your birthdate.' };
    }
    const age = calculateAge(birthdate);
    if (age < 18) {
      return { error: 'Access restricted: You must be at least 18 years old to create an account.' };
    }
    if (!aiDisclosure) {
      return { error: 'You must confirm the AI disclosure agreement to proceed.' };
    }

    if (!isSupabaseConfigured) {
      // Local fallback
      await saveLocalProfile({
        name: email.split('@')[0],
        birthdate,
        isAdultConfirmed: true,
        initialized: true,
      });
      setIsGuestMode(true);
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            birthdate,
            is_adult_confirmed: true,
            ai_disclosure_accepted: aiDisclosure,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);

        // Upsert profile in Supabase profiles table
        const newProfile: SupabaseProfile = {
          id: data.user.id,
          email,
          birthdate,
          is_adult_confirmed: true,
          ai_disclosure_accepted: aiDisclosure,
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(newProfile);

        if (profileError) {
          console.warn('Profiles table upsert warning (RLS or table missing):', profileError.message);
        }

        setProfile(newProfile);

        // Keep local IndexedDB synced
        await saveLocalProfile({
          name: email.split('@')[0],
          birthdate,
          isAdultConfirmed: true,
          initialized: true,
        });
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred during signup.' };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured) {
      await saveLocalProfile({
        name: email.split('@')[0],
        isAdultConfirmed: true,
        initialized: true,
      });
      setIsGuestMode(true);
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        const userProfile = await fetchProfile(data.user.id, data.user.email);

        // Enforce age check if birthdate is present in profile or metadata
        if (userProfile?.birthdate) {
          const age = calculateAge(userProfile.birthdate);
          if (age < 18) {
            await supabase.auth.signOut();
            return { error: 'Access restricted: Account holder is under 18 years old.' };
          }
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to sign in.' };
    }
  };

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase URL and Anon Key are not configured in environment.' };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Google OAuth failed to start.' };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsGuestMode(false);
  };

  const continueAsGuest = async (birthdate?: string) => {
    await saveLocalProfile({
      name: 'Friend',
      birthdate,
      isAdultConfirmed: true,
      initialized: true,
    });
    setIsGuestMode(true);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isConfigured: isSupabaseConfigured,
        isGuestMode,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        continueAsGuest,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
