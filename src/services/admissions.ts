import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/utils';
import {
  AssessmentInvitation,
  AdmissionDecision,
  AdmissionDecisionType,
  Application,
  AssessmentAttempt,
  UserRole,
} from '../types';
import { updateApplicationStatuses } from './applications';
import { updateUserRoleInFirestore } from './auth';
import { createEnrolmentForAcceptedApplicant } from './learners';
import {
  sendAssessmentInvitationNotification,
  sendAcceptanceNotification,
  sendRejectionNotification,
} from './notifications';

const INVITATIONS_COLLECTION = 'assessmentInvitations';
const ADMISSION_DECISIONS_COLLECTION = 'admissionDecisions';

/**
 * Generate a unique invitation token
 */
export const generateInvitationToken = (): string => {
  const timestampPart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${timestampPart}-${randomPart}`;
};

/**
 * Issue an assessment invitation to an applicant
 */
export const issueAssessmentInvitation = async (params: {
  application: Application;
  assessmentId: string;
  assessmentTitle: string;
  passThresholdPercentage?: number;
  invitedBy?: string;
  expiresInDays?: number;
}): Promise<AssessmentInvitation> => {
  const { application, assessmentId, assessmentTitle, passThresholdPercentage = 70, invitedBy = 'Programme Manager', expiresInDays = 7 } = params;

  const token = generateInvitationToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const invitation: Omit<AssessmentInvitation, 'id'> = cleanFirestoreData({
    token,
    applicationId: application.id,
    applicantId: application.applicantId,
    applicantName: application.applicantName,
    applicantEmail: application.applicantEmail,
    assessmentId,
    assessmentTitle,
    programmeId: application.programmeId,
    programmeName: application.programmeName,
    cohortId: application.cohortId,
    cohortName: application.cohortName,
    status: 'INVITED',
    passThresholdPercentage,
    invitedAt: now.toISOString(),
    expiresAt,
    invitedBy,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });

  const docRef = await addDoc(collection(db, INVITATIONS_COLLECTION), invitation);
  const createdInvitation: AssessmentInvitation = { id: docRef.id, ...invitation };

  // Update Application's assessmentStatus
  await updateApplicationStatuses(application.id, {
    assessmentStatus: 'IN_PROGRESS',
  });

  // Dispatch real notification
  await sendAssessmentInvitationNotification({
    name: application.applicantName,
    email: application.applicantEmail,
    phone: application.applicantPhone,
    programmeName: application.programmeName,
    cohortName: application.cohortName,
    assessmentTitle,
    durationMinutes: 45,
    passThreshold: passThresholdPercentage,
    deadline: expiresAt ? new Date(expiresAt).toLocaleDateString() : '7 Days',
    token,
  }).catch((e) => console.warn('Failed to send assessment invite email:', e));

  return createdInvitation;
};

/**
 * Issue assessment invitations in bulk
 */
export const bulkIssueAssessmentInvitations = async (params: {
  applications: Application[];
  assessmentId: string;
  assessmentTitle: string;
  passThresholdPercentage?: number;
  invitedBy?: string;
}): Promise<number> => {
  let count = 0;
  for (const app of params.applications) {
    try {
      await issueAssessmentInvitation({
        application: app,
        assessmentId: params.assessmentId,
        assessmentTitle: params.assessmentTitle,
        passThresholdPercentage: params.passThresholdPercentage,
        invitedBy: params.invitedBy,
      });
      count++;
    } catch (err) {
      console.error(`Error issuing invitation for application ${app.id}:`, err);
    }
  }
  return count;
};

/**
 * Get an invitation by unique access token
 */
export const getInvitationByToken = async (token: string): Promise<AssessmentInvitation | null> => {
  try {
    const q = query(
      collection(db, INVITATIONS_COLLECTION),
      where('token', '==', token)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as AssessmentInvitation;
    }
    return null;
  } catch (err) {
    console.error('Error fetching invitation by token:', err);
    return null;
  }
};

/**
 * Subscribe to all assessment invitations
 */
export const subscribeToAssessmentInvitations = (
  callback: (invitations: AssessmentInvitation[]) => void
) => {
  return onSnapshot(
    collection(db, INVITATIONS_COLLECTION),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AssessmentInvitation[];
      callback(list);
    },
    (err) => {
      console.warn('subscribeToAssessmentInvitations error:', err.message);
      callback([]);
    }
  );
};

/**
 * Record completed assessment attempt against invitation and update application statuses
 */
export const completeInvitationAttempt = async (
  invitationId: string,
  attempt: AssessmentAttempt
): Promise<void> => {
  const invRef = doc(db, INVITATIONS_COLLECTION, invitationId);
  const invSnap = await getDoc(invRef);

  if (!invSnap.exists()) {
    throw new Error('Invitation not found');
  }

  const invData = invSnap.data() as AssessmentInvitation;
  const threshold = invData.passThresholdPercentage || 70;
  const passed = attempt.percentage >= threshold;

  // Update invitation
  await updateDoc(invRef, cleanFirestoreData({
    status: 'COMPLETED',
    score: attempt.score,
    maxScore: attempt.maxScore,
    percentage: attempt.percentage,
    passed,
    attemptId: attempt.id,
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Update Application assessmentStatus
  const newAssessmentStatus = passed ? 'PASSED' : 'FAILED';
  await updateApplicationStatuses(invData.applicationId, {
    assessmentStatus: newAssessmentStatus,
  });
};

/**
 * Process admission decision (ACCEPT, REJECT, WAITLIST, MANUAL_REVIEW)
 * CRITICAL RULE: "Do not automatically create a learner account until the applicant is accepted."
 */
export const processAdmissionDecision = async (params: {
  application: Application;
  decision: AdmissionDecisionType;
  reviewNotes?: string;
  decisionBy?: string;
  assessmentScore?: number;
  assessmentPercentage?: number;
  assessmentPassed?: boolean;
  passThreshold?: number;
}): Promise<AdmissionDecision> => {
  const {
    application,
    decision,
    reviewNotes,
    decisionBy = 'Programme Manager',
    assessmentScore,
    assessmentPercentage,
    assessmentPassed,
    passThreshold,
  } = params;

  const now = new Date().toISOString();
  let learnerAccountCreated = false;
  let learnerAccountId: string | undefined = undefined;

  // RULE CHECK: Only create or upgrade learner account & enrolment IF decision is ACCEPTED
  // Note: Acceptance creates the Enrolment record & Learner ID, but platform access remains
  // pending until the Program Manager activates the account.
  if (decision === 'ACCEPTED') {
    try {
      const enrolment = await createEnrolmentForAcceptedApplicant(application, false);
      learnerAccountCreated = true;
      learnerAccountId = enrolment.learnerId;
    } catch (err) {
      console.error('Error executing learner enrolment on ACCEPTED decision:', err);
    }
  }

  // Record admission decision record in Firestore
  const decisionRecord: Omit<AdmissionDecision, 'id'> = cleanFirestoreData({
    applicationId: application.id,
    applicantId: application.applicantId,
    applicantName: application.applicantName,
    applicantEmail: application.applicantEmail,
    programmeId: application.programmeId,
    programmeName: application.programmeName,
    cohortId: application.cohortId,
    cohortName: application.cohortName,
    qualificationStatus: application.qualificationStatus || 'QUALIFIED',
    assessmentScore,
    assessmentPercentage,
    assessmentPassed,
    passThreshold,
    decision,
    decisionBy,
    decisionAt: now,
    reviewNotes,
    learnerAccountCreated,
    learnerAccountId,
    createdAt: now,
    updatedAt: now,
  });

  const docRef = await addDoc(collection(db, ADMISSION_DECISIONS_COLLECTION), decisionRecord);

  // Update Application admissionStatus
  let newAdmissionStatus: any = 'APPLIED';
  if (decision === 'ACCEPTED') newAdmissionStatus = 'ACCEPTED';
  if (decision === 'REJECTED') newAdmissionStatus = 'REJECTED';
  if (decision === 'WAITLISTED') newAdmissionStatus = 'WAITLISTED';
  if (decision === 'MANUAL_REVIEW') newAdmissionStatus = 'SHORTLISTED';

  await updateApplicationStatuses(application.id, {
    admissionStatus: newAdmissionStatus,
    reviewNotes: reviewNotes || application.reviewNotes,
  });

  // Dispatch notification to candidate
  if (decision === 'ACCEPTED') {
    await sendAcceptanceNotification({
      name: application.applicantName,
      email: application.applicantEmail,
      phone: application.applicantPhone,
      programmeName: application.programmeName,
      cohortName: application.cohortName,
      startDate: 'Upcoming Cohort Orientation',
    }).catch((e) => console.warn('Failed to send acceptance email:', e));
  } else if (decision === 'REJECTED') {
    await sendRejectionNotification({
      name: application.applicantName,
      email: application.applicantEmail,
      phone: application.applicantPhone,
      programmeName: application.programmeName,
      cohortName: application.cohortName,
    }).catch((e) => console.warn('Failed to send rejection email:', e));
  }

  return { id: docRef.id, ...decisionRecord };
};

/**
 * Bulk admission decision processing
 */
export const bulkProcessAdmissionDecisions = async (params: {
  applications: Application[];
  decision: AdmissionDecisionType;
  reviewNotes?: string;
  decisionBy?: string;
}): Promise<number> => {
  let count = 0;
  for (const app of params.applications) {
    try {
      await processAdmissionDecision({
        application: app,
        decision: params.decision,
        reviewNotes: params.reviewNotes || `Bulk ${params.decision.toLowerCase()} action`,
        decisionBy: params.decisionBy,
      });
      count++;
    } catch (err) {
      console.error(`Error processing bulk decision for application ${app.id}:`, err);
    }
  }
  return count;
};

/**
 * Subscribe to admission decision records
 */
export const subscribeToAdmissionDecisions = (
  callback: (decisions: AdmissionDecision[]) => void,
  applicantId?: string
) => {
  const colRef = collection(db, ADMISSION_DECISIONS_COLLECTION);
  const q = applicantId
    ? query(colRef, where('applicantId', '==', applicantId))
    : query(colRef);

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AdmissionDecision[];
      callback(list);
    },
    (err) => {
      console.warn('subscribeToAdmissionDecisions error:', err.message);
      callback([]);
    }
  );
};
