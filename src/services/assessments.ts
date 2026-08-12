import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/utils';
import {
  QuestionBank,
  AssessmentQuestion,
  Assessment,
  AssessmentAttempt,
  AttemptStatus,
} from '../types';

const QUESTION_BANKS_COLLECTION = 'questionBanks';
const QUESTIONS_COLLECTION = 'questions';
const ASSESSMENTS_COLLECTION = 'assessments';
const ATTEMPTS_COLLECTION = 'assessmentAttempts';

// --- QUESTION BANKS & QUESTIONS ---

export const getQuestionBanks = async (): Promise<QuestionBank[]> => {
  try {
    const colRef = collection(db, QUESTION_BANKS_COLLECTION);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as QuestionBank[];
  } catch (error) {
    console.error('Error fetching question banks:', error);
    return [];
  }
};

export const subscribeToQuestionBanks = (callback: (banks: QuestionBank[]) => void) => {
  const colRef = collection(db, QUESTION_BANKS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as QuestionBank[];
      callback(list);
    },
    (err) => {
      console.warn('subscribeToQuestionBanks error:', err.message);
      callback([]);
    }
  );
};

export const createQuestionBank = async (
  bankData: Omit<QuestionBank, 'id' | 'createdAt' | 'updatedAt' | 'questionCount'>
): Promise<string> => {
  const colRef = collection(db, QUESTION_BANKS_COLLECTION);
  const newDocRef = doc(colRef);
  const now = new Date().toISOString();

  const newBank: QuestionBank = cleanFirestoreData({
    id: newDocRef.id,
    ...bankData,
    questionCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(newDocRef, newBank);
  return newDocRef.id;
};

export const updateQuestionBank = async (
  bankId: string,
  updates: Partial<QuestionBank>
): Promise<void> => {
  const docRef = doc(db, QUESTION_BANKS_COLLECTION, bankId);
  const payload = cleanFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(docRef, payload);
};

export const deleteQuestionBank = async (bankId: string): Promise<void> => {
  await deleteDoc(doc(db, QUESTION_BANKS_COLLECTION, bankId));
};

export const getQuestionsForBank = async (bankId: string): Promise<AssessmentQuestion[]> => {
  try {
    const q = query(
      collection(db, QUESTIONS_COLLECTION),
      where('questionBankId', '==', bankId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AssessmentQuestion[];
  } catch (error) {
    console.error('Error fetching questions for bank:', error);
    return [];
  }
};

export const addQuestionToBank = async (
  bankId: string,
  questionData: Omit<AssessmentQuestion, 'id'>
): Promise<string> => {
  const qRef = doc(collection(db, QUESTIONS_COLLECTION));

  const newQ: AssessmentQuestion = cleanFirestoreData({
    id: qRef.id,
    questionBankId: bankId,
    ...questionData,
  });

  await setDoc(qRef, newQ);

  // Update bank question count
  const existingQuestions = await getQuestionsForBank(bankId);
  await updateQuestionBank(bankId, { questionCount: existingQuestions.length });

  return qRef.id;
};

export const updateQuestion = async (
  questionId: string,
  updates: Partial<AssessmentQuestion>
): Promise<void> => {
  const qRef = doc(db, QUESTIONS_COLLECTION, questionId);
  await updateDoc(qRef, cleanFirestoreData(updates));
};

export const deleteQuestion = async (questionId: string, bankId: string): Promise<void> => {
  await deleteDoc(doc(db, QUESTIONS_COLLECTION, questionId));
  const existingQuestions = await getQuestionsForBank(bankId);
  await updateQuestionBank(bankId, { questionCount: existingQuestions.length });
};

// --- ASSESSMENTS MANAGEMENT ---

export const getAssessments = async (
  programmeId?: string,
  cohortId?: string
): Promise<Assessment[]> => {
  try {
    const colRef = collection(db, ASSESSMENTS_COLLECTION);
    const snapshot = await getDocs(colRef);
    let list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Assessment[];

    if (programmeId) {
      list = list.filter((a) => !a.programmeId || a.programmeId === programmeId);
    }
    if (cohortId) {
      list = list.filter((a) => !a.cohortId || a.cohortId === cohortId);
    }

    return list;
  } catch (error) {
    console.error('Error fetching assessments:', error);
    return [];
  }
};

export const subscribeToAssessments = (callback: (assessments: Assessment[]) => void) => {
  const colRef = collection(db, ASSESSMENTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Assessment[];
      callback(list);
    },
    (err) => {
      console.warn('subscribeToAssessments error:', err.message);
      callback([]);
    }
  );
};

export const getAssessmentById = async (assessmentId: string): Promise<Assessment | null> => {
  try {
    const docRef = doc(db, ASSESSMENTS_COLLECTION, assessmentId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Assessment;
  } catch (error) {
    console.error('Error fetching assessment by ID:', error);
    return null;
  }
};

export const createAssessment = async (
  assessmentData: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt' | 'totalPoints'>
): Promise<string> => {
  const docRef = doc(collection(db, ASSESSMENTS_COLLECTION));
  const now = new Date().toISOString();

  const totalPoints = (assessmentData.questions || []).reduce(
    (sum, q) => sum + (q.points || 1),
    0
  );

  const newAssessment: Assessment = cleanFirestoreData({
    id: docRef.id,
    ...assessmentData,
    totalPoints,
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(docRef, newAssessment);
  return docRef.id;
};

export const updateAssessment = async (
  assessmentId: string,
  updates: Partial<Assessment>
): Promise<void> => {
  const docRef = doc(db, ASSESSMENTS_COLLECTION, assessmentId);
  const now = new Date().toISOString();

  let totalPointsUpdates: { totalPoints?: number } = {};
  if (updates.questions) {
    totalPointsUpdates.totalPoints = updates.questions.reduce(
      (sum, q) => sum + (q.points || 1),
      0
    );
  }

  const payload = cleanFirestoreData({
    ...updates,
    ...totalPointsUpdates,
    updatedAt: now,
  });

  await updateDoc(docRef, payload);
};

export const deleteAssessment = async (assessmentId: string): Promise<void> => {
  await deleteDoc(doc(db, ASSESSMENTS_COLLECTION, assessmentId));
};

// --- ATTEMPTS & DETERMINISTIC SCORING ENGINE ---

export const getUserAttempts = async (
  userId: string,
  assessmentId?: string
): Promise<AssessmentAttempt[]> => {
  try {
    const colRef = collection(db, ATTEMPTS_COLLECTION);
    const q = query(colRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    let attempts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AssessmentAttempt[];

    if (assessmentId) {
      attempts = attempts.filter((a) => a.assessmentId === assessmentId);
    }

    return attempts.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  } catch (error) {
    console.error('Error fetching user attempts:', error);
    return [];
  }
};

export const getAllAttempts = async (): Promise<AssessmentAttempt[]> => {
  try {
    const colRef = collection(db, ATTEMPTS_COLLECTION);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AssessmentAttempt[];
  } catch (error) {
    console.error('Error fetching all attempts:', error);
    return [];
  }
};

export const subscribeToAllAttempts = (callback: (attempts: AssessmentAttempt[]) => void) => {
  const colRef = collection(db, ATTEMPTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AssessmentAttempt[];
      callback(list);
    },
    (err) => {
      console.warn('subscribeToAllAttempts error:', err.message);
      callback([]);
    }
  );
};

// Helper: Shuffle array for question randomization
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const startAttempt = async (
  assessment: Assessment,
  userId: string,
  userName: string,
  userEmail: string
): Promise<AssessmentAttempt> => {
  // Check attempt limits
  const userAttempts = await getUserAttempts(userId, assessment.id);
  const completedAttempts = userAttempts.filter(
    (a) => a.status === 'SUBMITTED' || a.status === 'TIMED_OUT'
  );

  if (assessment.maxAttempts > 0 && completedAttempts.length >= assessment.maxAttempts) {
    throw new Error(
      `You have reached the maximum allowed attempts (${assessment.maxAttempts}) for this assessment.`
    );
  }

  // Reuse an existing IN_PROGRESS attempt if available
  const activeAttempt = userAttempts.find((a) => a.status === 'IN_PROGRESS');
  if (activeAttempt) {
    return activeAttempt;
  }

  const docRef = doc(collection(db, ATTEMPTS_COLLECTION));
  const now = new Date();
  const startedAt = now.toISOString();

  let expiresAt: string | undefined = undefined;
  if (assessment.durationMinutes && assessment.durationMinutes > 0) {
    const expireTime = new Date(now.getTime() + assessment.durationMinutes * 60 * 1000);
    expiresAt = expireTime.toISOString();
  }

  // Prepare questions sequence (randomize if configured)
  let orderedQuestions = assessment.questions || [];
  if (assessment.randomizeQuestions) {
    orderedQuestions = shuffleArray(orderedQuestions);
  }

  const questionsOrder = orderedQuestions.map((q) => q.id);

  const newAttempt: AssessmentAttempt = cleanFirestoreData({
    id: docRef.id,
    assessmentId: assessment.id,
    assessmentTitle: assessment.title,
    userId,
    userName,
    userEmail,
    attemptNumber: completedAttempts.length + 1,
    startedAt,
    expiresAt,
    status: 'IN_PROGRESS',
    answers: {},
    questionsOrder,
    score: 0,
    maxScore: assessment.totalPoints || orderedQuestions.reduce((s, q) => s + (q.points || 1), 0),
    percentage: 0,
    passed: false,
    createdAt: startedAt,
    updatedAt: startedAt,
  });

  await setDoc(docRef, newAttempt);
  return newAttempt;
};

// Real-time answer saving progress
export const saveAnswerProgress = async (
  attemptId: string,
  answers: Record<string, string>
): Promise<void> => {
  const docRef = doc(db, ATTEMPTS_COLLECTION, attemptId);
  await updateDoc(docRef, cleanFirestoreData({
    answers,
    updatedAt: new Date().toISOString(),
  }));
};

// Deterministic Scoring & Submission
export const submitAttempt = async (
  attemptId: string,
  answers: Record<string, string>,
  assessment: Assessment
): Promise<AssessmentAttempt> => {
  const docRef = doc(db, ATTEMPTS_COLLECTION, attemptId);
  const now = new Date().toISOString();

  let totalScore = 0;
  const questions = assessment.questions || [];
  const maxPossibleScore =
    assessment.totalPoints || questions.reduce((sum, q) => sum + (q.points || 1), 0);

  // Objective Deterministic Scoring Loop
  questions.forEach((q) => {
    const selectedChoiceId = answers[q.id];
    if (selectedChoiceId && selectedChoiceId === q.correctAnswerId) {
      totalScore += q.points || 1;
    }
  });

  const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
  const passed = percentage >= (assessment.passThresholdPercentage || 70);

  const updatedAttemptData = cleanFirestoreData({
    answers,
    submittedAt: now,
    status: 'SUBMITTED' as AttemptStatus,
    score: totalScore,
    maxScore: maxPossibleScore,
    percentage,
    passed,
    updatedAt: now,
  });

  await updateDoc(docRef, updatedAttemptData);

  const updatedSnap = await getDoc(docRef);
  return { id: updatedSnap.id, ...updatedSnap.data() } as AssessmentAttempt;
};

// --- SEED SAMPLE DEFAULT ASSESSMENT DATA IF EMPTY ---
export const seedDefaultAssessmentIfEmpty = async (): Promise<string> => {
  const existingBanks = await getQuestionBanks();
  let bankId = existingBanks[0]?.id;

  if (!existingBanks.length) {
    bankId = await createQuestionBank({
      title: 'Generative AI & Automation Skills Bank',
      description: 'Core proficiency questions for AI Engineering & Automation applicants',
      programmeName: 'Generative AI & AI Automation',
    });

    const sampleQuestions: Omit<AssessmentQuestion, 'id'>[] = [
      {
        questionBankId: bankId,
        text: 'Which architectural design pattern is used by Gemini models to process text, image, and audio inputs natively in a single neural network?',
        type: 'MULTIPLE_CHOICE',
        choices: [
          { id: 'c1', text: 'Multimodal Transformer Architecture' },
          { id: 'c2', text: 'Recurrent Neural Network (RNN) Cascade' },
          { id: 'c3', text: 'Convolutional Speech Stacking' },
          { id: 'c4', text: 'Rule-Based Pattern Matcher' },
        ],
        correctAnswerId: 'c1',
        explanation: 'Native multimodal transformers process text, image, and audio embeddings jointly.',
        points: 20,
      },
      {
        questionBankId: bankId,
        text: 'True or False: Storing API secret keys directly inside client-side JavaScript code exposed to the web browser is considered safe practice.',
        type: 'TRUE_FALSE',
        choices: [
          { id: 'true', text: 'True' },
          { id: 'false', text: 'False' },
        ],
        correctAnswerId: 'false',
        explanation: 'API keys must always remain on server-side proxies or backend APIs to prevent user exposure.',
        points: 20,
      },
      {
        questionBankId: bankId,
        text: 'What is the primary function of Structured Outputs (e.g. JSON Schema enforcement) in Generative AI workflows?',
        type: 'MULTIPLE_CHOICE',
        choices: [
          { id: 'c1', text: 'Guarantees the model response matches a strict object schema for program execution' },
          { id: 'c2', text: 'Increases the temperature parameter to maximize model randomness' },
          { id: 'c3', text: 'Translates natural language text into binary machine code' },
          { id: 'c4', text: 'Compresses images before sending them to the API' },
        ],
        correctAnswerId: 'c1',
        explanation: 'Structured outputs enforce type safety and schema validation for API integration.',
        points: 20,
      },
      {
        questionBankId: bankId,
        text: 'True or False: Temperature settings close to 0.0 produce more deterministic and focused completions.',
        type: 'TRUE_FALSE',
        choices: [
          { id: 'true', text: 'True' },
          { id: 'false', text: 'False' },
        ],
        correctAnswerId: 'true',
        explanation: 'Lower temperature values reduce token variance, yielding deterministic outputs.',
        points: 20,
      },
      {
        questionBankId: bankId,
        text: 'In Retrieval-Augmented Generation (RAG), what is the role of Vector Embeddings?',
        type: 'MULTIPLE_CHOICE',
        choices: [
          { id: 'c1', text: 'Representing document chunks numerically in high-dimensional space for semantic search' },
          { id: 'c2', text: 'Encrypting user passwords before database storage' },
          { id: 'c3', text: 'Formatting CSS layouts for web dashboards' },
          { id: 'c4', text: 'Generating synthetic audio frequencies for text-to-speech' },
        ],
        correctAnswerId: 'c1',
        explanation: 'Vector embeddings capture semantic similarity for vector database retrieval.',
        points: 20,
      },
    ];

    for (const q of sampleQuestions) {
      await addQuestionToBank(bankId, q);
    }
  }

  const existingAssessments = await getAssessments();
  if (existingAssessments.length > 0) {
    return existingAssessments[0].id;
  }

  const questionsForBank = await getQuestionsForBank(bankId!);

  const assessmentId = await createAssessment({
    title: 'Generative AI & Automation Pre-Admission Assessment',
    description: 'Technical proficiency evaluation covering AI fundamentals, security, structured outputs, and RAG.',
    programmeName: 'Generative AI & AI Automation',
    questions: questionsForBank,
    durationMinutes: 15,
    passThresholdPercentage: 70,
    maxAttempts: 2,
    randomizeQuestions: true,
    availability: 'PUBLISHED',
  });

  return assessmentId;
};
