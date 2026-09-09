import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(() => localStorage.getItem("lyra_guest_mode") === "true");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("lyra_guest_mode");
    setIsGuestMode(false);
  };

  const continueAsGuest = () => {
    localStorage.setItem("lyra_guest_mode", "true");
    setIsGuestMode(true);
  };

  return { session, isAuthed: !!session, loading, signOut, isGuestMode, continueAsGuest };
}
