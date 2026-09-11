import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { SplashScreen } from '../components/AppSplash';

export default function AuthCallback() {
  const [status, setStatus] = useState('Completing authentication…');
  const navigate = useNavigate();

  useEffect(() => {
    let handled = false;

    async function processAuth() {
      if (handled) return;
      try {
        // 1. Get session from URL hash / code
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        // If session found or if auth event fires
        const handleSuccess = (activeSession: any) => {
          if (handled) return;
          handled = true;

          // If inside a popup window, inform the parent iframe and close
          if (window.opener && window.opener !== window) {
            try {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_SUCCESS',
                accessToken: activeSession?.access_token || '',
                refreshToken: activeSession?.refresh_token || '',
                user: activeSession?.user || null
              }, '*');
            } catch (postErr) {
              console.warn('Failed to postMessage to opener:', postErr);
            }
            setStatus('Authenticated! Closing window…');
            setTimeout(() => {
              window.close();
            }, 500);
            return;
          }

          // If top-level navigation
          setStatus('Authenticated! Redirecting…');
          navigate('/onboarding', { replace: true });
        };

        if (session) {
          handleSuccess(session);
        } else {
          // Listen for onAuthStateChange
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (newSession) {
              subscription.unsubscribe();
              handleSuccess(newSession);
            }
          });

          // Fallback timeout
          setTimeout(async () => {
            if (!handled) {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                handleSuccess(retrySession);
              } else {
                handled = true;
                if (window.opener && window.opener !== window) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: 'Authentication timeout' }, '*');
                  window.close();
                } else {
                  navigate('/login', { replace: true });
                }
              }
            }
          }, 3000);
        }
      } catch (err: any) {
        console.error('[AuthCallback] Error:', err);
        if (!handled) {
          handled = true;
          if (window.opener && window.opener !== window) {
            try {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_ERROR',
                error: err?.message || 'Authentication failed'
              }, '*');
            } catch {}
            window.close();
          } else {
            navigate('/login', { replace: true });
          }
        }
      }
    }

    processAuth();
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] p-6 text-center">
      <SplashScreen />
      <p className="mt-4 text-sm font-medium text-[var(--text-muted)] animate-pulse">{status}</p>
    </div>
  );
}
