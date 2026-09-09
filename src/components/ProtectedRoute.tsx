import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Sparkles } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthed, loading, isGuestMode } = useAuth();
  const location = useLocation();

  if (loading) {
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

  if (!isAuthed && !isGuestMode) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
