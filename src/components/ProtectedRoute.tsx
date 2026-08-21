import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, profile, isLoading, isConfigured, isGuestMode } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0A0A0D] flex flex-col items-center justify-center text-white">
        <div className="relative flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#4DE8D4]/10 border border-[#4DE8D4]/30 flex items-center justify-center text-[#4DE8D4] animate-pulse shadow-[0_0_25px_rgba(77,232,212,0.2)]">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <span className="text-xs font-mono tracking-widest uppercase text-gray-400">
            Validating Session...
          </span>
        </div>
      </div>
    );
  }

  // 1. If Supabase is configured: require real authenticated user
  if (isConfigured) {
    if (!user) {
      return <Navigate to="/auth" state={{ from: location }} replace />;
    }
    return <>{children}</>;
  }

  // 2. Fallback mode (Supabase not yet configured): check if user confirmed age/guest mode
  if (user || isGuestMode) {
    return <>{children}</>;
  }

  return <Navigate to="/auth" state={{ from: location }} replace />;
}
