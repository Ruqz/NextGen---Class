/**
 * NextGen Class Platform Core Type Definitions
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

export type AccountType = 'APPLICANT' | 'LEARNER' | 'STAFF';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type StaffRole = 'PROGRAMME_MANAGER' | 'FACILITATOR' | 'ME' | 'ADMIN';

export interface UserRecord {
  id: string; // or uid
  firstName: string;
  lastName: string;
  email: string;
  accountType: AccountType;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  role?: UserRole;
}

export interface StaffProfile {
  userId: string;
  staffRole: StaffRole;
  permissions: string[];
  active: boolean;
  assignedProgrammeIds?: string[];
  assignedCohortIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  role: UserRole;
  accountType?: AccountType;
  accountStatus?: AccountStatus;
  firstName?: string;
  lastName?: string;
  assignedProgrammeIds?: string[];
  assignedCohortIds?: string[];
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
  | 'true_false'
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'checkbox'
  | 'rating'
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

export type FormCategory =
  | 'APPLICANT_APPLICATION'
  | 'APPLICANT_ASSESSMENT'
  | 'LEARNER_FEEDBACK'
  | 'PROGRAMME_FEEDBACK'
  | 'GENERAL_FORM'
  | 'OTHER';

export type CohortAssessmentState = 'DRAFT' | 'READY' | 'OPEN' | 'CLOSED';

export interface ParsedQuestionItem {
  id: string;
  text: string;
  type: FormFieldType | QuestionType | string;
  options?: string[];
  correctAnswer?: string; // or "NOT PROVIDED"
  marks: number;
  explanation?: string;
  section?: string;
  status: 'APPROVED' | 'NEEDS_REVIEW' | 'FLAGGED' | 'DUPLICATE';
  confidence: number;
  isDuplicate?: boolean;
  duplicateReason?: string;
  selectedForImport: boolean;
}

export interface QuestionBankUploadSummary {
  totalDetected: number;
  parsedSuccessfully: number;
  needsReview: number;
  couldNotParseCount: number;
  duplicateCount: number;
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
  // Assessment & Grading Properties
  correctAnswer?: string;
  points?: number; // Marks / Points
  explanation?: string;
  gradingMode?: 'auto' | 'manual';
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
}

export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';

export interface FormStudyResource {
  id: string;
  title: string;
  url: string;
  fileType?: string;
  requiredBeforeAssessment?: boolean;
  downloadAllowed?: boolean;
}

export interface ApplicationFormTemplate {
  id: string; // formId
  programmeId: string;
  programmeName?: string;
  cohortId?: string; // Optional: cohort override or specific form
  title: string;
  description?: string;
  category?: FormCategory;
  version: number;
  status: FormStatus;
  sections: FormSection[];
  fields: FormField[];
  // Assessment Specifications
  isAssessment?: boolean;
  durationMinutes?: number;
  passThresholdPercentage?: number;
  cohortAssessmentState?: CohortAssessmentState;
  studyResources?: FormStudyResource[];
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
export type LearnerAccessState =
  | 'Applicant'
  | 'Accepted'
  | 'Enrolled'
  | 'Active'
  | 'Suspended'
  | 'Completed'
  | 'Withdrawn';

export interface LearnerProfile {
  id: string; // doc ID in learners collection
  learnerId: string; // Assigned human-readable Learner ID, e.g. "NGP-2026-00452"
  userId: string; // Firebase user UID
  email: string; // Normalized candidate email
  displayName: string;
  phoneNumber?: string;
  programmeId?: string;
  programmeName?: string;
  cohortId?: string;
  cohortName?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'SUSPENDED';
  accessState?: LearnerAccessState;
  isActivated: boolean; // Must be true for learner dashboard access
  activatedAt?: string;
  temporaryPassword?: string;
  createdAt: string;
  updatedAt: string;
}

export type EnrolmentStatus = 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'WITHDRAWN' | 'PENDING_ACTIVATION';

export interface Enrolment {
  id: string; // doc ID in enrolments collection
  enrolmentCode: string; // Unique enrolment code e.g. "ENR-2026-98123"
  learnerId: string; // Assigned Learner ID (e.g. NGP-2026-00452)
  userId: string; // Firebase user UID
  userEmail: string;
  userName: string;
  applicationId: string;
  programmeId: string; // Link programme
  programmeName: string;
  cohortId: string; // Link cohort
  cohortName: string;
  status: EnrolmentStatus; // 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'WITHDRAWN' | 'PENDING_ACTIVATION'
  accessState?: LearnerAccessState;
  isActivated?: boolean;
  activatedAt?: string;
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

// --- MODULE 13 ATTENDANCE TYPES ---
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

export interface AttendanceRecord {
  id: string; // doc ID in attendance records collection
  classSessionId: string; // Link class session
  classSessionTitle: string;
  classSessionDate: string;
  programmeId: string;
  programmeName: string;
  cohortId: string;
  cohortName: string;
  learnerId: string; // Learner ID e.g. LRN-2026-00101
  userId: string; // Firebase user UID
  learnerName: string;
  learnerEmail: string;
  status: AttendanceStatus;
  notes?: string;
  markedBy: string; // Facilitator / PM email or UID
  markedByName?: string;
  markedAt: string; // ISO date string
  updatedAt: string;
  correctionReason?: string;
  correctedBy?: string;
  correctedAt?: string;
}

export interface AttendanceThresholdConfig {
  id?: string;
  warningThresholdPercentage: number; // e.g. 80 (%)
  criticalThresholdPercentage: number; // e.g. 75 (%)
  lateWeightPercentage: number; // e.g. 50 (%) -> LATE grants 0.5 attendance credit
  updatedAt: string;
  updatedBy?: string;
}

export interface LearnerAttendanceSummary {
  learnerId: string;
  userId: string;
  learnerName: string;
  learnerEmail: string;
  totalClasses: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendancePercentage: number;
  riskLevel: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface ClassAttendanceSummary {
  classSessionId: string;
  classTitle: string;
  classDate: string;
  programmeId: string;
  programmeName: string;
  cohortId: string;
  cohortName: string;
  totalEnrolled: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendancePercentage: number;
}

// --- MODULE 14 ASSIGNMENTS TYPES ---
export type AssignmentStatusType = 'SUBMITTED' | 'LATE' | 'GRADED' | 'MISSING';

export interface AssignmentItem {
  id: string;
  programmeId: string;
  programmeName: string;
  cohortId?: string;
  cohortName?: string;
  title: string;
  description: string;
  instructions?: string;
  dueDate: string; // ISO date string e.g. 2026-08-20T23:59:00Z
  totalPoints: number;
  moduleName?: string;
  weekNumber?: number;
  allowResubmission: boolean;
  allowedFileTypes?: string[];
  maxFileSizeBytes?: number;
  attachmentUrl?: string;
  attachmentName?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionHistoryItem {
  submittedAt: string;
  submissionText: string;
  submissionUrl?: string;
  attachmentName?: string;
  attachmentUrl?: string;
}

export interface AssignmentSubmissionItem {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  programmeId?: string;
  programmeName?: string;
  cohortId?: string;
  cohortName?: string;
  learnerId: string;
  userId: string;
  userEmail: string;
  userName: string;
  submissionText: string;
  submissionUrl?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  fileSizeBytes?: number;
  submittedAt: string;
  dueDateAtSubmission?: string;
  isLate: boolean;
  status: AssignmentStatusType;
  score?: number;
  maxScore?: number;
  feedback?: string;
  gradedBy?: string;
  gradedByName?: string;
  gradedAt?: string;
  resubmissionCount: number;
  history?: SubmissionHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

// --- MODULE 15 LEARNER FEEDBACK TYPES ---
export type FeedbackQuestionType =
  | 'rating'
  | 'multiple_choice'
  | 'text'
  | 'satisfaction'
  | 'instructor_feedback'
  | 'class_feedback'
  | 'confidence'
  | 'understanding'
  | 'suggestions';

export interface FeedbackQuestion {
  id: string;
  questionText: string;
  questionType: FeedbackQuestionType;
  required: boolean;
  options?: string[]; // for multiple_choice
  placeholder?: string;
}

export interface FeedbackFormItem {
  id: string;
  title: string;
  description: string;
  programmeId: string;
  programmeName: string;
  cohortId?: string;
  cohortName?: string;
  classSessionId?: string;
  classSessionTitle?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  dueDate?: string;
  questions: FeedbackQuestion[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionResponseItem {
  questionId: string;
  questionText: string;
  questionType: FeedbackQuestionType;
  ratingValue?: number; // 1 to 5
  textValue?: string;
  selectedOption?: string;
}

export interface FeedbackResponseSubmission {
  id: string;
  formId: string;
  formTitle: string;
  programmeId: string;
  programmeName: string;
  cohortId?: string;
  cohortName?: string;
  learnerId: string;
  userId: string;
  userName: string;
  userEmail: string;
  submittedAt: string;
  responses: QuestionResponseItem[];
  overallSatisfaction?: number;
  instructorRating?: number;
  confidenceScore?: number;
  understandingScore?: number;
}

// --- MODULE 16 PROGRESS ENGINE TYPES ---
export type ProgressStatusType = 'ON_TRACK' | 'AT_RISK' | 'CRITICAL' | 'COMPLETED';

export interface ProgressRuleConfig {
  id: string;
  programmeId: string; // 'ALL' or specific programme ID
  programmeName?: string;
  attendanceWeight: number; // e.g. 20 (percent)
  assignmentsWeight: number; // e.g. 25
  assessmentsWeight: number; // e.g. 20
  finalAssessmentWeight: number; // e.g. 15
  finalProjectWeight: number; // e.g. 20
  completedThreshold: number; // e.g. 80
  onTrackThreshold: number; // e.g. 70
  atRiskThreshold: number; // e.g. 50
  updatedAt: string;
  updatedBy?: string;
}

export interface LearnerProgressScore {
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  programmeId: string;
  programmeName: string;
  cohortId?: string;
  cohortName?: string;
  attendanceScore: number; // 0-100%
  assignmentsScore: number; // 0-100%
  assessmentsScore: number; // 0-100%
  finalAssessmentScore: number; // 0-100%
  finalProjectScore: number; // 0-100%
  overallWeightedScore: number; // 0-100%
  status: ProgressStatusType;
  lastCalculatedAt: string;
}

// --- MODULE 18 FINAL PROJECT TYPES ---
export interface FinalProjectConfig {
  id: string; // programmeId
  programmeId: string;
  programmeName: string;
  title: string;
  description: string;
  requirements: string;
  dueDate?: string;
  maxGrade: number; // e.g. 100
  passingGrade: number; // e.g. 70
  deliverableTypes: ('url' | 'files' | 'description')[];
  updatedAt: string;
  updatedBy?: string;
}

export interface FinalProjectAttachment {
  name: string;
  url: string;
  size?: string;
}

export type FinalProjectStatus = 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';

export interface FinalProjectSubmission {
  id: string; // ${programmeId}_${learnerId}
  programmeId: string;
  programmeName: string;
  cohortId?: string;
  cohortName?: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  description: string;
  repositoryUrl?: string;
  liveDemoUrl?: string;
  attachments?: FinalProjectAttachment[];
  submittedAt: string;
  updatedAt: string;
  status: FinalProjectStatus;
  grade?: number;
  facilitatorFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approved?: boolean;
}

// --- MODULE 20 NOTIFICATION SERVICE ARCHITECTURE TYPES ---
export type NotificationEventType =
  | 'application_received'
  | 'qualified'
  | 'assessment_invitation'
  | 'assessment_reminder'
  | 'acceptance'
  | 'rejection'
  | 'enrolment'
  | 'class_reminder'
  | 'assignment_reminder'
  | 'feedback_reminder'
  | 'certificate_issued';

export type NotificationChannel = 'EMAIL' | 'WHATSAPP' | 'IN_APP' | 'SMS';

export type NotificationDeliveryStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'FAILED'
  | 'BOUNCED';

export interface NotificationTemplate {
  id: string;
  event: NotificationEventType;
  channel: NotificationChannel;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  whatsAppText?: string;
  variables: string[];
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface NotificationLog {
  id: string;
  event: NotificationEventType;
  channel: NotificationChannel;
  recipientId?: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone?: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  variables: Record<string, string | number>;
  status: NotificationDeliveryStatus;
  providerName: string;
  providerMessageId?: string;
  error?: string;
  retryCount: number;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface NotificationProviderConfig {
  id: string;
  channel: NotificationChannel;
  name: string;
  isEnabled: boolean;
  isDefault: boolean;
  settings: {
    senderEmail?: string;
    senderName?: string;
    replyTo?: string;
    apiKey?: string;
    apiUrl?: string;
    whatsappPhoneNumberId?: string;
    whatsappBusinessAccountId?: string;
    webhookUrl?: string;
    [key: string]: any;
  };
  updatedAt: string;
}

export interface SendNotificationPayload {
  event: NotificationEventType;
  channel?: NotificationChannel;
  recipientId?: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone?: string;
  variables?: Record<string, string | number>;
  customSubject?: string;
  customBody?: string;
  customBodyHtml?: string;
  metadata?: Record<string, any>;
}

export interface NotificationDeliveryResult {
  success: boolean;
  logId: string;
  status: NotificationDeliveryStatus;
  providerName: string;
  messageId?: string;
  error?: string;
}

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type InterventionOutcome = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';

export interface RiskRuleConfig {
  id: string; // e.g. programmeId or 'DEFAULT'
  programmeId: string;
  programmeName?: string;
  attendanceMinThreshold: number; // e.g. 80 (%)
  missedAssignmentsMaxThreshold: number; // e.g. 2
  assessmentScoreMinThreshold: number; // e.g. 70 (%)
  inactivityDaysMaxThreshold: number; // e.g. 7 (days)
  updatedAt: string;
  updatedBy?: string;
}

export interface FlaggedAtRiskLearner {
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  programmeId: string;
  programmeName: string;
  cohortId?: string;
  cohortName?: string;
  riskLevel: RiskLevel;
  reasons: string[];
  attendancePercent: number;
  missedAssignmentsCount: number;
  avgAssessmentScore: number;
  lastActiveDate: string;
  daysInactive: number;
  flaggedAt: string;
  hasActiveIntervention?: boolean;
}

export interface InterventionRecord {
  id: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  programmeId: string;
  programmeName: string;
  cohortId?: string;
  cohortName?: string;
  reason: string;
  riskLevel: RiskLevel;
  action: string;
  assignedStaffId: string;
  assignedStaffName: string;
  assignedStaffRole: string;
  followUpDate: string;
  outcome: InterventionOutcome;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// --- MODULE 21 MONITORING & EVALUATION (M&E) TYPES ---
export type MEIndicatorCode =
  | 'participation'
  | 'attendance'
  | 'progression'
  | 'assignment_completion'
  | 'assessment_performance'
  | 'completion'
  | 'graduation'
  | 'certification'
  | 'learner_satisfaction'
  | 'instructor_rating'
  | 'projects_completed'
  | string;

export type MEIndicatorCategory =
  | 'ENGAGEMENT'
  | 'ACADEMIC'
  | 'OUTCOMES'
  | 'FEEDBACK'
  | 'PROJECTS';

export type MEIndicatorStatus = 'EXCEEDING' | 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';

export interface MEIndicatorConfig {
  id: string; // indicator code or generated ID
  code: MEIndicatorCode;
  name: string;
  category: MEIndicatorCategory;
  description: string;
  targetBenchmark: number; // e.g. 85 (%) or 4.2 (out of 5)
  warningThreshold: number; // e.g. 70 (%) or 3.5 (out of 5)
  criticalThreshold: number; // e.g. 50 (%) or 2.5 (out of 5)
  unit: '%' | 'score' | 'rating' | 'count';
  weight: number; // Weight in overall M&E health index (e.g. 10%)
  higherIsBetter: boolean;
  isActive: boolean;
  programmeId?: string; // 'ALL' or specific programmeId
  cohortId?: string; // 'ALL' or specific cohortId
  formulaExplanation: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface MEIndicatorCalculatedResult {
  config: MEIndicatorConfig;
  actualValue: number; // e.g. 87.5
  targetValue: number; // e.g. 85.0
  variance: number; // actualValue - targetValue (e.g. +2.5)
  status: MEIndicatorStatus;
  sampleSize: number; // number of learners or records evaluated
  numerator?: number;
  denominator?: number;
  displayValue: string; // e.g. "87.5%" or "4.3 / 5.0"
  displayTarget: string; // e.g. "85.0%" or "4.0 / 5.0"
  achievementRate: number; // (actual / target) * 100
  learnersMeetingTargetCount?: number;
  learnersLaggingCount?: number;
  notes?: string;
}

export interface MELearnerEvaluationRow {
  learnerId: string;
  userId: string;
  learnerName: string;
  learnerEmail: string;
  programmeId: string;
  programmeName: string;
  cohortId: string;
  cohortName: string;
  enrolmentStatus: string;
  
  // 11 Core Indicator Values for this learner
  participationRate: number; // % (0-100)
  attendanceRate: number; // % (0-100)
  progressionScore: number; // % (0-100)
  assignmentCompletionRate: number; // % (0-100)
  assessmentAverageScore: number; // % (0-100)
  isCompleted: boolean; // boolean
  isGraduated: boolean; // boolean
  hasCertificate: boolean; // boolean
  satisfactionRating?: number; // 1-5 or 0-100%
  instructorRating?: number; // 1-5 or 0-100%
  projectCompleted: boolean; // boolean
  projectScore?: number; // 0-100
  
  // Overall M&E Index
  overallMEIndex: number; // % (0-100)
  performanceTier: 'EXEMPLARY' | 'ON_TRACK' | 'NEEDS_SUPPORT' | 'CRITICAL';
  lastActivityDate?: string;
}

export interface MECohortComparisonItem {
  cohortId: string;
  cohortName: string;
  programmeId: string;
  programmeName: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  totalEnrolled: number;
  activeLearners: number;
  healthScore: number;
  indicators: Record<string, { actual: number; target: number; status: MEIndicatorStatus }>;
  completionCount: number;
  graduationCount: number;
  certifiedCount: number;
}

export interface MEDashboardMetrics {
  totalProgrammesEvaluated: number;
  totalCohortsEvaluated: number;
  totalLearnersEvaluated: number;
  overallHealthScore: number; // Weighted composite of all active indicators
  indicators: MEIndicatorCalculatedResult[];
  categoryScores: Record<MEIndicatorCategory, { score: number; count: number }>;
  cohortsComparison: MECohortComparisonItem[];
  learnerRows: MELearnerEvaluationRow[];
  calculatedAt: string;
}

// --- MODULE 22 REPORTING TYPES ---
export type ReportType =
  | 'COHORT'
  | 'PROGRAMME'
  | 'LEARNER'
  | 'ATTENDANCE'
  | 'ASSESSMENT'
  | 'ASSIGNMENT'
  | 'COMPLETION'
  | 'CERTIFICATION'
  | 'ME'
  | 'IMPACT_DONOR';

export type LearnerSegmentFilter =
  | 'ALL'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'AT_RISK'
  | 'HIGH_PERFORMER'
  | 'FEMALE'
  | 'MALE'
  | 'YOUTH'
  | 'JOB_SEEKER';

export type ReportDatePreset =
  | 'ALL'
  | 'THIS_MONTH'
  | 'LAST_30_DAYS'
  | 'THIS_QUARTER'
  | 'THIS_YEAR'
  | 'CUSTOM';

export interface ReportFilterParams {
  programmeId: string; // 'ALL' or specific ID
  cohortId: string; // 'ALL' or specific ID
  datePreset: ReportDatePreset;
  startDate?: string;
  endDate?: string;
  learnerSegment: LearnerSegmentFilter;
  searchKeyword?: string;
}

export interface ReportKPICard {
  label: string;
  value: string | number;
  subtext?: string;
  change?: string;
  status?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export interface ReportColumn {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'number' | 'percent' | 'badge' | 'date';
  width?: string;
}

export interface ReportVisualBreakdown {
  title: string;
  type: 'distribution' | 'progress' | 'grid';
  items: {
    label: string;
    value: number;
    total?: number;
    percentage?: number;
    color?: string;
  }[];
}

export interface GeneratedReportData {
  id: string;
  reportType: ReportType;
  title: string;
  subtitle: string;
  generatedAt: string;
  generatedBy?: string;
  filtersApplied: {
    programmeName: string;
    cohortName: string;
    dateRangeLabel: string;
    segmentLabel: string;
  };
  filterParams: ReportFilterParams;
  totalRecordsCount: number;
  kpis: ReportKPICard[];
  visualBreakdowns?: ReportVisualBreakdown[];
  columns: ReportColumn[];
  rows: Record<string, any>[];
  summaryInsights: string[];
}

// --- MODULE 23 GEMINI AI LAYER TYPES ---

export type AIOperationType =
  | 'QUESTION_GENERATION'
  | 'STUDY_ASSISTANT'
  | 'LEARNER_SUPPORT'
  | 'ASSISTED_FEEDBACK'
  | 'REPORT_SYNTHESIS';

export type AIAssessmentDraftStatus = 'DRAFT_AI_GENERATED' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';

export interface AIAssessmentQuestionDraft {
  id: string;
  questionBankId?: string;
  programmeId?: string;
  programmeName?: string;
  moduleName?: string;
  topic?: string;
  text: string;
  type: QuestionType;
  choices: QuestionChoice[];
  correctAnswerId: string;
  explanation: string;
  points: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  sourceResourceRef?: string;
  status: AIAssessmentDraftStatus;
  generatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export type AIStudyMode = 'explain' | 'quiz' | 'flashcards' | 'plan' | 'general';

export interface AIStudyChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  mode?: AIStudyMode;
  timestamp: string;
  quizData?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  flashcards?: {
    front: string;
    back: string;
  }[];
}

export interface AISupportEscalationTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  programmeId?: string;
  programmeName?: string;
  cohortId?: string;
  cohortName?: string;
  category: 'TECHNICAL' | 'ACADEMIC' | 'ATTENDANCE' | 'GRIEVANCE' | 'ADMINISTRATIVE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  fullConversationSnippet?: string;
  status: 'OPEN' | 'ASSIGNED' | 'RESOLVED';
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface AISupportChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  escalationProposal?: {
    needed: boolean;
    category: 'TECHNICAL' | 'ACADEMIC' | 'ATTENDANCE' | 'GRIEVANCE' | 'ADMINISTRATIVE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    summary: string;
  };
}

export interface AIRubricCriterionScore {
  criterion: string;
  score: number;
  maxScore: number;
  comments: string;
}

export interface AIAssistedFeedbackResult {
  draftFeedback: string;
  strengths: string[];
  growthAreas: string[];
  suggestedScore: number;
  rubricBreakdown: AIRubricCriterionScore[];
  disclaimer: string;
  generatedAt: string;
}

export interface AIReportSynthesisResult {
  executiveSummary: string;
  keyStrengths: string[];
  detectedAnomaliesOrRisks: string[];
  donorImpactNarrative: string;
  pedagogicalRecommendations: string[];
  operationalNextSteps: string[];
  generatedAt: string;
}

export interface AIAuditLogEntry {
  id: string;
  operationType: AIOperationType;
  model: string;
  userId: string;
  userName: string;
  userRole: string;
  programmeId?: string;
  programmeName?: string;
  promptSummary: string;
  sanitizedTokensEstimate: number;
  status: 'SUCCESS' | 'ERROR' | 'FLAGGED';
  humanApprovalRequired: boolean;
  humanApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_APPLICABLE';
  details?: Record<string, any>;
  timestamp: string;
}








