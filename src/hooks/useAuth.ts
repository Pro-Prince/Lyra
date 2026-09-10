import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(() => localStorage.getItem("lyra_guest_mode") === "true");

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const isHandlingOAuthCallback = typeof window !== 'undefined' && (
      window.location.hash.includes('access_token=') ||
      window.location.hash.includes('refresh_token=') ||
      window.location.search.includes('code=')
    );

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (mounted) {
          if (session) {
            setSession(session);
            setLoading(false);
          } else if (!isHandlingOAuthCallback) {
            setSession(null);
            setLoading(false);
          }
        }
      })
      .catch((err) => {
        console.warn('[useAuth] Error retrieving session:', err);
        if (mounted && !isHandlingOAuthCallback) {
          setSession(null);
          setLoading(false);
        }
      });

    const callbackTimeout = isHandlingOAuthCallback ? setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3500) : null;

    try {
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setSession(session);
          setLoading(false);
        }
      });

      return () => {
        mounted = false;
        if (callbackTimeout) clearTimeout(callbackTimeout);
        listener?.subscription?.unsubscribe();
      };
    } catch (err) {
      console.warn('[useAuth] Error attaching onAuthStateChange:', err);
      return () => {
        mounted = false;
        if (callbackTimeout) clearTimeout(callbackTimeout);
      };
    }
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[useAuth] Sign out error:', err);
    }
    localStorage.removeItem("lyra_guest_mode");
    setIsGuestMode(false);
    setSession(null);
  };

  const continueAsGuest = () => {
    localStorage.setItem("lyra_guest_mode", "true");
    setIsGuestMode(true);
  };

  return { session, isAuthed: !!session, loading, signOut, isGuestMode, continueAsGuest };
}
