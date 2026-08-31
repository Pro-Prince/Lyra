import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getLocalProfile, saveLocalProfile, clearAllData } from '../lib/storage';

export function calculateAge(birthdateStr: string): number {
  if (!birthdateStr) return 0;
  const birthDate = new Date(birthdateStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

interface AuthContextType {
  mode: string;
  user: any;
  isLoading: boolean;
  isConfigured: boolean;
  isGuestMode: boolean;
  isMockAuthed: boolean;
  setMockAuthed: (authed: boolean) => void;
  signIn: (email?: string, password?: string) => Promise<{ error?: string }>;
  signUp: (email?: string, password?: string, birthdate?: string, aiDisclosure?: boolean) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  continueAsGuest: (birthdate?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  mode: 'local',
  user: null,
  isLoading: false,
  isConfigured: false,
  isGuestMode: true,
  isMockAuthed: false,
  setMockAuthed: () => {},
  signIn: async () => ({ error: 'Not available in this phase' }),
  signUp: async () => ({ error: 'Not available in this phase' }),
  signInWithGoogle: async () => ({ error: 'Not available in this phase' }),
  continueAsGuest: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(true);
  const [isMockAuthed, setIsMockAuthedState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfigured] = useState<boolean>(false);

  useEffect(() => {
    async function initAuth() {
      try {
        const profile = await getLocalProfile();
        if (profile && profile.adultConfirmed) {
          setIsGuestMode(true);
        }
      } catch (e) {
        console.error('Error loading local profile:', e);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const setMockAuthed = (authed: boolean) => {
    setIsMockAuthedState(authed);
    if (authed) {
      getLocalProfile().then(existing => {
        saveLocalProfile({ ...existing, adultConfirmed: true });
      });
    }
  };

  const continueAsGuest = async (birthdate?: string) => {
    await clearAllData();
    setIsGuestMode(true);
    await saveLocalProfile({ birthdate: birthdate || null, adultConfirmed: true, initialized: false });
  };

  const signIn = async () => {
    setMockAuthed(true);
    return {};
  };

  const signUp = async (_email?: string, _password?: string, birthdate?: string) => {
    await clearAllData();
    setMockAuthed(true);
    await saveLocalProfile({ birthdate: birthdate || null, adultConfirmed: true, initialized: false });
    return {};
  };

  const signInWithGoogle = async () => {
    await clearAllData();
    setMockAuthed(true);
    await saveLocalProfile({ birthdate: null, adultConfirmed: true, initialized: false });
    return {};
  };

  const signOut = async () => {
    await clearAllData();
    setIsMockAuthedState(false);
    setIsGuestMode(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        mode: 'local',
        user,
        isLoading,
        isConfigured,
        isGuestMode,
        isMockAuthed,
        setMockAuthed,
        signIn,
        signUp,
        signInWithGoogle,
        continueAsGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function useMockAuthState() {
  const { isMockAuthed, setMockAuthed } = useContext(AuthContext);
  const mockUser = isMockAuthed ? { name: "Alex", email: "alex@example.com" } : null;
  return { isMockAuthed, setMockAuthed, mockUser };
}
