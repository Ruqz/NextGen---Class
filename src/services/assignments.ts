import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/utils';
import {
  AssignmentItem,
  AssignmentSubmissionItem,
  AssignmentStatusType,
  SubmissionHistoryItem,
} from '../types';

const ASSIGNMENTS_COLLECTION = 'assignments';
const SUBMISSIONS_COLLECTION = 'assignmentSubmissions';

/**
 * Real-time listener for all assignments, optionally filtered by programme or cohort
 */
export const subscribeToAssignmentsList = (
  programmeId?: string,
  cohortId?: string,
  callback?: (assignments: AssignmentItem[]) => void
) => {
  return onSnapshot(
    collection(db, ASSIGNMENTS_COLLECTION),
    (snap) => {
      let list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AssignmentItem[];

      if (programmeId && programmeId !== 'ALL') {
        list = list.filter((a) => a.programmeId === programmeId);
      }
      if (cohortId && cohortId !== 'ALL') {
        list = list.filter((a) => !a.cohortId || a.cohortId === cohortId);
      }

      list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      if (callback) callback(list);
    },
    (err) => {
      console.warn('subscribeToAssignmentsList warning:', err.message);
      if (callback) callback([]);
    }
  );
};

/**
 * Real-time listener for submissions across all learners or filtered by assignment/learner
 */
export const subscribeToSubmissionsList = (
  assignmentId?: string,
  learnerId?: string,
  callback?: (submissions: AssignmentSubmissionItem[]) => void
) => {
  const colRef = collection(db, SUBMISSIONS_COLLECTION);
  let q = query(colRef);

  if (learnerId) {
    q = query(colRef, where('learnerId', '==', learnerId));
  } else if (assignmentId && assignmentId !== 'ALL') {
    q = query(colRef, where('assignmentId', '==', assignmentId));
  }

  return onSnapshot(
    q,
    (snap) => {
      let list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AssignmentSubmissionItem[];

      if (assignmentId && assignmentId !== 'ALL' && learnerId) {
        list = list.filter((s) => s.assignmentId === assignmentId);
      }

      if (callback) callback(list);
    },
    (err) => {
      console.warn('subscribeToSubmissionsList warning:', err.message);
      if (callback) callback([]);
    }
  );
};

/**
 * Create or update an assignment (PM or Facilitator)
 */
export const saveAssignment = async (
  assignmentData: Partial<AssignmentItem> & {
    title: string;
    programmeId: string;
    programmeName: string;
    dueDate: string;
    totalPoints: number;
    createdBy: string;
  }
): Promise<string> => {
  const now = new Date().toISOString();
  const docRef = assignmentData.id
    ? doc(db, ASSIGNMENTS_COLLECTION, assignmentData.id)
    : doc(collection(db, ASSIGNMENTS_COLLECTION));

  const payload: AssignmentItem = cleanFirestoreData({
    id: docRef.id,
    programmeId: assignmentData.programmeId,
    programmeName: assignmentData.programmeName,
    cohortId: assignmentData.cohortId || '',
    cohortName: assignmentData.cohortName || '',
    title: assignmentData.title,
    description: assignmentData.description || '',
    instructions: assignmentData.instructions || '',
    dueDate: assignmentData.dueDate,
    totalPoints: assignmentData.totalPoints || 100,
    moduleName: assignmentData.moduleName || 'Core Module',
    weekNumber: assignmentData.weekNumber || 1,
    allowResubmission: assignmentData.allowResubmission !== false,
    allowedFileTypes: assignmentData.allowedFileTypes || ['pdf', 'doc', 'docx', 'zip', 'png', 'jpg'],
    maxFileSizeBytes: assignmentData.maxFileSizeBytes || 10485760, // 10MB
    attachmentUrl: assignmentData.attachmentUrl || '',
    attachmentName: assignmentData.attachmentName || '',
    createdBy: assignmentData.createdBy,
    createdByName: assignmentData.createdByName || 'Facilitator',
    createdAt: assignmentData.createdAt || now,
    updatedAt: now,
  });

  await setDoc(docRef, payload as any, { merge: true });

  return docRef.id;
};

/**
 * Delete an assignment
 */
export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  await deleteDoc(doc(db, ASSIGNMENTS_COLLECTION, assignmentId));
};

/**
 * Submit or Resubmit an assignment (Learner)
 */
export const submitLearnerAssignment = async (params: {
  assignment: AssignmentItem;
  learnerId: string;
  userId: string;
  userName: string;
  userEmail: string;
  submissionText: string;
  submissionUrl?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  fileSizeBytes?: number;
}): Promise<void> => {
  const {
    assignment,
    learnerId,
    userId,
    userName,
    userEmail,
    submissionText,
    submissionUrl,
    attachmentName,
    attachmentUrl,
    fileSizeBytes,
  } = params;

  const now = new Date();
  const nowIso = now.toISOString();
  const dueDateTime = new Date(assignment.dueDate).getTime();
  const isLate = now.getTime() > dueDateTime;

  // Determine submission status
  const status: AssignmentStatusType = isLate ? 'LATE' : 'SUBMITTED';

  // Check if existing submission document exists
  const qExisting = query(
    collection(db, SUBMISSIONS_COLLECTION),
    where('assignmentId', '==', assignment.id),
    where('learnerId', '==', learnerId)
  );
  const snap = await getDocs(qExisting);

  if (!snap.empty) {
    const existingDoc = snap.docs[0];
    const existingData = existingDoc.data() as AssignmentSubmissionItem;

    const previousHistory: SubmissionHistoryItem[] = existingData.history || [];
    const newHistoryEntry: SubmissionHistoryItem = {
      submittedAt: existingData.submittedAt || nowIso,
      submissionText: existingData.submissionText || '',
      submissionUrl: existingData.submissionUrl || '',
      attachmentName: existingData.attachmentName || '',
      attachmentUrl: existingData.attachmentUrl || '',
    };

    const updatedHistory = [...previousHistory, newHistoryEntry];

    await updateDoc(
      doc(db, SUBMISSIONS_COLLECTION, existingDoc.id),
      cleanFirestoreData({
        submissionText,
        submissionUrl: submissionUrl || '',
        attachmentName: attachmentName || '',
        attachmentUrl: attachmentUrl || '',
        fileSizeBytes: fileSizeBytes || 0,
        submittedAt: nowIso,
        dueDateAtSubmission: assignment.dueDate,
        isLate,
        status: existingData.status === 'GRADED' && !isLate ? 'SUBMITTED' : status,
        resubmissionCount: (existingData.resubmissionCount || 0) + 1,
        history: updatedHistory,
        updatedAt: nowIso,
      })
    );
  } else {
    const docRef = doc(collection(db, SUBMISSIONS_COLLECTION));
    const newSubmission: AssignmentSubmissionItem = cleanFirestoreData({
      id: docRef.id,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      programmeId: assignment.programmeId,
      programmeName: assignment.programmeName,
      cohortId: assignment.cohortId || '',
      cohortName: assignment.cohortName || '',
      learnerId,
      userId,
      userEmail,
      userName,
      submissionText,
      submissionUrl: submissionUrl || '',
      attachmentName: attachmentName || '',
      attachmentUrl: attachmentUrl || '',
      fileSizeBytes: fileSizeBytes || 0,
      submittedAt: nowIso,
      dueDateAtSubmission: assignment.dueDate,
      isLate,
      status,
      maxScore: assignment.totalPoints,
      resubmissionCount: 0,
      history: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    await setDoc(docRef, newSubmission);
  }
};

/**
 * Grade assignment submission and return feedback (Facilitator / PM)
 */
export const gradeAssignmentSubmission = async (params: {
  submissionId: string;
  score: number;
  maxScore: number;
  feedback: string;
  gradedBy: string;
  gradedByName?: string;
}): Promise<void> => {
  const { submissionId, score, maxScore, feedback, gradedBy, gradedByName } = params;
  const now = new Date().toISOString();

  let gradeLabel = `${score} / ${maxScore}`;
  const pct = (score / maxScore) * 100;
  if (pct >= 90) gradeLabel += ' (A - Excellent)';
  else if (pct >= 80) gradeLabel += ' (B - Good)';
  else if (pct >= 70) gradeLabel += ' (C - Satisfactory)';
  else gradeLabel += ' (Needs Revision)';

  const updates = cleanFirestoreData({
    score,
    maxScore,
    grade: gradeLabel,
    feedback,
    status: 'GRADED' as AssignmentStatusType,
    gradedBy,
    gradedByName: gradedByName || 'Facilitator',
    gradedAt: now,
    updatedAt: now,
  });

  await updateDoc(doc(db, SUBMISSIONS_COLLECTION, submissionId), updates);
};

/**
 * Helper: Resolve Learner's computed submission status (SUBMITTED, LATE, GRADED, or MISSING)
 */
export const resolveLearnerAssignmentStatus = (
  assignment: AssignmentItem,
  submission?: AssignmentSubmissionItem
): { status: AssignmentStatusType; label: string; badgeColor: 'emerald' | 'amber' | 'rose' | 'blue' | 'slate' } => {
  const now = new Date().getTime();
  const due = new Date(assignment.dueDate).getTime();

  if (submission) {
    if (submission.status === 'GRADED') {
      return { status: 'GRADED', label: 'GRADED', badgeColor: 'emerald' };
    }
    if (submission.isLate || submission.status === 'LATE') {
      return { status: 'LATE', label: 'SUBMITTED LATE', badgeColor: 'amber' };
    }
    return { status: 'SUBMITTED', label: 'SUBMITTED', badgeColor: 'blue' };
  }

  if (now > due) {
    return { status: 'MISSING', label: 'MISSING / OVERDUE', badgeColor: 'rose' };
  }

  return { status: 'MISSING', label: 'NOT SUBMITTED', badgeColor: 'slate' };
};
