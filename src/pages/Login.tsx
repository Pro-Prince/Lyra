import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { isOnboardingCompleted } from '../lib/storage';
import Button from '../components/Button';
import { motion } from 'motion/react';
import { pageCrossfadeVariants } from '../lib/motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthed, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthed) {
      isOnboardingCompleted().then((completed) => {
        if (completed) {
          sessionStorage.setItem('lyra_auth_toast_message', 'Successfully logged in!');
          navigate('/chat', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      });
    }
  }, [isAuthed, authLoading, navigate]);

  const handleGoogleLogin = async () => {
    try {
      sessionStorage.setItem('lyra_auth_intent', 'signin');
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/onboarding` },
      });
    } catch (err: any) {
      setError(err?.message || 'Google sign in failed');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      sessionStorage.setItem('lyra_auth_intent', 'signin');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { 
        setError(error.message); 
        return; 
      }
      const completed = await isOnboardingCompleted();
      if (completed) {
        sessionStorage.setItem('lyra_auth_toast_message', 'Successfully logged in!');
        navigate('/chat', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <img src="/images/Logo.png" alt="" className="auth-logo-badge" />
        <h1 className="auth-app-name">Lyra</h1>
        <p className="auth-tagline">A quiet AI companion.</p>
      </div>

      <div className="auth-card">
        <h2 className="auth-card-heading">Welcome back</h2>

        <form onSubmit={handleEmailLogin}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {error && <p className="auth-error">{error}</p>}

          <Button variant="primary" size="lg" type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <div className="auth-divider"><span>OR</span></div>

        <Button variant="secondary" size="lg" onClick={handleGoogleLogin} className="auth-google-btn">
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
          </span>
        </Button>

        <p className="auth-switch">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>

      <p className="auth-legal">
        By continuing you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
      </p>
    </div>
  );
}
