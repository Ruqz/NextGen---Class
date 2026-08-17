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
  FeedbackFormItem,
  FeedbackResponseSubmission,
  FeedbackQuestion,
  QuestionResponseItem,
} from '../types';

const FORMS_COLLECTION = 'feedbackForms';
const RESPONSES_COLLECTION = 'feedbackResponses';

// Default Seed Forms to pre-populate if database is fresh
const SEED_FEEDBACK_FORMS: Omit<FeedbackFormItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Weekly Live Class & Instructor Feedback',
    description: 'Provide feedback on class pacing, instructor support, and your level of understanding for this week.',
    programmeId: 'ALL',
    programmeName: 'All Programmes',
    cohortId: 'ALL',
    cohortName: 'All Cohorts',
    status: 'PUBLISHED',
    createdBy: 'pm@platform.org',
    createdByName: 'Programme Manager',
    questions: [
      {
        id: 'q1_rating',
        questionText: 'How would you rate overall quality of this week\'s live session?',
        questionType: 'rating',
        required: true,
      },
      {
        id: 'q2_instructor',
        questionText: 'Instructor Performance & Engagement: Rate explanation clarity, answer support, and pacing.',
        questionType: 'instructor_feedback',
        required: true,
        placeholder: 'Additional feedback or praise for your instructor...',
      },
      {
        id: 'q3_class',
        questionText: 'Class Content & Materials: Rate relevance, slide quality, and practical lab exercises.',
        questionType: 'class_feedback',
        required: true,
        placeholder: 'Any feedback regarding slides, code samples, or lab assignments...',
      },
      {
        id: 'q4_understanding',
        questionText: 'Level of Concept Understanding: How well did you grasp this week\'s key topics?',
        questionType: 'understanding',
        required: true,
      },
      {
        id: 'q5_confidence',
        questionText: 'Practical Application Confidence: How confident do you feel completing tasks independently?',
        questionType: 'confidence',
        required: true,
      },
      {
        id: 'q6_mc',
        questionText: 'Which class element contributed most to your learning this week?',
        questionType: 'multiple_choice',
        required: true,
        options: [
          'Live Hands-on Coding Demos',
          'Breakout Group Discussions',
          'Q&A & Problem Solving',
          'Self-Paced Reading & Resources',
        ],
      },
      {
        id: 'q7_suggestions',
        questionText: 'Suggestions & Recommendations for next week\'s sessions',
        questionType: 'suggestions',
        required: false,
        placeholder: 'What could we improve or do differently for upcoming classes?',
      },
    ],
  },
  {
    title: 'Mid-Programme Satisfaction & Learner Experience Survey',
    description: 'Comprehensive mid-term evaluation covering satisfaction, platform tools, and course pace.',
    programmeId: 'ALL',
    programmeName: 'All Programmes',
    cohortId: 'ALL',
    cohortName: 'All Cohorts',
    status: 'PUBLISHED',
    createdBy: 'pm@platform.org',
    createdByName: 'Programme Manager',
    questions: [
      {
        id: 'm1_satisfaction',
        questionText: 'Overall Programme Satisfaction: How satisfied are you with your journey so far?',
        questionType: 'satisfaction',
        required: true,
      },
      {
        id: 'm2_text',
        questionText: 'What has been the most valuable skill or concept you have learned so far?',
        questionType: 'text',
        required: true,
        placeholder: 'Share your top takeaway...',
      },
      {
        id: 'm3_instructor',
        questionText: 'Instructor & Facilitator Support Evaluation',
        questionType: 'instructor_feedback',
        required: true,
      },
      {
        id: 'm4_confidence',
        questionText: 'How confident are you in achieving your personal learning goals by programme completion?',
        questionType: 'confidence',
        required: true,
      },
      {
        id: 'm5_suggestions',
        questionText: 'What additional resources, workshops, or mentor office hours would help you succeed?',
        questionType: 'suggestions',
        required: false,
        placeholder: 'Suggest topics, office hour formats, or career support ideas...',
      },
    ],
  },
];

/**
 * Subscribe to feedback forms in real-time, auto-seeding if collection is empty
 */
export const subscribeToFeedbackForms = (
  programmeId?: string,
  cohortId?: string,
  callback?: (forms: FeedbackFormItem[]) => void
) => {
  return onSnapshot(
    collection(db, FORMS_COLLECTION),
    async (snap) => {
      let list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FeedbackFormItem[];

      // Seed default forms if empty
      if (snap.empty) {
        console.log('Seeding default feedback forms...');
        const now = new Date().toISOString();
        for (const seed of SEED_FEEDBACK_FORMS) {
          const docRef = doc(collection(db, FORMS_COLLECTION));
          const newForm: FeedbackFormItem = cleanFirestoreData({
            id: docRef.id,
            ...seed,
            createdAt: now,
            updatedAt: now,
          });
          await setDoc(docRef, newForm);
        }
        return;
      }

      if (programmeId && programmeId !== 'ALL') {
        list = list.filter((f) => f.programmeId === 'ALL' || f.programmeId === programmeId);
      }
      if (cohortId && cohortId !== 'ALL') {
        list = list.filter((f) => !f.cohortId || f.cohortId === 'ALL' || f.cohortId === cohortId);
      }

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (callback) callback(list);
    },
    (err) => {
      console.warn('subscribeToFeedbackForms warning:', err.message);
      if (callback) callback([]);
    }
  );
};

/**
 * Subscribe to feedback response submissions in real-time
 */
export const subscribeToFeedbackResponses = (
  formId?: string,
  learnerId?: string,
  callback?: (responses: FeedbackResponseSubmission[]) => void
) => {
  const colRef = collection(db, RESPONSES_COLLECTION);
  let q = query(colRef);

  if (learnerId) {
    q = query(colRef, where('learnerId', '==', learnerId));
  } else if (formId && formId !== 'ALL') {
    q = query(colRef, where('formId', '==', formId));
  }

  return onSnapshot(
    q,
    (snap) => {
      let list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FeedbackResponseSubmission[];

      if (formId && formId !== 'ALL' && learnerId) {
        list = list.filter((r) => r.formId === formId);
      }

      list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      if (callback) callback(list);
    },
    (err) => {
      console.warn('subscribeToFeedbackResponses warning:', err.message);
      if (callback) callback([]);
    }
  );
};

/**
 * Create or edit a feedback form (PM / Facilitator)
 */
export const saveFeedbackForm = async (
  formData: Partial<FeedbackFormItem> & {
    title: string;
    description: string;
    programmeId: string;
    questions: FeedbackQuestion[];
    createdBy: string;
  }
): Promise<string> => {
  const now = new Date().toISOString();
  const docRef = formData.id
    ? doc(db, FORMS_COLLECTION, formData.id)
    : doc(collection(db, FORMS_COLLECTION));

  const payload: FeedbackFormItem = cleanFirestoreData({
    id: docRef.id,
    title: formData.title,
    description: formData.description || '',
    programmeId: formData.programmeId || 'ALL',
    programmeName: formData.programmeName || 'All Programmes',
    cohortId: formData.cohortId || 'ALL',
    cohortName: formData.cohortName || 'All Cohorts',
    classSessionId: formData.classSessionId || '',
    classSessionTitle: formData.classSessionTitle || '',
    status: formData.status || 'PUBLISHED',
    dueDate: formData.dueDate || '',
    questions: formData.questions || [],
    createdBy: formData.createdBy,
    createdByName: formData.createdByName || 'Programme Manager',
    createdAt: formData.createdAt || now,
    updatedAt: now,
  });

  await setDoc(docRef, payload as any, { merge: true });

  return docRef.id;
};

/**
 * Delete a feedback form
 */
export const deleteFeedbackForm = async (formId: string): Promise<void> => {
  await deleteDoc(doc(db, FORMS_COLLECTION, formId));
};

/**
 * Toggle publish status of a feedback form
 */
export const setFeedbackFormStatus = async (
  formId: string,
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
): Promise<void> => {
  await updateDoc(doc(db, FORMS_COLLECTION, formId), {
    status,
    updatedAt: new Date().toISOString(),
  });
};

/**
 * Submit feedback response (Learner)
 */
export const submitFeedbackResponse = async (params: {
  form: FeedbackFormItem;
  learnerId: string;
  userId: string;
  userName: string;
  userEmail: string;
  responses: QuestionResponseItem[];
}): Promise<string> => {
  const { form, learnerId, userId, userName, userEmail, responses } = params;
  const nowIso = new Date().toISOString();

  // Compute summary averages
  let totalRatingSum = 0;
  let ratingCount = 0;
  let instRatingSum = 0;
  let instCount = 0;
  let confSum = 0;
  let confCount = 0;
  let undSum = 0;
  let undCount = 0;

  responses.forEach((r) => {
    if (r.ratingValue) {
      totalRatingSum += r.ratingValue;
      ratingCount++;

      if (r.questionType === 'instructor_feedback') {
        instRatingSum += r.ratingValue;
        instCount++;
      } else if (r.questionType === 'confidence') {
        confSum += r.ratingValue;
        confCount++;
      } else if (r.questionType === 'understanding') {
        undSum += r.ratingValue;
        undCount++;
      }
    }
  });

  const overallSatisfaction = ratingCount > 0 ? Number((totalRatingSum / ratingCount).toFixed(1)) : 5;
  const instructorRating = instCount > 0 ? Number((instRatingSum / instCount).toFixed(1)) : undefined;
  const confidenceScore = confCount > 0 ? Number((confSum / confCount).toFixed(1)) : undefined;
  const understandingScore = undCount > 0 ? Number((undSum / undCount).toFixed(1)) : undefined;

  const docRef = doc(collection(db, RESPONSES_COLLECTION));
  const newSubmission: FeedbackResponseSubmission = cleanFirestoreData({
    id: docRef.id,
    formId: form.id,
    formTitle: form.title,
    programmeId: form.programmeId,
    programmeName: form.programmeName,
    cohortId: form.cohortId || '',
    cohortName: form.cohortName || '',
    learnerId,
    userId,
    userName,
    userEmail,
    submittedAt: nowIso,
    responses,
    overallSatisfaction,
    instructorRating,
    confidenceScore,
    understandingScore,
  });

  await setDoc(docRef, newSubmission);
  return docRef.id;
};

/**
 * Calculate response rate stats
 */
export const calculateResponseRateStats = (
  responses: FeedbackResponseSubmission[],
  totalEnrolledCount: number
) => {
  const uniqueLearnerIds = new Set(responses.map((r) => r.learnerId || r.userId));
  const uniqueRespondersCount = uniqueLearnerIds.size;
  const totalSubmissionsCount = responses.length;

  const denominator = totalEnrolledCount > 0 ? totalEnrolledCount : Math.max(uniqueRespondersCount, 12);
  const responseRatePercentage = Math.min(
    100,
    Math.round((uniqueRespondersCount / denominator) * 100)
  );

  return {
    uniqueRespondersCount,
    totalSubmissionsCount,
    totalEnrolledCount: denominator,
    responseRatePercentage,
  };
};
