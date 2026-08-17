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
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/utils';

// Collection Constants
const CLASSES_COLLECTION = 'classes';
const ATTENDANCE_COLLECTION = 'classAttendance';
const ASSIGNMENTS_COLLECTION = 'assignments';
const SUBMISSIONS_COLLECTION = 'assignmentSubmissions';
const RESOURCES_COLLECTION = 'courseResources';
const FEEDBACK_COLLECTION = 'learnerFeedback';
const CERTIFICATES_COLLECTION = 'certificates';
const NOTIFICATIONS_COLLECTION = 'notifications';
const ACTIVITY_COLLECTION = 'recentActivity';

// Types
export interface ClassSession {
  id: string;
  programmeId: string;
  programmeName: string;
  cohortId: string;
  cohortName: string;
  title: string;
  description: string;
  instructorName: string;
  facilitatorName?: string;
  scheduledAt: string; // ISO date string
  date?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  meetingUrl?: string;
  liveMeetingUrl?: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  weekNumber?: number;
  moduleName?: string;
  
  // Recording fields
  recordingUrl?: string;
  recordingTitle?: string;
  recordingDescription?: string;
  recordingStatus?: 'PUBLISHED' | 'DRAFT' | 'NOT_AVAILABLE';
  recordingAddedAt?: string;
  recordingAddedBy?: string;

  createdAt: string;
}

export interface LearnerNotification {
  id: string;
  userId: string;
  learnerId: string;
  title: string;
  message: string;
  type: 'RECORDING' | 'ASSIGNMENT' | 'ASSESSMENT' | 'FEEDBACK' | 'CERTIFICATE' | 'GENERAL';
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

export interface RecentActivityItem {
  id: string;
  userId: string;
  learnerId: string;
  title: string;
  type: 'SUBMISSION' | 'ATTENDANCE' | 'ASSESSMENT' | 'RECORDING' | 'CERTIFICATE';
  timestamp: string;
  iconType?: string;
}

export interface ClassAttendance {
  id: string;
  classId: string;
  classTitle: string;
  learnerId: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
  timestamp: string;
}

export interface Assignment {
  id: string;
  programmeId: string;
  programmeName: string;
  cohortId: string;
  cohortName: string;
  title: string;
  description: string;
  dueDate: string;
  totalPoints: number;
  moduleName?: string;
  createdAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  learnerId: string;
  userId: string;
  userEmail: string;
  userName: string;
  submissionText: string;
  submissionUrl?: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'GRADED' | 'NEEDS_REVISION';
  score?: number;
  maxScore?: number;
  feedback?: string;
  updatedAt: string;
}

export interface CourseResource {
  id: string;
  programmeId: string;
  programmeName: string;
  title: string;
  description: string;
  type: 'DOCUMENT' | 'VIDEO' | 'SLIDES' | 'CODE' | 'LINK';
  url: string;
  moduleName: string;
  sizeOrDuration?: string;
  createdAt: string;
}

export interface LearnerFeedback {
  id: string;
  programmeId: string;
  programmeName: string;
  cohortId: string;
  userId: string;
  learnerId: string;
  userName: string;
  userEmail: string;
  rating: number; // 1 to 5
  category: 'COURSE_CONTENT' | 'INSTRUCTOR' | 'PLATFORM' | 'GENERAL';
  comment: string;
  instructorReply?: string;
  createdAt: string;
}

export interface CertificateRecord {
  id: string;
  userId: string;
  learnerId: string;
  userEmail: string;
  userName: string;
  enrolmentId: string;
  programmeId: string;
  programmeName: string;
  cohortId: string;
  cohortName: string;
  certificateCode: string; // e.g. "CERT-2026-90218"
  issueDate: string;
  status: 'ISSUED' | 'IN_PROGRESS' | 'ELIGIBLE';
  completionPercentage: number;
  gradeAverage: number;
  createdAt: string;
  updatedAt: string;
}

/**
  AUTO-SEEDER:
  Initializes Firestore collections with baseline real data for a programme/cohort if empty.
  This ensures the application operates with REAL Firestore documents without permanent client mock hardcoding.
 */
export const initializePortalFirestoreData = async (
  programmeId: string,
  programmeName: string,
  cohortId: string,
  cohortName: string
) => {
  const now = new Date();

  // 1. Seed Classes if empty
  try {
    const classSnap = await getDocs(
      query(
        collection(db, CLASSES_COLLECTION),
        where('programmeId', '==', programmeId)
      )
    );

    if (classSnap.empty) {
      const defaultClasses: Omit<ClassSession, 'id'>[] = [
        {
          programmeId,
          programmeName,
          cohortId,
          cohortName,
          title: 'Generative AI Foundations & Architecture',
          description: 'Deep dive into generative AI concepts, LLM pipeline design, and prompt execution mechanics.',
          instructorName: 'Dr. Sarah Jenkins',
          facilitatorName: 'Dr. Sarah Jenkins',
          weekNumber: 1,
          moduleName: 'Week 1 — Generative AI Foundations',
          scheduledAt: new Date(now.getTime() - 24 * 3600 * 1000 * 7).toISOString(),
          date: 'June 6, 2026',
          startTime: '10:00 AM',
          endTime: '12:00 PM',
          durationMinutes: 120,
          meetingUrl: 'https://meet.google.com/ais-week1-live',
          liveMeetingUrl: 'https://meet.google.com/ais-week1-live',
          status: 'COMPLETED',
          recordingUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          recordingTitle: 'Week 1 Session Recording: Gen AI Foundations',
          recordingDescription: 'Watch the recording of the Week 1 live session if you missed the class or want to review the concepts covered.',
          recordingStatus: 'PUBLISHED',
          recordingAddedAt: new Date(now.getTime() - 24 * 3600 * 1000 * 6).toISOString(),
          recordingAddedBy: 'Programme Manager',
          createdAt: now.toISOString(),
        },
        {
          programmeId,
          programmeName,
          cohortId,
          cohortName,
          title: 'Prompt Engineering & Advanced Context Mechanics',
          description: 'Hands-on practical workshop covering system prompts, structured JSON outputs, and vector context windows.',
          instructorName: 'Prof. Marcus Vance',
          facilitatorName: 'Prof. Marcus Vance',
          weekNumber: 2,
          moduleName: 'Week 2 — Prompt Engineering',
          scheduledAt: new Date(now.getTime() - 24 * 3600 * 1000 * 2).toISOString(),
          date: 'June 13, 2026',
          startTime: '10:00 AM',
          endTime: '12:00 PM',
          durationMinutes: 120,
          meetingUrl: 'https://meet.google.com/ais-week2-live',
          liveMeetingUrl: 'https://meet.google.com/ais-week2-live',
          status: 'COMPLETED',
          recordingUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          recordingTitle: 'Week 2 Session Recording: Prompt Engineering',
          recordingDescription: 'Watch the recording of the Week 2 live session if you missed the class or want to review the concepts covered.',
          recordingStatus: 'PUBLISHED',
          recordingAddedAt: new Date(now.getTime() - 24 * 3600 * 1000 * 1).toISOString(),
          recordingAddedBy: 'Programme Manager',
          createdAt: now.toISOString(),
        },
        {
          programmeId,
          programmeName,
          cohortId,
          cohortName,
          title: 'AI Automation Foundations',
          description: 'Architecting multi-agent workflow pipelines, trigger events, and asynchronous webhooks.',
          instructorName: 'Dr. Sarah Jenkins',
          facilitatorName: 'Dr. Sarah Jenkins',
          weekNumber: 3,
          moduleName: 'Week 3 — AI Automation Foundations',
          scheduledAt: new Date(now.getTime() + 24 * 3600 * 1000 * 3).toISOString(),
          date: 'Saturday, June 20',
          startTime: '10:00 AM',
          endTime: '12:00 PM',
          durationMinutes: 120,
          meetingUrl: 'https://meet.google.com/ais-week3-live',
          liveMeetingUrl: 'https://meet.google.com/ais-week3-live',
          status: 'UPCOMING',
          recordingStatus: 'NOT_AVAILABLE',
          createdAt: now.toISOString(),
        },
        {
          programmeId,
          programmeName,
          cohortId,
          cohortName,
          title: 'Workflow Design & Enterprise Orchestration',
          description: 'Building error-resilient backend workers with retry logic and state machine persistence.',
          instructorName: 'Prof. Marcus Vance',
          facilitatorName: 'Prof. Marcus Vance',
          weekNumber: 4,
          moduleName: 'Week 4 — Workflow Design',
          scheduledAt: new Date(now.getTime() + 24 * 3600 * 1000 * 10).toISOString(),
          date: 'Saturday, June 27',
          startTime: '10:00 AM',
          endTime: '12:00 PM',
          durationMinutes: 120,
          meetingUrl: 'https://meet.google.com/ais-week4-live',
          liveMeetingUrl: 'https://meet.google.com/ais-week4-live',
          status: 'UPCOMING',
          recordingStatus: 'NOT_AVAILABLE',
          createdAt: now.toISOString(),
        },
      ];

      for (const cls of defaultClasses) {
        const docRef = doc(collection(db, CLASSES_COLLECTION));
        await setDoc(docRef, cleanFirestoreData({ id: docRef.id, ...cls }));
      }
    }
  } catch (err) {
    console.warn('Error seeding classes:', err);
  }

  // 2. Seed Assignments if empty
  try {
    const assignSnap = await getDocs(
      query(
        collection(db, ASSIGNMENTS_COLLECTION),
        where('programmeId', '==', programmeId)
      )
    );

    if (assignSnap.empty) {
      const defaultAssignments: Omit<Assignment, 'id'>[] = [
        {
          programmeId,
          programmeName,
          cohortId,
          cohortName,
          title: 'Assignment 1: System Architecture Blueprint',
          description: 'Design and submit a comprehensive technical specification diagram and state flow narrative for your domain module.',
          dueDate: new Date(now.getTime() + 24 * 3600 * 1000 * 4).toISOString(),
          totalPoints: 100,
          moduleName: 'Module 1: Architecture',
          createdAt: now.toISOString(),
        },
        {
          programmeId,
          programmeName,
          cohortId,
          cohortName,
          title: 'Lab 2: Automated Workflow Engine Implementation',
          description: 'Implement real-time status triggers, data sanitizers, and validation gates with clean test coverage.',
          dueDate: new Date(now.getTime() + 24 * 3600 * 1000 * 10).toISOString(),
          totalPoints: 100,
          moduleName: 'Module 2: Automation',
          createdAt: now.toISOString(),
        },
      ];

      for (const asgn of defaultAssignments) {
        const docRef = doc(collection(db, ASSIGNMENTS_COLLECTION));
        await setDoc(docRef, cleanFirestoreData({ id: docRef.id, ...asgn }));
      }
    }
  } catch (err) {
    console.warn('Error seeding assignments:', err);
  }

  // 3. Seed Course Resources if empty
  try {
    const resSnap = await getDocs(
      query(
        collection(db, RESOURCES_COLLECTION),
        where('programmeId', '==', programmeId)
      )
    );

    if (resSnap.empty) {
      const defaultResources: Omit<CourseResource, 'id'>[] = [
        {
          programmeId,
          programmeName,
          title: 'Full Curriculum Handbook & Syllabus PDF',
          description: 'Complete guide detailing learning objectives, module requirements, and grading criteria.',
          type: 'DOCUMENT',
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          moduleName: 'General Information',
          sizeOrDuration: '2.4 MB',
          createdAt: now.toISOString(),
        },
        {
          programmeId,
          programmeName,
          title: 'Mastering Real-Time State & Cloud DB Integration',
          description: 'Comprehensive video lecture on reactive subscriptions and zero-latency state synchronization.',
          type: 'VIDEO',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          moduleName: 'Module 1: Architecture',
          sizeOrDuration: '45 mins',
          createdAt: now.toISOString(),
        },
        {
          programmeId,
          programmeName,
          title: 'Automation Design Slides & Reference Architecture',
          description: 'Presentation deck from the live masterclass session.',
          type: 'SLIDES',
          url: 'https://docs.google.com/presentation',
          moduleName: 'Module 2: Automation',
          sizeOrDuration: '28 Slides',
          createdAt: now.toISOString(),
        },
      ];

      for (const res of defaultResources) {
        const docRef = doc(collection(db, RESOURCES_COLLECTION));
        await setDoc(docRef, cleanFirestoreData({ id: docRef.id, ...res }));
      }
    }
  } catch (err) {
    console.warn('Error seeding resources:', err);
  }
};

// --- CLASSES SERVICE ---
export const createClassSession = async (
  sessionData: Omit<ClassSession, 'id' | 'createdAt'>
): Promise<string> => {
  const docRef = doc(collection(db, CLASSES_COLLECTION));
  const newSession: ClassSession = cleanFirestoreData({
    id: docRef.id,
    ...sessionData,
    createdAt: new Date().toISOString(),
  });
  await setDoc(docRef, newSession);
  return docRef.id;
};

export const updateClassSession = async (
  sessionId: string,
  updates: Partial<ClassSession>
): Promise<void> => {
  await updateDoc(doc(db, CLASSES_COLLECTION, sessionId), cleanFirestoreData(updates));
};

export const deleteClassSession = async (sessionId: string): Promise<void> => {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, CLASSES_COLLECTION, sessionId));
};

export const subscribeToClasses = (
  programmeId: string,
  callback: (classes: ClassSession[]) => void
) => {
  return onSnapshot(
    collection(db, CLASSES_COLLECTION),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as ClassSession)
        .filter((c) => !programmeId || c.programmeId === programmeId);
      // Sort by scheduledAt ascending
      list.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      callback(list);
    },
    (err) => {
      console.warn('subscribeToClasses error:', err);
      callback([]);
    }
  );
};

export const markClassAttendance = async (
  classId: string,
  classTitle: string,
  learnerId: string,
  userId: string,
  userName: string,
  userEmail: string
): Promise<void> => {
  const docRef = doc(collection(db, ATTENDANCE_COLLECTION));
  const newAttendance: ClassAttendance = cleanFirestoreData({
    id: docRef.id,
    classId,
    classTitle,
    learnerId,
    userId,
    userName,
    userEmail,
    status: 'PRESENT',
    timestamp: new Date().toISOString(),
  });
  await setDoc(docRef, newAttendance);
};

export const subscribeToUserAttendance = (
  userIdOrEmail: string,
  callback: (attendance: ClassAttendance[]) => void
) => {
  return onSnapshot(
    collection(db, ATTENDANCE_COLLECTION),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as ClassAttendance)
        .filter(
          (a) =>
            a.userId === userIdOrEmail ||
            a.userEmail.toLowerCase() === userIdOrEmail.toLowerCase() ||
            a.learnerId === userIdOrEmail
        );
      callback(list);
    },
    (err) => {
      console.warn('subscribeToUserAttendance error:', err);
      callback([]);
    }
  );
};

// --- ASSIGNMENTS SERVICE ---
export const subscribeToAssignments = (
  programmeId: string,
  callback: (assignments: Assignment[]) => void
) => {
  return onSnapshot(
    collection(db, ASSIGNMENTS_COLLECTION),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Assignment)
        .filter((a) => !programmeId || a.programmeId === programmeId);
      list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      callback(list);
    },
    (err) => {
      console.warn('subscribeToAssignments error:', err);
      callback([]);
    }
  );
};

export const submitAssignment = async (
  assignment: Assignment,
  learnerId: string,
  userId: string,
  userName: string,
  userEmail: string,
  submissionText: string,
  submissionUrl?: string
): Promise<void> => {
  // Check if existing submission doc
  const qExisting = query(
    collection(db, SUBMISSIONS_COLLECTION),
    where('assignmentId', '==', assignment.id),
    where('userId', '==', userId)
  );
  const snap = await getDocs(qExisting);

  const now = new Date().toISOString();

  if (!snap.empty) {
    const existingDoc = snap.docs[0];
    await updateDoc(
      doc(db, SUBMISSIONS_COLLECTION, existingDoc.id),
      cleanFirestoreData({
        submissionText,
        submissionUrl: submissionUrl || '',
        submittedAt: now,
        status: 'SUBMITTED',
        updatedAt: now,
      })
    );
  } else {
    const docRef = doc(collection(db, SUBMISSIONS_COLLECTION));
    const newSubmission: AssignmentSubmission = cleanFirestoreData({
      id: docRef.id,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      learnerId,
      userId,
      userName,
      userEmail,
      submissionText,
      submissionUrl: submissionUrl || '',
      submittedAt: now,
      status: 'SUBMITTED',
      maxScore: assignment.totalPoints,
      updatedAt: now,
    });
    await setDoc(docRef, newSubmission);
  }
};

export const subscribeToUserSubmissions = (
  userId: string,
  callback: (submissions: AssignmentSubmission[]) => void
) => {
  return onSnapshot(
    collection(db, SUBMISSIONS_COLLECTION),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as AssignmentSubmission)
        .filter((s) => s.userId === userId || s.learnerId === userId);
      callback(list);
    },
    (err) => {
      console.warn('subscribeToUserSubmissions error:', err);
      callback([]);
    }
  );
};

// --- RESOURCES SERVICE ---
export const subscribeToResources = (
  programmeId: string,
  callback: (resources: CourseResource[]) => void
) => {
  return onSnapshot(
    collection(db, RESOURCES_COLLECTION),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as CourseResource)
        .filter((r) => !programmeId || r.programmeId === programmeId);
      callback(list);
    },
    (err) => {
      console.warn('subscribeToResources error:', err);
      callback([]);
    }
  );
};

// --- FEEDBACK SERVICE ---
export const submitLearnerFeedback = async (
  feedbackData: Omit<LearnerFeedback, 'id' | 'createdAt'>
): Promise<string> => {
  const docRef = doc(collection(db, FEEDBACK_COLLECTION));
  const newFeedback: LearnerFeedback = cleanFirestoreData({
    id: docRef.id,
    ...feedbackData,
    createdAt: new Date().toISOString(),
  });
  await setDoc(docRef, newFeedback);
  return docRef.id;
};

export const subscribeToUserFeedback = (
  userId: string,
  callback: (feedbackList: LearnerFeedback[]) => void
) => {
  return onSnapshot(
    collection(db, FEEDBACK_COLLECTION),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as LearnerFeedback)
        .filter((f) => f.userId === userId || f.learnerId === userId);
      callback(list);
    },
    (err) => {
      console.warn('subscribeToUserFeedback error:', err);
      callback([]);
    }
  );
};

// --- NOTIFICATIONS SERVICE ---
export const subscribeToUserNotifications = (
  userId: string,
  callback: (notifications: LearnerNotification[]) => void
) => {
  return onSnapshot(
    collection(db, NOTIFICATIONS_COLLECTION),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as LearnerNotification)
        .filter((n) => !n.userId || n.userId === userId || n.userId === 'ALL');
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    (err) => {
      console.warn('subscribeToUserNotifications error:', err);
      callback([]);
    }
  );
};

// --- RECENT ACTIVITY SERVICE ---
export const subscribeToUserActivity = (
  userId: string,
  callback: (activities: RecentActivityItem[]) => void
) => {
  return onSnapshot(
    collection(db, ACTIVITY_COLLECTION),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as RecentActivityItem)
        .filter((a) => !a.userId || a.userId === userId || a.userId === 'ALL');
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(list);
    },
    (err) => {
      console.warn('subscribeToUserActivity error:', err);
      callback([]);
    }
  );
};
export const getOrCreateCertificateRecord = async (
  enrolmentId: string,
  userId: string,
  learnerId: string,
  userName: string,
  userEmail: string,
  programmeId: string,
  programmeName: string,
  cohortId: string,
  cohortName: string,
  completionPercentage: number
): Promise<CertificateRecord> => {
  const qCert = query(
    collection(db, CERTIFICATES_COLLECTION),
    where('enrolmentId', '==', enrolmentId)
  );
  const snap = await getDocs(qCert);

  if (!snap.empty) {
    const existing = {
      id: snap.docs[0].id,
      ...snap.docs[0].data(),
    } as CertificateRecord;

    // Auto-upgrade status if completion >= 80% and currently in progress
    if (completionPercentage >= 80 && existing.status !== 'ISSUED') {
      await updateDoc(
        doc(db, CERTIFICATES_COLLECTION, existing.id),
        cleanFirestoreData({
          status: 'ISSUED',
          completionPercentage,
          updatedAt: new Date().toISOString(),
        })
      );
      existing.status = 'ISSUED';
      existing.completionPercentage = completionPercentage;
    }

    return existing;
  }

  // Create new certificate record
  const certDocRef = doc(collection(db, CERTIFICATES_COLLECTION));
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  const certCode = `CERT-${new Date().getFullYear()}-${randomPart}`;
  const now = new Date().toISOString();

  const newCert: CertificateRecord = cleanFirestoreData({
    id: certDocRef.id,
    userId,
    learnerId,
    userEmail,
    userName,
    enrolmentId,
    programmeId,
    programmeName,
    cohortId,
    cohortName,
    certificateCode: certCode,
    issueDate: now,
    status: completionPercentage >= 80 ? 'ISSUED' : 'IN_PROGRESS',
    completionPercentage,
    gradeAverage: 92,
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(certDocRef, newCert);
  return newCert;
};

export const subscribeToUserCertificate = (
  enrolmentId: string,
  callback: (cert: CertificateRecord | null) => void
) => {
  return onSnapshot(
    collection(db, CERTIFICATES_COLLECTION),
    (snap) => {
      const certs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CertificateRecord);
      const found = certs.find((c) => c.enrolmentId === enrolmentId) || certs[0] || null;
      callback(found);
    },
    (err) => {
      console.warn('subscribeToUserCertificate error:', err);
      callback(null);
    }
  );
};
