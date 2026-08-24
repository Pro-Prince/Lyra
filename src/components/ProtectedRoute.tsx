import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, isConfigured, isGuestMode } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg-base)] flex flex-col items-center justify-center text-[var(--text-primary)]">
        <div className="relative flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 flex items-center justify-center text-[var(--accent-primary)] animate-pulse ">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <span className="text-xs font-mono tracking-widest uppercase text-[var(--text-muted)]">
            Validating Session...
          </span>
        </div>
      </div>
    );
  }

  // 1. If Supabase is configured: require real authenticated user
  if (isConfigured) {
    if (!user) {
      return <Navigate to="/" state={{ from: location }} replace />;
    }
    return <>{children}</>;
  }

  // 2. Fallback mode (Supabase not yet configured): check if user confirmed age/guest mode
  if (user || isGuestMode) {
    return <>{children}</>;
  }

  return <Navigate to="/" state={{ from: location }} replace />;
}
