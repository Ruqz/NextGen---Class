import { UserProfile, AccountType, StaffRole, StaffProfile, Enrolment } from '../types';

export class AuthorizationError extends Error {
  code: string;
  constructor(message: string, code = 'UNAUTHORIZED') {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
  }
}

/**
 * 1. requireAuthentication()
 * Ensures a valid user identity exists.
 */
export function requireAuthentication(user: any): boolean {
  if (!user) {
    throw new AuthorizationError('Authentication required to access this resource.', 'AUTH_REQUIRED');
  }
  return true;
}

/**
 * 2. requireAccountType()
 * Verifies user accountType matches allowed list (e.g. APPLICANT, LEARNER, STAFF).
 * Also enforces that accountStatus is not SUSPENDED!
 */
export function requireAccountType(
  userProfile: UserProfile | null,
  allowedTypes: AccountType[]
): boolean {
  if (!userProfile) {
    throw new AuthorizationError('Authentication required.', 'AUTH_REQUIRED');
  }

  if (userProfile.accountStatus === 'SUSPENDED') {
    throw new AuthorizationError('Account suspended. Please contact platform administration.', 'ACCOUNT_SUSPENDED');
  }

  const currentType: AccountType = (userProfile.accountType as AccountType) || (
    userProfile.role === 'Applicant' ? 'APPLICANT' :
    userProfile.role === 'Learner' ? 'LEARNER' : 'STAFF'
  );

  if (!allowedTypes.includes(currentType)) {
    throw new AuthorizationError(
      `Access denied: Your account type (${currentType}) is not authorized to access this portal.`,
      'FORBIDDEN_ACCOUNT_TYPE'
    );
  }

  return true;
}

/**
 * 3. requireStaffRole()
 * Checks internal staff role (PROGRAMME_MANAGER, FACILITATOR, ME, ADMIN).
 */
export function requireStaffRole(
  staffProfile: StaffProfile | null,
  allowedRoles: StaffRole[]
): boolean {
  if (!staffProfile || !staffProfile.active) {
    throw new AuthorizationError('Active staff profile required for staff functions.', 'STAFF_PROFILE_REQUIRED');
  }

  if (!allowedRoles.includes(staffProfile.staffRole)) {
    throw new AuthorizationError(
      `Access denied: Staff role ${staffProfile.staffRole} does not have required permissions for this action.`,
      'FORBIDDEN_STAFF_ROLE'
    );
  }

  return true;
}

/**
 * 4. requireActiveEnrolment()
 * Ensures learner has an active enrolment in enrolments collection.
 */
export function requireActiveEnrolment(
  enrolments: Enrolment[],
  programmeId?: string
): boolean {
  if (!enrolments || enrolments.length === 0) {
    throw new AuthorizationError('No enrolment found for this user account.', 'ENROLMENT_NOT_FOUND');
  }

  const activeEnrolments = enrolments.filter((e) => e.status === 'ACTIVE');
  if (activeEnrolments.length === 0) {
    throw new AuthorizationError('No active enrolment found. Your enrolment may be suspended or completed.', 'ENROLMENT_INACTIVE');
  }

  if (programmeId) {
    const matching = activeEnrolments.find((e) => e.programmeId === programmeId);
    if (!matching) {
      throw new AuthorizationError(`No active enrolment found for programme ID: ${programmeId}`, 'PROGRAMME_ENROLMENT_NOT_FOUND');
    }
  }

  return true;
}

/**
 * 5. requireProgrammeAccess()
 * Validates that user/enrolment can access the requested programme data.
 */
export function requireProgrammeAccess(
  userProfile: UserProfile | null,
  enrolment: Enrolment | null,
  requestedProgrammeId: string
): boolean {
  if (!userProfile) {
    throw new AuthorizationError('Authentication required.', 'AUTH_REQUIRED');
  }

  const accountType: AccountType = (userProfile.accountType as AccountType) || (
    userProfile.role === 'Applicant' ? 'APPLICANT' :
    userProfile.role === 'Learner' ? 'LEARNER' : 'STAFF'
  );

  // Staff members can access any programme
  if (accountType === 'STAFF') {
    return true;
  }

  // Learners can only access their enrolled programme
  if (accountType === 'LEARNER') {
    if (!enrolment || enrolment.programmeId !== requestedProgrammeId) {
      throw new AuthorizationError('Learners can only access resources for their enrolled programme.', 'FORBIDDEN_PROGRAMME_ACCESS');
    }
    return true;
  }

  // Applicants cannot access learner programmes
  throw new AuthorizationError('Applicants do not have access to programme class data.', 'FORBIDDEN_PROGRAMME_ACCESS');
}
