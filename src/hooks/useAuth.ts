import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { clearAllMessages } from '../lib/storage';

// Module-level cache so route switches have 0ms loading state
let cachedSession: Session | null = null;
let isInitialized = !isSupabaseConfigured;
let authListenerRegistered = false;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.warn('[useAuth] Subscriber notification error:', err);
    }
  });
}

// Global bootstrap once at module load
if (typeof window !== 'undefined' && isSupabaseConfigured) {
  supabase.auth.getSession()
    .then(({ data: { session } }) => {
      cachedSession = session;
      isInitialized = true;
      notifySubscribers();
    })
    .catch((err) => {
      console.warn('[useAuth] Error retrieving initial session:', err);
      isInitialized = true;
      notifySubscribers();
    });

  if (!authListenerRegistered) {
    authListenerRegistered = true;
    try {
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
          clearAllMessages().catch(console.warn);
        }
        if (event === 'SIGNED_IN') {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('lyra_welcome_needed', 'true');
          }
        }
        cachedSession = session;
        isInitialized = true;
        notifySubscribers();
      });
    } catch (err) {
      console.warn('[useAuth] Error attaching onAuthStateChange:', err);
    }
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(cachedSession);
  const [loading, setLoading] = useState(!isInitialized);
  const [isGuestMode, setIsGuestMode] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem("lyra_guest_mode") === "true";
    }
    return false;
  });

  useEffect(() => {
    // If state resolved before/during mount
    setSession(cachedSession);
    setLoading(!isInitialized);

    const update = () => {
      setSession(cachedSession);
      setLoading(!isInitialized);
      if (typeof localStorage !== 'undefined') {
        setIsGuestMode(localStorage.getItem("lyra_guest_mode") === "true");
      }
    };

    subscribers.add(update);
    return () => {
      subscribers.delete(update);
    };
  }, []);

  const signOut = async () => {
    try {
      await clearAllMessages();
    } catch (err) {
      console.warn('[useAuth] Clear messages on signOut error:', err);
    }
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[useAuth] Sign out error:', err);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem("lyra_guest_mode");
      localStorage.removeItem("lyra_onboarding_completed");
    }
    cachedSession = null;
    setIsGuestMode(false);
    setSession(null);
    notifySubscribers();
  };

  const continueAsGuest = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem("lyra_guest_mode", "true");
    }
    setIsGuestMode(true);
    notifySubscribers();
  };

  return { session, isAuthed: !!session, loading, signOut, isGuestMode, continueAsGuest };
}

