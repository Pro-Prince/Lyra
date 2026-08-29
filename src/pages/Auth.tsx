import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, calculateAge } from '../context/AuthContext';
import { getCompanion } from '../lib/storage';
import { t } from '../lib/i18n';
import { Sparkles, ArrowRight, Lock, Mail, Calendar, AlertCircle } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn, signInWithGoogle, isConfigured, continueAsGuest } = useAuth();
  const { showError, showInfo } = useToast();

  const queryParams = new URLSearchParams(location.search);
  const initialMode = queryParams.get('mode') === 'signin' ? 'signin' : 'signup';

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [aiDisclosure, setAiDisclosure] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const computedAge = birthdate ? calculateAge(birthdate) : null;
  const isUnderage = computedAge !== null && computedAge < 18;

  const handleAuthSuccess = async () => {
    const companion = await getCompanion();
    if (companion && companion.initialized) {
      navigate('/chat', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'signup') {
      if (!birthdate) {
        showError('Please select your birthdate to continue');
        return;
      }
      if (isUnderage) {
        showError('Account creation is restricted to adults aged 18 and older');
        return;
      }
      if (!aiDisclosure) {
        showError('Please acknowledge the 18+ adult confirmation and AI disclaimer to continue');
        return;
      }
      if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
      }

      setIsSubmitting(true);
      const { error } = await signUp(email.trim(), password, birthdate, aiDisclosure);
      setIsSubmitting(false);

      if (error) {
        console.error('[Auth] Registration error:', error);
        if (error.toLowerCase().includes('confirm') || error.toLowerCase().includes('verification')) {
          showInfo('Registration successful! Please check your email to confirm your account.');
        } else {
          showError('Unable to create account right now, please check your details and try again');
        }
      } else {
        await handleAuthSuccess();
      }
    } else {
      // Sign In
      if (!email.trim() || !password) {
        showError('Please enter your email and password to sign in');
        return;
      }

      setIsSubmitting(true);
      const { error } = await signIn(email.trim(), password);
      setIsSubmitting(false);

      if (error) {
        console.error('[Auth] Sign in error:', error);
        showError('Unable to sign in right now, please check your credentials and try again');
      } else {
        await handleAuthSuccess();
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const { error } = await signInWithGoogle();
    setIsSubmitting(false);
    if (error) {
      console.error('[Auth] Google sign in error:', error);
      showError('Unable to complete Google sign-in right now, please try again');
    }
  };

  const handleLocalGuestMode = async () => {
    if (isUnderage) {
      showError('Account creation is restricted to adults aged 18 and older');
      return;
    }
    await continueAsGuest(birthdate || undefined);
    await handleAuthSuccess();
  };

  return (
    <div className="relative min-h-screen w-full bg-[var(--bg-base)] text-[var(--text-primary)] font-body overflow-x-hidden flex items-center justify-center p-4 sm:p-6">
      {/* Ambient Lighting Atmosphere */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[var(--accent-primary)] opacity-[0.04] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md my-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group header-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/images/Logo.png" alt="Lyra" className="logo-badge-img shadow-sm group-hover:scale-105 transition-transform" />
            <span className="wordmark font-heading font-medium text-2xl tracking-tight text-[var(--text-primary)]">Lyra</span>
          </Link>

          <h1 className="font-heading text-2xl sm:text-3xl font-medium tracking-tight text-[var(--text-primary)] mb-2">
            {mode === 'signup' ? t('auth_signup_title') : t('auth_welcome_title')}
          </h1>
          <p className="text-[var(--text-muted)] text-xs sm:text-sm max-w-xs">
            {t('auth_subtitle')}
          </p>
        </div>

        {/* Auth Glass Container */}
        <div className="bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.85)]">
          {/* Mode Switch Tabs */}
          <div className="flex bg-[var(--bg-base)]/50 border border-[var(--text-primary)]/[0.08] p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-[var(--accent-primary)] text-[#2D0A1E] '
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('auth_signup_title')}
            </button>
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-[var(--accent-primary)] text-[#2D0A1E] '
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('auth_sign_in_button')}
            </button>
          </div>

          {/* Social Google OAuth Button */}
          {isConfigured && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 bg-[var(--text-primary)]/[0.05] hover:bg-[var(--text-primary)]/[0.09] border border-[var(--text-primary)]/[0.12] text-[var(--text-primary)] py-3 px-4 rounded-xl font-medium text-xs sm:text-sm transition-all shadow-sm active:scale-[0.98] mb-4"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.1 8.8 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.4s.2-1.7.4-2.4L1.6 7c-.8 1.6-1.3 3.4-1.3 5.3s.5 3.7 1.3 5.3l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.8-2.1-6.8-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
                  />
                </svg>
                <span>{t('auth_google_button')}</span>
              </button>

              <div className="relative flex py-2 items-center mb-5">
                <div className="flex-grow border-t border-[var(--text-primary)]/[0.08]" />
                <span className="flex-shrink mx-3 text-[11px] font-body uppercase tracking-wider text-[var(--text-muted)]">
                  {t('auth_or_divider')}
                </span>
                <div className="flex-grow border-t border-[var(--text-primary)]/[0.08]" />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                {t('auth_email_label')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[var(--bg-base)]/70 border border-[var(--text-primary)]/[0.1] rounded-xl pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-body"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                {t('auth_password_label')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full bg-[var(--bg-base)]/70 border border-[var(--text-primary)]/[0.1] rounded-xl pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-body"
                />
              </div>
            </div>

            {/* Sign Up Fields: Birthdate & AI Disclosure */}
            {mode === 'signup' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      {t('auth_dob_label')}
                    </label>
                    {computedAge !== null && (
                      <span className={`text-[11px] font-body font-medium ${isUnderage ? 'text-[var(--text-danger)]' : 'text-[var(--accent-primary)]'}`}>
                        Age: {computedAge} {isUnderage ? '(Under 18)' : '(18+ Verified)'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="date"
                      required
                      value={birthdate}
                      onChange={(e) => setBirthdate(e.target.value)}
                      className="w-full bg-[var(--bg-base)]/70 border border-[var(--text-primary)]/[0.1] rounded-xl pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-body [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Under 18 Block Alert */}
                {isUnderage && (
                  <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-2.5 text-[var(--text-danger)] text-xs">
                    <AlertCircle className="w-4 h-4 text-[var(--text-danger)] flex-shrink-0 mt-0.5" />
                    <span>{t('auth_restricted_warning')}</span>
                  </div>
                )}

                {/* Adult & AI-Disclosure Agreement Checkbox */}
                <label className="flex items-start gap-3 cursor-pointer pt-2 group">
                  <div className="relative flex items-start justify-center mt-0.5">
                    <input
                      type="checkbox"
                      required
                      checked={aiDisclosure}
                      onChange={(e) => setAiDisclosure(e.target.checked)}
                      className="peer appearance-none w-4 h-4 border border-[var(--text-primary)]/20 rounded bg-[var(--bg-base)]/40 checked:bg-[var(--accent-primary)] checked:border-[var(--accent-primary)] transition-all focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                    />
                    <svg
                      className="absolute w-2.5 h-2.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-[var(--bg-base)] top-0.5"
                      viewBox="0 0 14 10"
                      fill="none"
                    >
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] leading-snug group-hover:text-[var(--text-primary)] transition-colors">
                    {t('auth_adult_checkbox')}
                  </span>
                </label>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || (mode === 'signup' && isUnderage)}
              className="btn btn-primary btn-lg w-full mt-2 cursor-pointer"
            >
              <span>{mode === 'signup' ? t('auth_sign_up_button') : t('auth_sign_in_button')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Local Guest Fallback */}
          {!isConfigured && (
            <div className="mt-5 pt-4 border-t border-[var(--text-primary)]/[0.08] text-center">
              <p className="text-[11px] text-[var(--text-muted)] mb-2">
                Local storage mode active. No cloud credentials required.
              </p>
              <button
                type="button"
                onClick={handleLocalGuestMode}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--text-primary)]/[0.04] hover:bg-[var(--text-primary)]/[0.08] border border-[var(--text-primary)]/[0.1] text-xs font-medium text-[var(--text-primary)] transition-colors"
              >
                {t('auth_guest_button')}
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6">
          <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
            {t('landing_disclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}
