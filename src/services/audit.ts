import { collection, addDoc, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/utils';
import { UserProfile, StaffProfile, UserRole } from '../types';

export type AuditActionType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_ROLE_SWITCH'
  | 'USER_SUSPENDED'
  | 'USER_ACTIVATED'
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_STATUS_UPDATED'
  | 'ADMISSION_DECISION_ISSUED'
  | 'ENROLMENT_CREATED'
  | 'PROGRAMME_CREATED'
  | 'PROGRAMME_UPDATED'
  | 'PROGRAMME_CONFIG_UPDATED'
  | 'COHORT_CREATED'
  | 'COHORT_UPDATED'
  | 'GRADE_RECORDED'
  | 'GRADE_OVERRIDDEN'
  | 'ASSESSMENT_SUBMITTED'
  | 'ASSIGNMENT_GRADED'
  | 'PROJECT_EVALUATED'
  | 'CERTIFICATE_ISSUED'
  | 'CERTIFICATE_REVOKED'
  | 'FILE_UPLOADED'
  | 'FILE_DELETED'
  | 'SECURITY_VIOLATION_BLOCKED'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT';

export interface AuditLogEntry {
  id?: string;
  action: AuditActionType;
  actorId: string;
  actorEmail: string;
  actorRole: UserRole | string;
  targetType: 'USER' | 'LEARNER' | 'APPLICATION' | 'PROGRAMME' | 'COHORT' | 'GRADE' | 'CERTIFICATE' | 'FILE' | 'SECURITY';
  targetId: string;
  programmeId?: string;
  cohortId?: string;
  details?: Record<string, any>;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

const AUDIT_LOGS_COLLECTION = 'auditLogs';

/**
 * Immutable Audit Logger for Security & Compliance
 */
export const recordAuditLog = async (
  entry: Omit<AuditLogEntry, 'timestamp'>
): Promise<string> => {
  const timestamp = new Date().toISOString();
  const logData: AuditLogEntry = cleanFirestoreData({
    ...entry,
    timestamp,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
  });

  try {
    const docRef = await addDoc(collection(db, AUDIT_LOGS_COLLECTION), logData);
    return docRef.id;
  } catch (error: any) {
    console.warn('[AuditLogger] Fallback log record:', entry.action, entry.targetId, error?.message);
    return `local_${Date.now()}`;
  }
};

/**
 * Retrieve recent audit logs for Super Admin / Compliance officers
 */
export const getRecentAuditLogs = async (maxCount: number = 50): Promise<AuditLogEntry[]> => {
  try {
    const q = query(
      collection(db, AUDIT_LOGS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(maxCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as AuditLogEntry[];
  } catch (err: any) {
    console.warn('[AuditLogger] Could not query audit logs:', err?.message);
    return [];
  }
};
