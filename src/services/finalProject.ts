import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/utils';
import {
  FinalProjectConfig,
  FinalProjectSubmission,
  FinalProjectStatus,
  LearnerProgressScore,
} from '../types';
import { calculateProgressFromInputs, DEFAULT_PROGRESS_RULE } from './progressEngine';

const CONFIGS_COLLECTION = 'finalProjectConfigs';
const SUBMISSIONS_COLLECTION = 'finalProjectSubmissions';
const PROGRESS_COLLECTION = 'learnerProgress';

// Default Seed Projects for default programmes
export const DEFAULT_SEED_PROJECTS: FinalProjectConfig[] = [
  {
    id: 'prog_ai_eng',
    programmeId: 'prog_ai_eng',
    programmeName: 'AI & Machine Learning Engineering',
    title: 'Enterprise AI & LLM Capstone Application',
    description: 'Design, implement, and deploy an end-to-end full-stack AI application leveraging modern LLMs, vector database search or RAG, clean API architecture, and real-time frontend UI.',
    requirements: `### Capstone Core Requirements:
1. **Architecture & Design**: Document system data flow, API endpoints, and model architecture in a clean project README.
2. **AI & Model Integration**: Implement production LLM or vision model calls via server-side secure routes.
3. **Database & Storage**: Store user histories, feedback, and user-generated sessions securely in Firestore or SQL.
4. **Deployment & CI/CD**: Deploy live application on Cloud Run or public host.
5. **Demonstration**: Provide a working live URL and open-source GitHub repository URL.`,
    dueDate: '2026-09-30',
    maxGrade: 100,
    passingGrade: 70,
    deliverableTypes: ['url', 'files', 'description'],
    updatedAt: new Date().toISOString(),
    updatedBy: 'pm@platform.org',
  },
  {
    id: 'prog_cloud_ops',
    programmeId: 'prog_cloud_ops',
    programmeName: 'Cloud Infrastructure & DevOps',
    title: 'Multi-Region Microservices Infrastructure & Pipeline',
    description: 'Build automated Terraform infrastructure, Docker containers, Kubernetes deployments, and a complete CI/CD pipeline with live monitoring.',
    requirements: `### Capstone Core Requirements:
1. **Infrastructure as Code**: Terraform scripts defining VPCs, Kubernetes clusters, and load balancers.
2. **CI/CD Pipeline**: GitHub Actions automation building Docker images and running automated tests.
3. **Monitoring & Security**: Configure Cloud Logging, Prometheus metrics, and RBAC security policies.
4. **Live Verification**: Working staging deployment link and repository setup.`,
    dueDate: '2026-09-30',
    maxGrade: 100,
    passingGrade: 70,
    deliverableTypes: ['url', 'files', 'description'],
    updatedAt: new Date().toISOString(),
    updatedBy: 'pm@platform.org',
  },
  {
    id: 'DEFAULT_PROJECT',
    programmeId: 'ALL',
    programmeName: 'All Programmes (Default Capstone)',
    title: 'Full-Stack Production Capstone Project',
    description: 'Comprehensive capstone project demonstrating complete mastery of full-stack software development, data persistence, user auth, and cloud deployment.',
    requirements: `### Capstone Requirements:
1. Complete full-stack web or mobile application codebase.
2. Comprehensive documentation and architectural overview.
3. Public GitHub repository and hosted live demo URL.
4. Project presentation or video walkthrough upload.`,
    dueDate: '2026-09-30',
    maxGrade: 100,
    passingGrade: 70,
    deliverableTypes: ['url', 'files', 'description'],
    updatedAt: new Date().toISOString(),
    updatedBy: 'pm@platform.org',
  },
];

/**
 * Subscribe to all final project configurations
 */
export const subscribeToFinalProjectConfigs = (
  callback: (configs: FinalProjectConfig[]) => void
) => {
  return onSnapshot(
    collection(db, CONFIGS_COLLECTION),
    async (snap) => {
      let list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FinalProjectConfig[];

      // Seed defaults if empty
      if (snap.empty) {
        for (const seed of DEFAULT_SEED_PROJECTS) {
          await setDoc(doc(db, CONFIGS_COLLECTION, seed.id), cleanFirestoreData(seed));
        }
        list = DEFAULT_SEED_PROJECTS;
      }

      callback(list);
    },
    (err) => {
      console.warn('subscribeToFinalProjectConfigs error:', err.message);
      callback(DEFAULT_SEED_PROJECTS);
    }
  );
};

/**
 * Subscribe to project config for a specific programme
 */
export const subscribeToProgrammeProjectConfig = (
  programmeId: string,
  callback: (config: FinalProjectConfig) => void
) => {
  return onSnapshot(
    collection(db, CONFIGS_COLLECTION),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FinalProjectConfig[];

      const match =
        list.find((c) => c.programmeId === programmeId) ||
        list.find((c) => c.programmeId === 'ALL') ||
        DEFAULT_SEED_PROJECTS[2];

      callback(match);
    },
    (err) => {
      console.warn('subscribeToProgrammeProjectConfig error:', err.message);
      callback(DEFAULT_SEED_PROJECTS[2]);
    }
  );
};

/**
 * Define or Update Final Project for a Programme
 */
export const saveFinalProjectConfig = async (
  config: Partial<FinalProjectConfig> & { programmeId: string }
): Promise<string> => {
  const id = config.id || config.programmeId;
  const docRef = doc(db, CONFIGS_COLLECTION, id);

  const payload: FinalProjectConfig = cleanFirestoreData({
    id,
    programmeId: config.programmeId,
    programmeName: config.programmeName || 'Target Programme',
    title: config.title || 'Programme Capstone Project',
    description: config.description || 'Full-stack capstone project requirement.',
    requirements: config.requirements || 'Complete all deliverables.',
    dueDate: config.dueDate || '2026-09-30',
    maxGrade: Number(config.maxGrade ?? 100),
    passingGrade: Number(config.passingGrade ?? 70),
    deliverableTypes: config.deliverableTypes || ['url', 'files', 'description'],
    updatedAt: new Date().toISOString(),
    updatedBy: config.updatedBy || 'pm@platform.org',
  });

  await setDoc(docRef, payload, { merge: true });
  return id;
};

/**
 * Subscribe to learner's own project submission
 */
export const subscribeToLearnerProjectSubmission = (
  programmeId: string,
  learnerId: string,
  callback: (submission: FinalProjectSubmission | null) => void
) => {
  const q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    where('learnerId', '==', learnerId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FinalProjectSubmission[];

      const userSubmission = list.find(
        (s) => s.learnerId === learnerId && (s.programmeId === programmeId || programmeId === 'ALL')
      ) || list.find((s) => s.learnerId === learnerId) || null;

      callback(userSubmission);
    },
    (err) => {
      console.warn('subscribeToLearnerProjectSubmission error:', err.message);
      callback(null);
    }
  );
};

/**
 * Subscribe to all final project submissions for PM / Facilitator
 */
export const subscribeToAllProjectSubmissions = (
  programmeId?: string,
  cohortId?: string,
  callback?: (submissions: FinalProjectSubmission[]) => void
) => {
  return onSnapshot(
    collection(db, SUBMISSIONS_COLLECTION),
    (snap) => {
      let list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FinalProjectSubmission[];

      if (programmeId && programmeId !== 'ALL') {
        list = list.filter((s) => s.programmeId === programmeId);
      }
      if (cohortId && cohortId !== 'ALL') {
        list = list.filter((s) => s.cohortId === cohortId);
      }

      if (callback) callback(list);
    },
    (err) => {
      console.warn('subscribeToAllProjectSubmissions error:', err.message);
      if (callback) callback([]);
    }
  );
};

/**
 * Submit or Update Learner Final Project
 */
export const submitFinalProject = async (
  data: Partial<FinalProjectSubmission> & {
    programmeId: string;
    learnerId: string;
    description: string;
  }
): Promise<string> => {
  const submissionId = `${data.programmeId}_${data.learnerId}`;
  const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);

  const existingSnap = await getDoc(docRef);
  const existingData = existingSnap.exists() ? existingSnap.data() : {};

  const payload: FinalProjectSubmission = cleanFirestoreData({
    id: submissionId,
    programmeId: data.programmeId,
    programmeName: data.programmeName || 'Enrolled Programme',
    cohortId: data.cohortId || 'ALL',
    cohortName: data.cohortName || 'All Cohorts',
    learnerId: data.learnerId,
    learnerName: data.learnerName || 'Active Learner',
    learnerEmail: data.learnerEmail || 'learner@platform.org',
    description: data.description,
    repositoryUrl: data.repositoryUrl || '',
    liveDemoUrl: data.liveDemoUrl || '',
    attachments: data.attachments || [],
    submittedAt: existingData.submittedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: (existingData.status as FinalProjectStatus) === 'APPROVED' ? 'APPROVED' : 'SUBMITTED',
    grade: existingData.grade ?? undefined,
    facilitatorFeedback: existingData.facilitatorFeedback || '',
    reviewedBy: existingData.reviewedBy || '',
    reviewedAt: existingData.reviewedAt || '',
    approved: existingData.approved ?? false,
  });

  await setDoc(docRef, payload, { merge: true });
  return submissionId;
};

/**
 * Facilitator Review, Grade, Comment & Approve Final Project
 * Also syncs grade directly to Progress Engine (`learnerProgress` collection).
 */
export const gradeAndApproveFinalProject = async (params: {
  submissionId: string;
  learnerId: string;
  programmeId: string;
  grade: number; // 0-100
  facilitatorFeedback: string;
  approved: boolean;
  reviewedBy: string;
}): Promise<void> => {
  const { submissionId, learnerId, programmeId, grade, facilitatorFeedback, approved, reviewedBy } = params;

  const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  const now = new Date().toISOString();

  const status: FinalProjectStatus = approved ? 'APPROVED' : grade >= 70 ? 'IN_REVIEW' : 'NEEDS_REVISION';

  await updateDoc(docRef, cleanFirestoreData({
    grade,
    facilitatorFeedback,
    status,
    approved,
    reviewedBy,
    reviewedAt: now,
    updatedAt: now,
  }));

  // Sync to Progress Engine
  try {
    const progressDocRef = doc(db, PROGRESS_COLLECTION, learnerId);
    const progressSnap = await getDoc(progressDocRef);

    if (progressSnap.exists()) {
      const pData = progressSnap.data() as LearnerProgressScore;

      const { overallWeightedScore, status: calcStatus } = calculateProgressFromInputs(
        {
          attendanceScore: pData.attendanceScore || 85,
          assignmentsScore: pData.assignmentsScore || 85,
          assessmentsScore: pData.assessmentsScore || 80,
          finalAssessmentScore: pData.finalAssessmentScore || 85,
          finalProjectScore: grade,
        },
        DEFAULT_PROGRESS_RULE
      );

      await updateDoc(progressDocRef, cleanFirestoreData({
        finalProjectScore: grade,
        overallWeightedScore,
        status: calcStatus,
        lastCalculatedAt: now,
      }));
    }
  } catch (err) {
    console.warn('Could not sync final project score to learnerProgress:', err);
  }
};
