import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, calculateAge } from '../context/AuthContext';
import { getCompanion } from '../lib/storage';
import { t, Language, getLanguage } from '../lib/i18n';
import { Sparkles, AlertCircle, ArrowRight, ShieldCheck, Lock, Mail, Calendar } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn, signInWithGoogle, isConfigured, continueAsGuest } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const initialMode = queryParams.get('mode') === 'signin' ? 'signin' : 'signup';

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [aiDisclosure, setAiDisclosure] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [lang] = useState<Language>(getLanguage());

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
    setErrorMessage(null);
    setSuccessNotice(null);

    if (mode === 'signup') {
      if (!birthdate) {
        setErrorMessage('Please select your birthdate.');
        return;
      }
      if (isUnderage) {
        setErrorMessage('Account creation is restricted to adults aged 18 and older.');
        return;
      }
      if (!aiDisclosure) {
        setErrorMessage('You must confirm the 18+ adult confirmation and AI disclosure.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }

      setIsSubmitting(true);
      const { error } = await signUp(email.trim(), password, birthdate, aiDisclosure);
      setIsSubmitting(false);

      if (error) {
        // If Supabase requires email confirmation, guide the user
        if (error.toLowerCase().includes('confirm') || error.toLowerCase().includes('verification')) {
          setSuccessNotice('Registration successful! Please check your email to confirm your account.');
        } else {
          setErrorMessage(error);
        }
      } else {
        await handleAuthSuccess();
      }
    } else {
      // Sign In
      if (!email.trim() || !password) {
        setErrorMessage('Please enter your email and password.');
        return;
      }

      setIsSubmitting(true);
      const { error } = await signIn(email.trim(), password);
      setIsSubmitting(false);

      if (error) {
        setErrorMessage(error);
      } else {
        await handleAuthSuccess();
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const { error } = await signInWithGoogle();
    setIsSubmitting(false);
    if (error) {
      setErrorMessage(error);
    }
  };

  const handleLocalGuestMode = async () => {
    if (isUnderage) {
      setErrorMessage('Access restricted: You must be at least 18 years old.');
      return;
    }
    await continueAsGuest(birthdate || undefined);
    await handleAuthSuccess();
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0A0A0D] text-white font-body overflow-x-hidden flex items-center justify-center p-4 sm:p-6">
      {/* Ambient Lighting Atmosphere */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#4DE8D4] opacity-[0.04] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md my-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-10 h-10 rounded-2xl bg-[#4DE8D4]/10 border border-[#4DE8D4]/30 flex items-center justify-center text-[#4DE8D4] shadow-[0_0_20px_rgba(77,232,212,0.2)] group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight text-white">Lyra</span>
          </Link>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            {mode === 'signup' ? t('auth_signup_title', lang) : t('auth_welcome_title', lang)}
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm max-w-xs">
            {t('auth_subtitle', lang)}
          </p>
        </div>

        {/* Auth Glass Container */}
        <div className="bg-[#121217]/90 backdrop-blur-[24px] border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.85)]">
          {/* Mode Switch Tabs */}
          <div className="flex bg-black/50 border border-white/[0.08] p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-[#4DE8D4] text-[#0A0A0D] shadow-[0_0_12px_rgba(77,232,212,0.3)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('auth_signup_title', lang)}
            </button>
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-[#4DE8D4] text-[#0A0A0D] shadow-[0_0_12px_rgba(77,232,212,0.3)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('auth_sign_in_button', lang)}
            </button>
          </div>

          {/* Social Google OAuth Button */}
          {isConfigured && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.12] text-white py-3 px-4 rounded-xl font-medium text-xs sm:text-sm transition-all shadow-sm active:scale-[0.99] mb-4"
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
                <span>{t('auth_google_button', lang)}</span>
              </button>

              <div className="relative flex py-2 items-center mb-5">
                <div className="flex-grow border-t border-white/[0.08]" />
                <span className="flex-shrink mx-3 text-[11px] font-mono uppercase tracking-wider text-gray-500">
                  {t('auth_or_divider', lang)}
                </span>
                <div className="flex-grow border-t border-white/[0.08]" />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-1.5">
                {t('auth_email_label', lang)}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#4DE8D4] focus:ring-1 focus:ring-[#4DE8D4] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-1.5">
                {t('auth_password_label', lang)}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#4DE8D4] focus:ring-1 focus:ring-[#4DE8D4] transition-all"
                />
              </div>
            </div>

            {/* Sign Up Fields: Birthdate & AI Disclosure */}
            {mode === 'signup' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider">
                      {t('auth_dob_label', lang)}
                    </label>
                    {computedAge !== null && (
                      <span className={`text-[11px] font-mono font-medium ${isUnderage ? 'text-red-400' : 'text-[#4DE8D4]'}`}>
                        Age: {computedAge} {isUnderage ? '(Under 18)' : '(18+ Verified)'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="date"
                      required
                      value={birthdate}
                      onChange={(e) => setBirthdate(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.1] rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#4DE8D4] focus:ring-1 focus:ring-[#4DE8D4] transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Under 18 Block Alert */}
                {isUnderage && (
                  <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-2.5 text-red-300 text-xs">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <span>{t('auth_restricted_warning', lang)}</span>
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
                      className="peer appearance-none w-4 h-4 border border-white/20 rounded bg-black/40 checked:bg-[#4DE8D4] checked:border-[#4DE8D4] transition-all focus:outline-none focus:ring-1 focus:ring-[#4DE8D4]"
                    />
                    <svg
                      className="absolute w-2.5 h-2.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-[#0A0A0D] top-0.5"
                      viewBox="0 0 14 10"
                      fill="none"
                    >
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-300 leading-snug group-hover:text-gray-200 transition-colors">
                    {t('auth_adult_checkbox', lang)}
                  </span>
                </label>
              </>
            )}

            {/* Error / Success Notifications */}
            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center gap-2 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successNotice && (
              <div className="p-3 bg-teal-950/40 border border-teal-800/60 rounded-xl flex items-center gap-2 text-teal-300 text-xs">
                <ShieldCheck className="w-4 h-4 text-[#4DE8D4] flex-shrink-0" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || (mode === 'signup' && isUnderage)}
              className="w-full group inline-flex items-center justify-center gap-2 bg-[#4DE8D4] text-[#0A0A0D] py-3.5 px-4 rounded-xl font-bold text-sm transition-all hover:bg-[#63f2df] hover:shadow-[0_0_20px_rgba(77,232,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              <span>{mode === 'signup' ? t('auth_sign_up_button', lang) : t('auth_sign_in_button', lang)}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Local Guest Fallback (If Supabase keys are not configured or user prefers offline IndexedDB) */}
          {!isConfigured && (
            <div className="mt-5 pt-4 border-t border-white/[0.08] text-center">
              <p className="text-[11px] text-gray-400 mb-2">
                Local storage mode active. No cloud credentials required.
              </p>
              <button
                type="button"
                onClick={handleLocalGuestMode}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-medium text-gray-200 transition-colors"
              >
                {t('auth_guest_button', lang)}
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6">
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            {t('landing_disclaimer', lang)}
          </p>
        </div>
      </div>
    </div>
  );
}
