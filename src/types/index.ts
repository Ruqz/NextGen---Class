/**
 * NextGen PRO Platform Core Type Definitions
 */

export type UserRole =
  | 'Applicant'
  | 'Learner'
  | 'Facilitator'
  | 'Programme Manager'
  | 'M&E Manager'
  | 'Super Admin'
  | 'APPLICANT'
  | 'LEARNER'
  | 'FACILITATOR'
  | 'PROGRAMME_MANAGER'
  | 'ME_MANAGER'
  | 'SUPER_ADMIN';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export type ProgrammeStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Programme {
  id: string;
  name: string;
  code?: string;
  slug: string;
  description: string;
  status: ProgrammeStatus;
  duration: string;
  deliveryFormat: 'Online' | 'Hybrid' | 'In-Person';
  configuration?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type CohortStatus =
  | 'DRAFT'
  | 'APPLICATION_OPEN'
  | 'APPLICATION_CLOSED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ARCHIVED';

export interface Cohort {
  id: string;
  programmeId: string;
  programmeName?: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  applicationOpenDate: string;
  applicationCloseDate: string;
  capacity: number;
  status: CohortStatus;
  createdAt: string;
  updatedAt: string;
}

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'yes_no'
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'checkbox'
  | 'url'
  | 'file_upload'
  | 'info_text';

// For backward compatibility
export type ApplicationQuestionType = FormFieldType;

export interface FileUploadConfig {
  allowedTypes: string[]; // e.g. ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg']
  maxSizeBytes: number; // e.g. 5242880 (5MB)
  uploadInstructions?: string;
  maxFiles: number; // default 1
}

export interface ConditionalRule {
  dependsOnFieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
  value: string;
  action: 'show' | 'hide';
}

export interface FormValidationRules {
  min?: number;
  max?: number;
  pattern?: string;
  customMessage?: string;
}

export interface FormField {
  id: string; // questionId
  sectionId?: string; // ID of section it belongs to
  label: string;
  fieldType: FormFieldType;
  description?: string; // Help text
  placeholder?: string;
  required: boolean;
  options?: string[]; // For single_choice, multiple_choice, dropdown
  validation?: FormValidationRules;
  characterLimit?: number; // For text/textarea
  order: number;
  active: boolean; // Active/inactive status
  fileConfig?: FileUploadConfig;
  conditionalLogic?: ConditionalRule;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
}

export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';

export interface ApplicationFormTemplate {
  id: string; // formId
  programmeId: string;
  programmeName?: string;
  cohortId?: string; // Optional: cohort override or specific form
  title: string;
  description?: string;
  version: number;
  status: FormStatus;
  sections: FormSection[];
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ApplicationQuestion {
  id: string;
  questionText: string;
  fieldType: FormFieldType;
  required: boolean;
  options?: string[];
  helpText?: string;
}

export interface ProgrammeConfig {
  programmeId: string;
  applicationQuestions: ApplicationQuestion[];
  eligibilityRequirements: string[];
  updatedAt: string;
  updatedBy?: string;
}

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type QualificationStatus = 'PENDING' | 'QUALIFIED' | 'DISQUALIFIED' | 'UNDER_REVIEW';
export type AssessmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'EXEMPTED';
export type AdmissionStatus = 'APPLIED' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED' | 'WAITLISTED' | 'DEFERRED';

export interface UploadedFileMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string; // Data URL or Storage download URL
  uploadedAt: string;
}

export interface Application {
  id: string; // applicationId
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  programmeId: string;
  programmeName: string;
  cohortId: string;
  cohortName: string;
  formId: string;
  formVersionId: string;
  formVersion: number;
  answers: Record<string, any>; // questionId -> response value (string, array, boolean, etc.)
  uploadedFiles?: Record<string, UploadedFileMeta[]>; // questionId -> uploaded files
  fieldSnapshots?: FormField[]; // Immutable snapshot of fields at submission time
  sectionSnapshots?: FormSection[]; // Immutable snapshot of sections at submission time
  status: ApplicationStatus;
  qualificationStatus?: QualificationStatus;
  assessmentStatus?: AssessmentStatus;
  admissionStatus?: AdmissionStatus;
  reviewNotes?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface NavigationItem {
  name: string;
  href: string;
  icon?: string;
  roles?: UserRole[];
  badge?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  timestamp: string;
}

// --- MODULE 8 ADMISSION WORKFLOW TYPES ---
export type InvitationStatus = 'INVITED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export interface AssessmentInvitation {
  id: string; // invitationId
  token: string; // Unique invitation access token e.g. "INV-98234-A7B"
  applicationId: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  assessmentId: string;
  assessmentTitle: string;
  programmeId: string;
  programmeName: string;
  cohortId?: string;
  cohortName?: string;
  status: InvitationStatus;
  passThresholdPercentage: number; // e.g. 70 (%)
  score?: number;
  maxScore?: number;
  percentage?: number;
  passed?: boolean;
  invitedAt: string;
  expiresAt?: string;
  completedAt?: string;
  invitedBy?: string;
  attemptId?: string;
  createdAt: string;
  updatedAt: string;
}

export type AdmissionDecisionType = 'ACCEPTED' | 'REJECTED' | 'WAITLISTED' | 'MANUAL_REVIEW' | 'PENDING';

export interface AdmissionDecision {
  id: string;
  applicationId: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  programmeId: string;
  programmeName: string;
  cohortId?: string;
  cohortName?: string;
  qualificationStatus: QualificationStatus;
  assessmentScore?: number;
  assessmentPercentage?: number;
  assessmentPassed?: boolean;
  passThreshold?: number;
  decision: AdmissionDecisionType;
  decisionBy?: string;
  decisionAt?: string;
  reviewNotes?: string;
  learnerAccountCreated: boolean; // MUST be false initially, set to true ONLY when decision is ACCEPTED
  learnerAccountId?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE';

export interface QuestionChoice {
  id: string;
  text: string;
}

export interface AssessmentQuestion {
  id: string;
  questionBankId?: string;
  text: string;
  explanation?: string;
  type: QuestionType;
  choices: QuestionChoice[];
  correctAnswerId: string; // choice.id or 'true'/'false'
  points: number; // default 1
  order?: number;
}

export interface QuestionBank {
  id: string;
  title: string;
  description?: string;
  programmeId?: string;
  programmeName?: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export type AssessmentAvailability = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface Assessment {
  id: string;
  title: string;
  description?: string;
  programmeId?: string;
  programmeName?: string;
  cohortId?: string;
  cohortName?: string;
  questionBankId?: string;
  questions: AssessmentQuestion[];
  durationMinutes: number; // Duration limit in minutes (0 = unlimited)
  passThresholdPercentage: number; // e.g. 70 (%)
  maxAttempts: number; // e.g. 1, 2, 3 or -1 for unlimited
  randomizeQuestions: boolean;
  randomizeChoices?: boolean;
  availability: AssessmentAvailability;
  availableFrom?: string;
  availableUntil?: string;
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
}

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'TIMED_OUT' | 'ABANDONED';

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  attemptNumber: number;
  startedAt: string;
  expiresAt?: string;
  submittedAt?: string;
  status: AttemptStatus;
  answers: Record<string, string>; // questionId -> chosen choiceId
  questionsOrder: string[]; // questionId sequence for this attempt
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- MODULE 9 LEARNER ENROLMENT TYPES ---
export interface LearnerProfile {
  id: string; // doc ID in learners collection
  learnerId: string; // Assigned human-readable Learner ID, e.g. "LRN-2026-00101"
  userId: string; // Firebase user UID
  email: string; // Normalized candidate email
  displayName: string;
  phoneNumber?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export type EnrolmentStatus = 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'WITHDRAWN';

export interface Enrolment {
  id: string; // doc ID in enrolments collection
  enrolmentCode: string; // Unique enrolment code e.g. "ENR-2026-98123"
  learnerId: string; // Assigned Learner ID (e.g. LRN-2026-00101)
  userId: string; // Firebase user UID
  userEmail: string;
  userName: string;
  applicationId: string;
  programmeId: string; // Link programme
  programmeName: string;
  cohortId: string; // Link cohort
  cohortName: string;
  status: EnrolmentStatus; // Activate learner dashboard
  enrolledAt: string;
  createdAt: string;
  updatedAt: string;
}

// --- MODULE 11 CURRICULUM MANAGEMENT TYPES ---
export type CurriculumResourceType = 'PDF' | 'document' | 'link' | 'video' | 'download';

export interface CurriculumResource {
  id: string;
  title: string;
  type: CurriculumResourceType;
  url: string;
  description?: string;
  fileSize?: string;
  downloadable?: boolean;
}

export interface CurriculumLesson {
  id: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  resources: CurriculumResource[];
  order: number;
}

export interface CurriculumWeek {
  id: string;
  weekNumber: number;
  title: string;
  description?: string;
  lessons: CurriculumLesson[];
}

export interface CurriculumModuleItem {
  id: string;
  programmeId: string;
  programmeName: string;
  title: string;
  code?: string;
  description?: string;
  order: number;
  weeks: CurriculumWeek[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}


