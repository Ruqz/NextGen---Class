import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, AccountType, StaffRole } from '../types';
import { Spinner } from '../components/ui/Spinner';
import { Unauthorized } from '../pages/Unauthorized';
import {
  requireAuthentication,
  requireAccountType,
  requireStaffRole,
  requireActiveEnrolment,
  AuthorizationError,
} from '../lib/authorization';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedAccountTypes?: AccountType[];
  allowedStaffRoles?: StaffRole[];
  requireEnrolment?: boolean;
  allowedRoles?: UserRole[]; // Backward compatibility
  onNavigate: (path: string) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedAccountTypes,
  allowedStaffRoles,
  requireEnrolment,
  allowedRoles,
  onNavigate,
}) => {
  const {
    currentUser,
    userProfile,
    staffProfile,
    enrolments,
    activeRole,
    accountType,
    accountStatus,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Spinner size="lg" label="Validating authorization & Firebase session..." />
      </div>
    );
  }

  // Check authentication
  if (!userProfile && !currentUser) {
    return <Unauthorized onNavigate={onNavigate} customMessage="Authentication required. Please sign in to access this portal." />;
  }

  // Check account suspension
  if (accountStatus === 'SUSPENDED' || userProfile?.accountStatus === 'SUSPENDED') {
    return (
      <Unauthorized
        onNavigate={onNavigate}
        customMessage="ACCOUNT SUSPENDED: Your account access has been suspended by platform administration. Access to protected portals is denied."
      />
    );
  }

  // Validate authorization using reusable authorization functions
  try {
    // 1. Account type requirement
    if (allowedAccountTypes && allowedAccountTypes.length > 0) {
      requireAccountType(userProfile, allowedAccountTypes);
    }

    // 2. Staff role requirement
    if (allowedStaffRoles && allowedStaffRoles.length > 0) {
      requireStaffRole(staffProfile, allowedStaffRoles);
    }

    // 3. Active enrolment requirement
    if (requireEnrolment) {
      requireActiveEnrolment(enrolments);
    }

    // 4. Legacy role array fallback
    if (allowedRoles && allowedRoles.length > 0) {
      const allowedTypes: AccountType[] = allowedRoles.map((r) => {
        if (r === 'Applicant' || r === 'APPLICANT') return 'APPLICANT';
        if (r === 'Learner' || r === 'LEARNER') return 'LEARNER';
        return 'STAFF';
      });

      if (!allowedRoles.includes(activeRole) && !allowedTypes.includes(accountType)) {
        return <Unauthorized onNavigate={onNavigate} />;
      }
    }
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return <Unauthorized onNavigate={onNavigate} customMessage={err.message} />;
    }
    return <Unauthorized onNavigate={onNavigate} />;
  }

  return <>{children}</>;
};

