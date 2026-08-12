import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Spinner } from '../components/ui/Spinner';
import { Unauthorized } from '../pages/Unauthorized';
import { AuthPage } from '../pages/AuthPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  onNavigate: (path: string) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  onNavigate,
}) => {
  const { currentUser, activeRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Spinner size="lg" label="Validating permissions & Firebase session..." />
      </div>
    );
  }

  // If role requirement exists, check activeRole
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(activeRole)) {
      return <Unauthorized onNavigate={onNavigate} />;
    }
  }

  return <>{children}</>;
};
