import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMockAuthState } from '../context/AuthContext';
import Button from '../components/Button';
import { motion } from 'motion/react';
import { pageCrossfadeVariants } from '../lib/motion';

// ⚠️ TEMPORARY MOCK AUTH — no real backend exists yet.
// This must be replaced with real authentication (Supabase, per the
// architecture doc's Phase 2 plan) before this app has any real users.
// Do not leave this in place past internal preview/testing.

export default function SignUpPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { setMockAuthed } = useMockAuthState();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    await new Promise((r) => setTimeout(r, 800));
    setMockAuthed(true); // session-only, in-memory, resets on refresh
    setStatus('success');
    setTimeout(() => navigate('/chat'), 600);
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageCrossfadeVariants}
      className="relative min-h-[calc(100svh-56px)] w-full bg-[var(--bg-base)] text-[var(--text-primary)] font-body flex items-center justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-md my-8">
        <div className="flex flex-col items-center text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group header-logo">
            <img src="/images/Logo.png" alt="Lyra" className="logo-badge-img shadow-sm group-hover:scale-105 transition-transform" />
            <span className="wordmark font-heading font-semibold text-2xl tracking-tight text-[var(--text-primary)]">Lyra</span>
          </Link>
          <h1 className="font-heading text-2xl sm:text-3xl font-medium tracking-tight text-[var(--text-primary)] mb-1">
            Sign Up
          </h1>
          <p className="text-[var(--text-muted)] text-xs sm:text-sm">
            Create your preview account to get started
          </p>
        </div>

        <div className="bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--text-muted)]/15 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--bg-base)]/70 border border-[var(--text-primary)]/[0.1] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--bg-base)]/70 border border-[var(--text-primary)]/[0.1] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-body"
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="w-full mt-2 cursor-pointer"
            >
              {status === 'loading' ? 'Creating account…' : status === 'success' ? 'Success!' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-[var(--text-primary)]/[0.08] text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--accent-primary)] font-medium hover:underline">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
