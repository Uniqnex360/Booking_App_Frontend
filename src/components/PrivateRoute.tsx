import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullScreenLoader } from '@/components/common/Loader';
import { UserRole } from '@/types/user.types';

export const ADMIN_ROLES: (UserRole | string)[] = [
  'ADMIN',
  'SUPER_ADMIN',
  'FINANCE_ADMIN',
  'OPERATIONS_ADMIN',
  'SUPPORT_ADMIN',
];

export const THEATRE_ROLES: (UserRole | string)[] = [
  'THEATRE_PARTNER',
  'ADMIN',
  'SUPER_ADMIN',
];

export const PARTNER_ROLES: (UserRole | string)[] = [
  'PARTNER',
  'ADMIN',
  'SUPER_ADMIN',
];

interface Props {
  children: ReactNode;
  guest?: boolean;
  allowedRoles?: (UserRole | string)[];
  redirectTo?: string;
}

export function PrivateRoute({
  children,
  guest = false,
  allowedRoles,
  redirectTo = '/login',
}: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;

  if (guest && user) return <Navigate to="/" replace />;
  if (!guest && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}