import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SplashScreen } from './AppSplash';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthed, loading, isGuestMode } = useAuth();
  const location = useLocation();

  if (loading) {
    return <SplashScreen />;
  }

  if (!isAuthed && !isGuestMode) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
