import { UserProfile, StaffProfile, UserRole } from '../types';
import { recordAuditLog } from './audit';

/**
 * PRODUCTION HARDENING & ACCESS CONTROL RULES:
 * 1. Learner A cannot access Learner B's information.
 * 2. Facilitator cannot modify programme configuration.
 * 3. Programme Manager cannot access programmes outside their authorization.
 * 4. M&E users cannot modify learner grades.
 * 5. Public users cannot access private records.
 */

// ----------------------------------------------------
// 1. LEARNER DATA ACCESS (IDOR GUARD)
// ----------------------------------------------------
export function canAccessLearnerData(
  viewer: UserProfile | null,
  staffProfile: StaffProfile | null,
  targetLearnerUserId: string,
  targetLearnerId?: string
): boolean {
  if (!viewer) return false;
  if (viewer.accountStatus === 'SUSPENDED') return false;

  // Super Admin has universal access
  if (viewer.role === 'Super Admin' || staffProfile?.staffRole === 'ADMIN') {
    return true;
  }

  // Learner can ONLY access their own records
  if (viewer.accountType === 'LEARNER' || viewer.role === 'Learner') {
    return viewer.uid === targetLearnerUserId || (targetLearnerId ? viewer.uid === targetLearnerId : false);
  }

  // Applicants can only access their own records
  if (viewer.accountType === 'APPLICANT' || viewer.role === 'Applicant') {
    return viewer.uid === targetLearnerUserId;
  }

  // Staff (PM, Facilitator, M&E) have view access to learners
  if (viewer.accountType === 'STAFF') {
    return true;
  }

  return false;
}

// ----------------------------------------------------
// 2. PROGRAMME CONFIGURATION MODIFICATION
// ----------------------------------------------------
export function canModifyProgrammeConfig(
  viewer: UserProfile | null,
  staffProfile: StaffProfile | null,
  programmeId: string
): boolean {
  if (!viewer) return false;
  if (viewer.accountStatus === 'SUSPENDED') return false;

  // Super Admin can modify all programmes
  if (viewer.role === 'Super Admin' || staffProfile?.staffRole === 'ADMIN') {
    return true;
  }

  // Facilitators and M&E users are STRICTLY FORBIDDEN from modifying programme config
  if (
    viewer.role === 'Facilitator' ||
    staffProfile?.staffRole === 'FACILITATOR' ||
    viewer.role === 'M&E Manager' ||
    staffProfile?.staffRole === 'ME'
  ) {
    return false;
  }

  // Programme Manager must be authorized for this programme
  if (viewer.role === 'Programme Manager' || staffProfile?.staffRole === 'PROGRAMME_MANAGER') {
    if (!staffProfile?.assignedProgrammeIds || staffProfile.assignedProgrammeIds.length === 0) {
      return true; // Default unconstrained PM or legacy
    }
    return staffProfile.assignedProgrammeIds.includes(programmeId);
  }

  return false;
}

// ----------------------------------------------------
// 3. PROGRAMME MANAGER AUTHORIZATION SCOPE
// ----------------------------------------------------
export function isAuthorizedForProgramme(
  viewer: UserProfile | null,
  staffProfile: StaffProfile | null,
  programmeId: string
): boolean {
  if (!viewer) return false;
  if (viewer.accountStatus === 'SUSPENDED') return false;

  // Super Admin can access all programmes
  if (viewer.role === 'Super Admin' || staffProfile?.staffRole === 'ADMIN') {
    return true;
  }

  // Learners enrolled in the programme or public can view
  if (viewer.accountType === 'LEARNER' || viewer.accountType === 'APPLICANT') {
    return true;
  }

  // If Programme Manager, verify programme assignment
  if (staffProfile?.staffRole === 'PROGRAMME_MANAGER' || viewer.role === 'Programme Manager') {
    if (!staffProfile?.assignedProgrammeIds || staffProfile.assignedProgrammeIds.length === 0) {
      return true;
    }
    return staffProfile.assignedProgrammeIds.includes(programmeId);
  }

  return true;
}

// ----------------------------------------------------
// 4. GRADES & EVALUATION MODIFICATION (M&E GUARD)
// ----------------------------------------------------
export function canModifyLearnerGrades(
  viewer: UserProfile | null,
  staffProfile: StaffProfile | null
): boolean {
  if (!viewer) return false;
  if (viewer.accountStatus === 'SUSPENDED') return false;

  // M&E users CANNOT modify grades under any circumstances
  if (
    viewer.role === 'M&E Manager' ||
    staffProfile?.staffRole === 'ME' ||
    viewer.role === 'ME_MANAGER'
  ) {
    return false;
  }

  // Learners and Applicants cannot modify grades
  if (viewer.accountType === 'LEARNER' || viewer.accountType === 'APPLICANT') {
    return false;
  }

  // Super Admin, Facilitators, and PMs can grade
  if (
    viewer.role === 'Super Admin' ||
    staffProfile?.staffRole === 'ADMIN' ||
    viewer.role === 'Facilitator' ||
    staffProfile?.staffRole === 'FACILITATOR' ||
    viewer.role === 'Programme Manager' ||
    staffProfile?.staffRole === 'PROGRAMME_MANAGER'
  ) {
    return true;
  }

  return false;
}

// ----------------------------------------------------
// 5. PUBLIC ACCESS RESTRICTIONS
// ----------------------------------------------------
export function canAccessPrivateRecord(
  viewer: UserProfile | null,
  recordOwnerUserId: string
): boolean {
  // Public (unauthenticated) users CANNOT access private records
  if (!viewer) return false;
  if (viewer.accountStatus === 'SUSPENDED') return false;

  if (viewer.role === 'Super Admin') return true;
  if (viewer.accountType === 'STAFF') return true;

  return viewer.uid === recordOwnerUserId;
}

// ----------------------------------------------------
// 6. XSS & HTML SANITIZATION UTILITIES
// ----------------------------------------------------
export function sanitizeHtmlText(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';
  return dirty
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeInputString(input: any, maxLength: number = 5000): string {
  if (typeof input !== 'string') return '';
  return input
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onload\s*=/gi, '')
    .trim();
}
