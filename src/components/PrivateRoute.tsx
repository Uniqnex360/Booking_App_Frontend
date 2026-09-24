import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullScreenLoader } from '@/components/common/Loader';

interface Props {
  children: ReactNode;
  guest?: boolean;   
}

export function PrivateRoute({ children, guest = false }: Props) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (guest && user) return <Navigate to="/" replace />;
  if (!guest && !user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}