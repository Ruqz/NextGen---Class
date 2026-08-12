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
  Application,
  ApplicationQuestion,
  ApplicationStatus,
  ProgrammeConfig,
  QualificationStatus,
  AssessmentStatus,
  AdmissionStatus,
  UploadedFileMeta,
} from '../types';

const PROGRAMME_CONFIGS_COLLECTION = 'programmeConfigs';
const APPLICATIONS_COLLECTION = 'applications';

// Default initial questions for Cohort 2 / Generative AI & AI Automation
export const DEFAULT_COHORT_2_QUESTIONS: ApplicationQuestion[] = [
  {
    id: 'q_laptop',
    questionText: 'Do you have access to a working laptop or desktop computer for coursework?',
    fieldType: 'yes_no',
    required: true,
    helpText: 'A personal computer with modern web browser capabilities is required.',
  },
  {
    id: 'q_internet',
    questionText: 'Do you have access to a reliable, high-speed internet connection?',
    fieldType: 'yes_no',
    required: true,
    helpText: 'Required for attending live virtual sessions and hands-on cloud AI labs.',
  },
  {
    id: 'q_weekly_hours',
    questionText: 'How many hours per week can you consistently commit to live classes and assignments?',
    fieldType: 'multiple_choice',
    required: true,
    options: ['5 - 10 Hours', '10 - 15 Hours (Recommended)', '15 - 20 Hours', '20+ Hours'],
    helpText: 'Select your realistic weekly commitment.',
  },
  {
    id: 'q_ai_experience',
    questionText: 'Describe your previous experience with AI tools, prompting, or software development.',
    fieldType: 'textarea',
    required: true,
    helpText: 'Mention tools like ChatGPT, Claude, Python, automation platforms, or any prior tech background.',
  },
  {
    id: 'q_motivation',
    questionText: 'What is your primary motivation for joining this cohort, and how will it advance your career or goals?',
    fieldType: 'textarea',
    required: true,
    helpText: 'Share your short-term and long-term objectives.',
  },
];

export const DEFAULT_ELIGIBILITY_REQUIREMENTS: string[] = [
  'Access to a working laptop or PC with high-speed internet connection',
  'Ability to commit a minimum of 10-15 hours weekly for 12 weeks',
  'Basic digital literacy and enthusiasm for Artificial Intelligence and automation',
];

// --- PROGRAMME CONFIG SERVICES ---

export const getProgrammeConfig = async (programmeId: string): Promise<ProgrammeConfig> => {
  const docRef = doc(db, PROGRAMME_CONFIGS_COLLECTION, programmeId);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const data = snap.data();
    return {
      programmeId,
      applicationQuestions: data.applicationQuestions || DEFAULT_COHORT_2_QUESTIONS,
      eligibilityRequirements: data.eligibilityRequirements || DEFAULT_ELIGIBILITY_REQUIREMENTS,
      updatedAt: data.updatedAt || new Date().toISOString(),
      updatedBy: data.updatedBy,
    };
  }

  // Fallback initial config
  return {
    programmeId,
    applicationQuestions: DEFAULT_COHORT_2_QUESTIONS,
    eligibilityRequirements: DEFAULT_ELIGIBILITY_REQUIREMENTS,
    updatedAt: new Date().toISOString(),
  };
};

export const saveProgrammeConfig = async (
  programmeId: string,
  questions: ApplicationQuestion[],
  eligibilityRequirements: string[],
  updatedBy?: string
): Promise<void> => {
  const docRef = doc(db, PROGRAMME_CONFIGS_COLLECTION, programmeId);
  await setDoc(
    docRef,
    cleanFirestoreData({
      programmeId,
      applicationQuestions: questions,
      eligibilityRequirements,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Programme Manager',
    }),
    { merge: true }
  );
};

// --- APPLICATION SERVICES ---

export const submitApplication = async (
  data: Partial<Application> & {
    applicantId: string;
    applicantName: string;
    applicantEmail: string;
    programmeId: string;
    programmeName: string;
    cohortId: string;
    cohortName: string;
    answers: Record<string, any>;
  }
): Promise<string> => {
  const now = new Date().toISOString();
  const newApp = cleanFirestoreData({
    ...data,
    formId: data.formId || 'default_form',
    formVersionId: data.formVersionId || `v${data.formVersion || 1}`,
    formVersion: data.formVersion || 1,
    status: (data.status || 'SUBMITTED') as ApplicationStatus,
    qualificationStatus: data.qualificationStatus || 'PENDING',
    assessmentStatus: data.assessmentStatus || 'NOT_STARTED',
    admissionStatus: data.admissionStatus || 'APPLIED',
    uploadedFiles: data.uploadedFiles || {},
    submittedAt: now,
    updatedAt: now,
  });

  const docRef = await addDoc(collection(db, APPLICATIONS_COLLECTION), newApp);
  return docRef.id;
};

export const getApplicationsByApplicant = async (
  applicantId: string
): Promise<Application[]> => {
  const q = query(
    collection(db, APPLICATIONS_COLLECTION),
    where('applicantId', '==', applicantId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Application[];
};

export const subscribeToApplicantApplications = (
  applicantId: string,
  callback: (apps: Application[]) => void
) => {
  const q = query(
    collection(db, APPLICATIONS_COLLECTION),
    where('applicantId', '==', applicantId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Application[];
      callback(list);
    },
    (error) => {
      console.warn('subscribeToApplicantApplications error:', error.message);
      callback([]);
    }
  );
};

export const subscribeToAllApplications = (callback: (apps: Application[]) => void) => {
  return onSnapshot(
    collection(db, APPLICATIONS_COLLECTION),
    (snap) => {
      const list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Application[];
      callback(list);
    },
    (error) => {
      console.warn('subscribeToAllApplications error:', error.message);
      callback([]);
    }
  );
};

export const updateApplicationStatuses = async (
  applicationId: string,
  data: {
    status?: ApplicationStatus;
    qualificationStatus?: QualificationStatus;
    assessmentStatus?: AssessmentStatus;
    admissionStatus?: AdmissionStatus;
    reviewNotes?: string;
  }
): Promise<void> => {
  const docRef = doc(db, APPLICATIONS_COLLECTION, applicationId);
  const updates: any = cleanFirestoreData({
    ...data,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(docRef, updates);
};

export const updateApplicationStatus = async (
  applicationId: string,
  status: ApplicationStatus,
  reviewNotes?: string
): Promise<void> => {
  await updateApplicationStatuses(applicationId, { status, reviewNotes });
};

export const withdrawApplication = async (applicationId: string): Promise<void> => {
  await updateApplicationStatus(applicationId, 'WITHDRAWN');
};

// --- CSV EXPORT HELPER ---

export const exportApplicationsToCSV = (applications: Application[]): void => {
  if (applications.length === 0) return;

  const headers = [
    'Application ID',
    'Applicant Name',
    'Applicant Email',
    'Applicant Phone',
    'Programme',
    'Cohort',
    'Form Version',
    'Overall Status',
    'Qualification Status',
    'Assessment Status',
    'Admission Status',
    'Submitted At',
    'Review Notes',
  ];

  const rows = applications.map((app) => [
    app.id,
    `"${(app.applicantName || '').replace(/"/g, '""')}"`,
    `"${(app.applicantEmail || '').replace(/"/g, '""')}"`,
    `"${(app.applicantPhone || '').replace(/"/g, '""')}"`,
    `"${(app.programmeName || '').replace(/"/g, '""')}"`,
    `"${(app.cohortName || '').replace(/"/g, '""')}"`,
    `v${app.formVersion || 1}`,
    app.status,
    app.qualificationStatus || 'PENDING',
    app.assessmentStatus || 'NOT_STARTED',
    app.admissionStatus || 'APPLIED',
    app.submittedAt,
    `"${(app.reviewNotes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `applications_export_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
