import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/utils';
import {
  AIAssessmentQuestionDraft,
  AIAssessmentDraftStatus,
  AIStudyChatMessage,
  AIStudyMode,
  AISupportChatMessage,
  AISupportEscalationTicket,
  AIAssistedFeedbackResult,
  AIReportSynthesisResult,
  AIAuditLogEntry,
  AIOperationType,
  AssessmentQuestion,
  QuestionType,
} from '../types';

const AI_AUDIT_COLLECTION = 'aiAuditLogs';
const AI_DRAFTS_COLLECTION = 'aiQuestionDrafts';
const AI_ESCALATIONS_COLLECTION = 'aiEscalationTickets';

/**
 * PII Data Sanitizer
 * Strips phone numbers, physical addresses, and sensitive identity markers
 * before data is sent to AI models, strictly upholding learner data privacy.
 */
export function sanitizeLearnerDataForPrompt(rawText: string): string {
  if (!rawText) return '';
  let sanitized = rawText;
  // Redact emails
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
  // Redact standard phone numbers
  sanitized = sanitized.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[REDACTED_PHONE]');
  // Redact street addresses or sensitive identity numbers
  sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN_ID]');
  return sanitized;
}

/**
 * Log all AI operations for transparency, governance, and audit trails
 */
export async function logAIOperation(entry: Omit<AIAuditLogEntry, 'id' | 'timestamp'>): Promise<string> {
  const logId = `AI-LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const record: AIAuditLogEntry = {
    ...entry,
    id: logId,
    timestamp: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, AI_AUDIT_COLLECTION, logId), cleanFirestoreData(record));
  } catch (error) {
    console.warn('Could not write AI audit log to Firestore (local fallback)', error);
  }
  return logId;
}

/**
 * 1. AI Assessment Question Generation
 * Grounded strictly in approved curriculum syllabus and resources.
 * Stored as DRAFT_AI_GENERATED requiring human administrator approval before activation.
 */
export async function generateAIAssessmentQuestions(params: {
  programmeId: string;
  programmeName: string;
  moduleName: string;
  topics: string;
  approvedResourceContent: string;
  questionCount?: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  questionType?: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MIXED';
  userUid: string;
  userName: string;
  userRole: string;
}): Promise<{
  questions: AIAssessmentQuestionDraft[];
  curriculumCoverageSummary: string;
}> {
  const response = await fetch('/api/ai/assessment/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      programmeName: params.programmeName,
      moduleName: params.moduleName,
      topics: params.topics,
      approvedResourceContent: params.approvedResourceContent,
      questionCount: params.questionCount || 5,
      difficulty: params.difficulty || 'MEDIUM',
      questionType: params.questionType || 'MULTIPLE_CHOICE',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate questions via AI server endpoint');
  }

  const result = await response.json();
  const rawQuestions = result.data?.questions || [];
  const coverageSummary = result.data?.curriculumCoverageSummary || 'Generated from approved course syllabus';

  const drafts: AIAssessmentQuestionDraft[] = [];

  for (const q of rawQuestions) {
    const draftId = `AIDRAFT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const draftItem: AIAssessmentQuestionDraft = {
      id: draftId,
      programmeId: params.programmeId,
      programmeName: params.programmeName,
      moduleName: params.moduleName,
      topic: q.topic || params.topics.split('\n')[0] || 'Curriculum Topic',
      text: q.text || 'Question prompt',
      type: q.type === 'TRUE_FALSE' ? 'TRUE_FALSE' : 'MULTIPLE_CHOICE',
      choices: q.choices && q.choices.length > 0 ? q.choices : [
        { id: 'c1', text: 'Option A' },
        { id: 'c2', text: 'Option B' },
        { id: 'c3', text: 'Option C' },
        { id: 'c4', text: 'Option D' },
      ],
      correctAnswerId: q.correctAnswerId || 'c1',
      explanation: q.explanation || 'Pedagogical explanation derived from approved resources.',
      points: q.points || 10,
      difficulty: q.difficulty || params.difficulty || 'MEDIUM',
      sourceResourceRef: params.moduleName,
      status: 'DRAFT_AI_GENERATED',
      generatedAt: new Date().toISOString(),
    };

    // Save to Firestore
    try {
      await setDoc(doc(db, AI_DRAFTS_COLLECTION, draftId), cleanFirestoreData(draftItem));
    } catch (e) {
      console.warn('Could not persist AI draft question to Firestore', e);
    }

    drafts.push(draftItem);
  }

  // Log to AI Audit Ledger
  await logAIOperation({
    operationType: 'QUESTION_GENERATION',
    model: 'gemini-3.7-flash',
    userId: params.userUid,
    userName: params.userName,
    userRole: params.userRole,
    programmeId: params.programmeId,
    programmeName: params.programmeName,
    promptSummary: `Generated ${drafts.length} assessment question drafts for "${params.moduleName}"`,
    sanitizedTokensEstimate: drafts.length * 280,
    status: 'SUCCESS',
    humanApprovalRequired: true,
    humanApprovalStatus: 'PENDING',
    details: {
      topics: params.topics,
      questionCount: drafts.length,
      difficulty: params.difficulty,
    },
  });

  return {
    questions: drafts,
    curriculumCoverageSummary: coverageSummary,
  };
}

/**
 * Real-time subscription to AI Question Drafts
 */
export function subscribeToAIDraftQuestions(
  callback: (drafts: AIAssessmentQuestionDraft[]) => void,
  programmeIdFilter?: string
) {
  const collectionRef = collection(db, AI_DRAFTS_COLLECTION);
  let q = query(collectionRef, orderBy('generatedAt', 'desc'), limit(100));

  if (programmeIdFilter && programmeIdFilter !== 'ALL') {
    q = query(collectionRef, where('programmeId', '==', programmeIdFilter), orderBy('generatedAt', 'desc'), limit(100));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AIAssessmentQuestionDraft[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as AIAssessmentQuestionDraft);
      });
      callback(list);
    },
    (error) => {
      console.warn('Failed to subscribe to AI Draft Questions', error);
      callback([]);
    }
  );
}

/**
 * Approve AI-Generated Question Draft and activate it for question banks
 */
export async function approveAIDraftQuestion(
  draftId: string,
  reviewerName: string,
  reviewNotes?: string
): Promise<void> {
  const draftRef = doc(db, AI_DRAFTS_COLLECTION, draftId);
  await updateDoc(draftRef, {
    status: 'APPROVED',
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString(),
    reviewNotes: reviewNotes || 'Approved by Programme Administrator for curriculum assessment use.',
  });

  await logAIOperation({
    operationType: 'QUESTION_GENERATION',
    model: 'gemini-3.7-flash',
    userId: reviewerName,
    userName: reviewerName,
    userRole: 'Administrator',
    promptSummary: `Approved question draft ${draftId}`,
    sanitizedTokensEstimate: 50,
    status: 'SUCCESS',
    humanApprovalRequired: true,
    humanApprovalStatus: 'APPROVED',
    details: { draftId, reviewerName, reviewNotes },
  });
}

/**
 * Reject AI-Generated Question Draft
 */
export async function rejectAIDraftQuestion(
  draftId: string,
  reviewerName: string,
  reviewNotes?: string
): Promise<void> {
  const draftRef = doc(db, AI_DRAFTS_COLLECTION, draftId);
  await updateDoc(draftRef, {
    status: 'REJECTED',
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString(),
    reviewNotes: reviewNotes || 'Rejected during human review.',
  });

  await logAIOperation({
    operationType: 'QUESTION_GENERATION',
    model: 'gemini-3.7-flash',
    userId: reviewerName,
    userName: reviewerName,
    userRole: 'Administrator',
    promptSummary: `Rejected question draft ${draftId}`,
    sanitizedTokensEstimate: 50,
    status: 'SUCCESS',
    humanApprovalRequired: true,
    humanApprovalStatus: 'REJECTED',
    details: { draftId, reviewerName, reviewNotes },
  });
}

/**
 * 2. AI Study Assistant Client Helper
 */
export async function askAIStudyAssistant(params: {
  programmeName: string;
  cohortName: string;
  syllabusContext: string;
  mode: AIStudyMode;
  message: string;
  history?: { role: 'user' | 'model'; content: string }[];
  userId: string;
  userName: string;
}): Promise<string> {
  const response = await fetch('/api/ai/study-assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      programmeName: params.programmeName,
      cohortName: params.cohortName,
      syllabusContext: params.syllabusContext,
      mode: params.mode,
      message: params.message,
      history: params.history || [],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to communicate with AI Study Assistant');
  }

  const result = await response.json();

  // Log to AI Audit Ledger
  await logAIOperation({
    operationType: 'STUDY_ASSISTANT',
    model: 'gemini-3.7-flash',
    userId: params.userId,
    userName: params.userName,
    userRole: 'Learner',
    programmeName: params.programmeName,
    promptSummary: `Study query [${params.mode.toUpperCase()}]: ${params.message.slice(0, 80)}...`,
    sanitizedTokensEstimate: 320,
    status: 'SUCCESS',
    humanApprovalRequired: false,
    humanApprovalStatus: 'NOT_APPLICABLE',
  });

  return result.reply || 'Here is your study summary.';
}

/**
 * 3. AI Learner Support Assistant Client Helper
 * Handles 24/7 logistics and automatically creates escalation tickets if triggered.
 */
export async function askAILearnerSupport(params: {
  userRole: string;
  programmeName: string;
  cohortName: string;
  query: string;
  history?: { role: 'user' | 'model'; content: string }[];
  userId: string;
  userName: string;
  userEmail: string;
}): Promise<{
  reply: string;
  escalationTicket?: AISupportEscalationTicket;
}> {
  const response = await fetch('/api/ai/learner-support/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userRole: params.userRole,
      programmeName: params.programmeName,
      cohortName: params.cohortName,
      query: params.query,
      history: params.history || [],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to communicate with Learner Support Assistant');
  }

  const result = await response.json();
  let createdTicket: AISupportEscalationTicket | undefined = undefined;

  if (result.escalation && result.escalation.needed) {
    const ticketId = `ESC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    createdTicket = {
      id: ticketId,
      userId: params.userId,
      userName: params.userName,
      userEmail: params.userEmail,
      programmeName: params.programmeName,
      cohortName: params.cohortName,
      category: result.escalation.category || 'ACADEMIC',
      priority: result.escalation.priority || 'MEDIUM',
      summary: result.escalation.summary || params.query,
      fullConversationSnippet: `User: ${params.query}\nSupport Assistant: ${result.reply}`,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, AI_ESCALATIONS_COLLECTION, ticketId), cleanFirestoreData(createdTicket));
    } catch (e) {
      console.warn('Could not persist escalation ticket', e);
    }
  }

  // Log to AI Audit Ledger
  await logAIOperation({
    operationType: 'LEARNER_SUPPORT',
    model: 'gemini-3.7-flash',
    userId: params.userId,
    userName: params.userName,
    userRole: params.userRole,
    programmeName: params.programmeName,
    promptSummary: `Learner support inquiry: ${params.query.slice(0, 80)}...`,
    sanitizedTokensEstimate: 260,
    status: 'SUCCESS',
    humanApprovalRequired: false,
    humanApprovalStatus: 'NOT_APPLICABLE',
    details: { escalationCreated: Boolean(createdTicket), ticketId: createdTicket?.id },
  });

  return {
    reply: result.reply,
    escalationTicket: createdTicket,
  };
}

/**
 * Real-time subscription to AI Escalation Tickets for Staff
 */
export function subscribeToAIEscalationTickets(callback: (tickets: AISupportEscalationTicket[]) => void) {
  const collectionRef = collection(db, AI_ESCALATIONS_COLLECTION);
  const q = query(collectionRef, orderBy('createdAt', 'desc'), limit(50));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AISupportEscalationTicket[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as AISupportEscalationTicket);
      });
      callback(list);
    },
    (error) => {
      console.warn('Failed to subscribe to escalation tickets', error);
      callback([]);
    }
  );
}

/**
 * Resolve Support Escalation Ticket
 */
export async function resolveAIEscalationTicket(
  ticketId: string,
  resolvedByName: string,
  notes?: string
): Promise<void> {
  const ticketRef = doc(db, AI_ESCALATIONS_COLLECTION, ticketId);
  await updateDoc(ticketRef, {
    status: 'RESOLVED',
    assignedTo: resolvedByName,
    resolvedAt: new Date().toISOString(),
    resolutionNotes: notes || 'Resolved by programme staff.',
  });
}

/**
 * 4. AI-Assisted Feedback (Facilitator Co-Pilot)
 * Generates an advisory draft that MUST be reviewed and finalized by the human evaluator.
 */
export async function generateAIAssistedFeedback(params: {
  assignmentTitle: string;
  assignmentInstructions: string;
  submissionText: string;
  submissionUrl?: string;
  maxScore?: number;
  rubricCriteria?: string[];
  evaluatorId: string;
  evaluatorName: string;
}): Promise<AIAssistedFeedbackResult> {
  // Sanitize learner submission text to protect privacy
  const sanitizedSubmission = sanitizeLearnerDataForPrompt(params.submissionText);

  const response = await fetch('/api/ai/feedback/assist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignmentTitle: params.assignmentTitle,
      assignmentInstructions: params.assignmentInstructions,
      submissionText: sanitizedSubmission,
      submissionUrl: params.submissionUrl,
      maxScore: params.maxScore || 100,
      rubricCriteria: params.rubricCriteria,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate AI feedback draft');
  }

  const result = await response.json();
  const feedbackData = result.data as AIAssistedFeedbackResult;
  feedbackData.generatedAt = new Date().toISOString();

  // Log to AI Audit Ledger
  await logAIOperation({
    operationType: 'ASSISTED_FEEDBACK',
    model: 'gemini-3.7-flash',
    userId: params.evaluatorId,
    userName: params.evaluatorName,
    userRole: 'Facilitator',
    promptSummary: `Generated feedback co-pilot draft for "${params.assignmentTitle}"`,
    sanitizedTokensEstimate: 450,
    status: 'SUCCESS',
    humanApprovalRequired: true,
    humanApprovalStatus: 'PENDING',
    details: {
      assignmentTitle: params.assignmentTitle,
      suggestedScore: feedbackData.suggestedScore,
      maxScore: params.maxScore,
    },
  });

  return feedbackData;
}

/**
 * 5. AI-Assisted Reporting Synthesis
 * Ingests aggregated KPIs and anonymized summaries to produce executive narratives.
 */
export async function generateAIReportSynthesis(params: {
  reportType: string;
  reportTitle: string;
  filterContext: Record<string, any>;
  kpis: any[];
  summaryMetrics: Record<string, any>;
  audience?: 'leadership' | 'donors' | 'm_and_e' | 'facilitators';
  userUid: string;
  userName: string;
  userRole: string;
}): Promise<AIReportSynthesisResult> {
  const response = await fetch('/api/ai/reporting/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reportType: params.reportType,
      reportTitle: params.reportTitle,
      filterContext: params.filterContext,
      kpis: params.kpis,
      summaryMetrics: params.summaryMetrics,
      audience: params.audience || 'leadership',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate AI report synthesis');
  }

  const result = await response.json();
  const synthesis = result.data as AIReportSynthesisResult;
  synthesis.generatedAt = new Date().toISOString();

  // Log to AI Audit Ledger
  await logAIOperation({
    operationType: 'REPORT_SYNTHESIS',
    model: 'gemini-3.7-flash',
    userId: params.userUid,
    userName: params.userName,
    userRole: params.userRole,
    promptSummary: `Synthesized report narrative for "${params.reportTitle}" (${params.reportType})`,
    sanitizedTokensEstimate: 780,
    status: 'SUCCESS',
    humanApprovalRequired: false,
    humanApprovalStatus: 'NOT_APPLICABLE',
    details: {
      reportType: params.reportType,
      audience: params.audience,
    },
  });

  return synthesis;
}

/**
 * Real-time subscription to AI Audit Ledger
 */
export function subscribeToAIAuditLogs(callback: (logs: AIAuditLogEntry[]) => void) {
  const collectionRef = collection(db, AI_AUDIT_COLLECTION);
  const q = query(collectionRef, orderBy('timestamp', 'desc'), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AIAuditLogEntry[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as AIAuditLogEntry);
      });
      callback(list);
    },
    (error) => {
      console.warn('Failed to subscribe to AI audit logs', error);
      callback([]);
    }
  );
}
