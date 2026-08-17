import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  generateAIAssessmentQuestions,
  subscribeToAIDraftQuestions,
  approveAIDraftQuestion,
  rejectAIDraftQuestion,
  generateAIAssistedFeedback,
  generateAIReportSynthesis,
  subscribeToAIAuditLogs,
  subscribeToAIEscalationTickets,
  resolveAIEscalationTicket,
} from '../services/ai';
import { getProgrammes, getCohorts } from '../services/programmes';
import { getQuestionBanks, addQuestionToBank } from '../services/assessments';
import { subscribeToLearnerCurriculum } from '../services/curriculum';
import {
  AIAssessmentQuestionDraft,
  AIAuditLogEntry,
  AISupportEscalationTicket,
  AIAssistedFeedbackResult,
  AIReportSynthesisResult,
  Programme,
  Cohort,
  QuestionBank,
  CurriculumModuleItem,
} from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Sparkles,
  ShieldCheck,
  BrainCircuit,
  FileQuestion,
  ClipboardList,
  FileSpreadsheet,
  LifeBuoy,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Download,
  Plus,
  Edit3,
  BookOpen,
  Layers,
  Award,
  Users,
  Eye,
  Check,
  RotateCcw,
  Sliders,
  HelpCircle,
  Filter,
} from 'lucide-react';

export const PMAICenter: React.FC = () => {
  const { userProfile, activeRole } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'questions' | 'feedback' | 'reporting' | 'audit' | 'escalations'
  >('questions');

  // Common Data States
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [curriculumModules, setCurriculumModules] = useState<CurriculumModuleItem[]>([]);

  // 1. AI Question Generator States
  const [draftQuestions, setDraftQuestions] = useState<AIAssessmentQuestionDraft[]>([]);
  const [selectedProgId, setSelectedProgId] = useState<string>('');
  const [selectedModuleName, setSelectedModuleName] = useState<string>('');
  const [selectedTopics, setSelectedTopics] = useState<string>('');
  const [approvedResourcesText, setApprovedResourcesText] = useState<string>('');
  const [genCount, setGenCount] = useState<number>(5);
  const [genDifficulty, setGenDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [genType, setGenType] = useState<'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MIXED'>('MULTIPLE_CHOICE');
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<boolean>(false);
  const [questionFilterStatus, setQuestionFilterStatus] = useState<string>('ALL');

  // Review Question Modal
  const [reviewingDraft, setReviewingDraft] = useState<AIAssessmentQuestionDraft | null>(null);
  const [reviewTargetBankId, setReviewTargetBankId] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // 2. AI Feedback Co-Pilot States
  const [fbAssignmentTitle, setFbAssignmentTitle] = useState<string>('Full-Stack API Design & Deployment Lab');
  const [fbInstructions, setFbInstructions] = useState<string>(
    'Develop a secure TypeScript Express backend with input validation, error handling, database persistence, and pass all automated tests.'
  );
  const [fbSubmissionText, setFbSubmissionText] = useState<string>(
    'I completed the project using Node.js and Express. Implemented the user authentication routes and Firestore database connector. Added custom middleware for error handling, verified all unit tests with 100% pass rate. Included Postman test suite in the repo.'
  );
  const [fbSubmissionUrl, setFbSubmissionUrl] = useState<string>('https://github.com/nextgen-learner/api-lab');
  const [fbMaxScore, setFbMaxScore] = useState<number>(100);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState<boolean>(false);
  const [generatedFeedback, setGeneratedFeedback] = useState<AIAssistedFeedbackResult | null>(null);

  // 3. AI Reporting Synthesis States
  const [repType, setRepType] = useState<string>('COHORT_REPORT');
  const [repTitle, setRepTitle] = useState<string>('Cohort 2: Generative AI & Automation Mid-Term Review');
  const [repAudience, setRepAudience] = useState<'leadership' | 'donors' | 'm_and_e'>('leadership');
  const [isSynthesizingReport, setIsSynthesizingReport] = useState<boolean>(false);
  const [reportSynthesis, setReportSynthesis] = useState<AIReportSynthesisResult | null>(null);

  // 4. Audit Log States
  const [auditLogs, setAuditLogs] = useState<AIAuditLogEntry[]>([]);

  // 5. Support Escalation Tickets
  const [escalations, setEscalations] = useState<AISupportEscalationTicket[]>([]);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Initial Data Fetch & Subscriptions
  useEffect(() => {
    getProgrammes().then((p) => {
      setProgrammes(p);
      if (p.length > 0) {
        setSelectedProgId(p[0].id);
      }
    });
    getCohorts().then(setCohorts);
    getQuestionBanks().then(setQuestionBanks);

    const unsubDrafts = subscribeToAIDraftQuestions(setDraftQuestions);
    const unsubAudit = subscribeToAIAuditLogs(setAuditLogs);
    const unsubEscalations = subscribeToAIEscalationTickets(setEscalations);

    return () => {
      unsubDrafts();
      unsubAudit();
      unsubEscalations();
    };
  }, []);

  // Fetch Curriculum Modules when programme changes
  useEffect(() => {
    if (selectedProgId) {
      const unsubCurr = subscribeToLearnerCurriculum(selectedProgId, (modules) => {
        setCurriculumModules(modules);
        if (modules.length > 0) {
          setSelectedModuleName(modules[0].title);
          setSelectedTopics(modules[0].weeks?.map((w) => w.title).join('\n') || 'Core concepts');
          setApprovedResourcesText(
            modules[0].weeks
              ?.flatMap((w) => w.lessons?.map((l) => `${l.title}: ${l.description || 'Approved syllabus topic'}`))
              .join('\n') || 'Approved curriculum syllabus specification'
          );
        }
      });
      return () => unsubCurr();
    }
  }, [selectedProgId]);

  // Handle Module Selection Change
  const handleModuleSelect = (modId: string) => {
    const found = curriculumModules.find((m) => m.id === modId);
    if (found) {
      setSelectedModuleName(found.title);
      setSelectedTopics(found.weeks?.map((w) => w.title).join('\n') || 'Core concepts');
      setApprovedResourcesText(
        found.weeks
          ?.flatMap((w) => w.lessons?.map((l) => `${l.title}: ${l.description || 'Approved syllabus topic'}`))
          .join('\n') || 'Approved curriculum syllabus specification'
      );
    }
  };

  // 1. Trigger AI Question Generation
  const handleGenerateQuestions = async () => {
    const currentProg = programmes.find((p) => p.id === selectedProgId);
    setIsGeneratingQuestions(true);
    setNotification(null);

    try {
      const res = await generateAIAssessmentQuestions({
        programmeId: selectedProgId || 'GENERAL',
        programmeName: currentProg?.name || 'Programme Course',
        moduleName: selectedModuleName || 'Core Module',
        topics: selectedTopics,
        approvedResourceContent: approvedResourcesText,
        questionCount: genCount,
        difficulty: genDifficulty,
        questionType: genType,
        userUid: userProfile?.uid || 'staff-admin',
        userName: userProfile?.displayName || 'Administrator',
        userRole: activeRole,
      });

      setNotification({
        type: 'success',
        message: `Successfully generated ${res.questions.length} questions in DRAFT mode. Human approval required before activating in question banks.`,
      });
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to generate assessment questions with AI',
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // 1b. Approve Draft Question
  const handleApproveDraft = async () => {
    if (!reviewingDraft) return;
    setIsApproving(true);

    try {
      // 1. Mark as approved in drafts collection
      await approveAIDraftQuestion(
        reviewingDraft.id,
        userProfile?.displayName || 'Administrator',
        reviewNotes
      );

      // 2. If a question bank is selected, directly add to that Question Bank
      if (reviewTargetBankId) {
        await addQuestionToBank(reviewTargetBankId, {
          text: reviewingDraft.text,
          type: reviewingDraft.type,
          choices: reviewingDraft.choices,
          correctAnswerId: reviewingDraft.correctAnswerId,
          explanation: reviewingDraft.explanation,
          points: reviewingDraft.points,
        });
      }

      setNotification({
        type: 'success',
        message: `Question approved! ${reviewTargetBankId ? 'Added to selected Question Bank.' : ''}`,
      });
      setReviewingDraft(null);
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to approve question draft',
      });
    } finally {
      setIsApproving(false);
    }
  };

  // 1c. Reject Draft Question
  const handleRejectDraft = async (draftId: string) => {
    try {
      await rejectAIDraftQuestion(
        draftId,
        userProfile?.displayName || 'Administrator',
        'Rejected by administrator review.'
      );
      setNotification({
        type: 'success',
        message: 'Question draft marked as Rejected.',
      });
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to reject question draft',
      });
    }
  };

  // 2. Trigger AI-Assisted Feedback
  const handleGenerateFeedback = async () => {
    setIsGeneratingFeedback(true);
    setNotification(null);

    try {
      const res = await generateAIAssistedFeedback({
        assignmentTitle: fbAssignmentTitle,
        assignmentInstructions: fbInstructions,
        submissionText: fbSubmissionText,
        submissionUrl: fbSubmissionUrl,
        maxScore: fbMaxScore,
        evaluatorId: userProfile?.uid || 'evaluator-1',
        evaluatorName: userProfile?.displayName || 'Facilitator',
      });
      setGeneratedFeedback(res);
      setNotification({
        type: 'success',
        message: 'AI Feedback Co-Pilot draft generated successfully! Review and edit before issuing to student.',
      });
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to generate feedback co-pilot draft',
      });
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  // 3. Trigger AI Report Synthesis
  const handleSynthesizeReport = async () => {
    setIsSynthesizingReport(true);
    setNotification(null);

    try {
      const res = await generateAIReportSynthesis({
        reportType: repType,
        reportTitle: repTitle,
        audience: repAudience,
        filterContext: { programme: 'All Cohorts', period: 'Current Term' },
        kpis: [
          { label: 'Completion Rate', value: '88.4%', change: '+4.2%' },
          { label: 'Attendance Average', value: '92.1%', change: '+1.5%' },
          { label: 'Female Representation', value: '54.0%', change: '+6.0%' },
          { label: 'Assessment Mastery', value: '84.8%', change: '+3.1%' },
        ],
        summaryMetrics: {
          totalEnrolled: 120,
          onTrackCount: 104,
          atRiskCount: 6,
          graduatedCount: 88,
          employmentPlacementRate: '78%',
        },
        userUid: userProfile?.uid || 'pm-user',
        userName: userProfile?.displayName || 'Programme Director',
        userRole: activeRole,
      });

      setReportSynthesis(res);
      setNotification({
        type: 'success',
        message: 'AI Executive Synthesis generated with donor impact narrative and recommendations!',
      });
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to synthesize report with AI',
      });
    } finally {
      setIsSynthesizingReport(false);
    }
  };

  // Filtered Draft Questions
  const filteredDrafts = draftQuestions.filter((d) => {
    if (questionFilterStatus === 'ALL') return true;
    return d.status === questionFilterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-600/30">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-orange-600/30 text-orange-400 border border-orange-500/30 px-2.5 py-0.5 rounded-full">
                Module 23 • Gemini AI Layer
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Human-in-the-Loop & Privacy Preserving
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">AI Operations & Governance Center</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Deterministic question generator, facilitator feedback co-pilot, executive report synthesizer, and compliance ledger.
            </p>
          </div>
        </div>

        {/* Governance Badges */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Model: <strong>gemini-3.7-flash</strong>
          </div>
          <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Server-Side Secured
          </div>
        </div>
      </div>

      {/* Global Notification */}
      {notification && (
        <Alert
          variant={notification.type === 'success' ? 'success' : 'danger'}
          title={notification.type === 'success' ? 'Operation Completed' : 'AI Error'}
        >
          {notification.message}
        </Alert>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'questions'
              ? 'border-orange-600 text-orange-600 bg-orange-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileQuestion className="w-4 h-4" />
          <span>1. Question Generator & Approval Queue</span>
          {draftQuestions.filter((d) => d.status === 'DRAFT_AI_GENERATED').length > 0 && (
            <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-full">
              {draftQuestions.filter((d) => d.status === 'DRAFT_AI_GENERATED').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'feedback'
              ? 'border-orange-600 text-orange-600 bg-orange-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>2. Feedback Co-Pilot</span>
        </button>

        <button
          onClick={() => setActiveTab('reporting')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'reporting'
              ? 'border-orange-600 text-orange-600 bg-orange-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>3. Report Synthesizer</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-orange-600 text-orange-600 bg-orange-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>4. AI Governance & Audit Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('escalations')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'escalations'
              ? 'border-orange-600 text-orange-600 bg-orange-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          <span>5. Support Escalations</span>
          {escalations.filter((e) => e.status === 'OPEN').length > 0 && (
            <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded-full">
              {escalations.filter((e) => e.status === 'OPEN').length}
            </span>
          )}
        </button>
      </div>

      {/* ----------------------------------------------------
          TAB 1: AI QUESTION GENERATOR & APPROVAL QUEUE
      ---------------------------------------------------- */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Rules Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">Approved Resources & Human Verification Mandate</p>
              <p className="text-amber-800 mt-0.5">
                AI assessment questions are strictly grounded in verified syllabus topics and approved learning materials.
                All generated questions are marked as <strong>DRAFT_AI_GENERATED</strong> and require a human administrator to review and approve them before they can be activated into live assessments.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Generator Form */}
            <Card className="p-5 border-slate-200 shadow-xs lg:col-span-1 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-600" /> Generate Questions from Curriculum
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select approved programme resources to generate objective test items.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Programme</label>
                <select
                  value={selectedProgId}
                  onChange={(e) => setSelectedProgId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:bg-white"
                >
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Approved Curriculum Module</label>
                <select
                  onChange={(e) => handleModuleSelect(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:bg-white"
                >
                  {curriculumModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Syllabus Topics</label>
                <textarea
                  rows={2}
                  value={selectedTopics}
                  onChange={(e) => setSelectedTopics(e.target.value)}
                  placeholder="Enter specific topics to cover..."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Approved Source Content Reference</label>
                <textarea
                  rows={4}
                  value={approvedResourcesText}
                  onChange={(e) => setApprovedResourcesText(e.target.value)}
                  placeholder="Paste or inspect syllabus text that AI must strictly ground its questions upon..."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Count</label>
                  <select
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2"
                  >
                    <option value={3}>3 Items</option>
                    <option value={5}>5 Items</option>
                    <option value={10}>10 Items</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={genDifficulty}
                    onChange={(e) => setGenDifficulty(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Format</label>
                  <select
                    value={genType}
                    onChange={(e) => setGenType(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2"
                  >
                    <option value="MULTIPLE_CHOICE">MCQ</option>
                    <option value="TRUE_FALSE">T/F</option>
                  </select>
                </div>
              </div>

              <Button
                onClick={handleGenerateQuestions}
                disabled={isGeneratingQuestions || !approvedResourcesText.trim()}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
              >
                {isGeneratingQuestions ? (
                  <>
                    <Spinner size="sm" />
                    <span>Grounded Generation in Progress...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate AI Question Drafts</span>
                  </>
                )}
              </Button>
            </Card>

            {/* Right: Question Drafts Approval Queue */}
            <Card className="p-5 border-slate-200 shadow-xs lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-orange-600" /> Human Administrator Review & Approval Queue
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review deterministic answers, edit point values, and approve before activation.
                  </p>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Filter:</span>
                  <select
                    value={questionFilterStatus}
                    onChange={(e) => setQuestionFilterStatus(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1"
                  >
                    <option value="ALL">All Drafts ({draftQuestions.length})</option>
                    <option value="DRAFT_AI_GENERATED">Pending Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              {filteredDrafts.length === 0 ? (
                <EmptyState
                  title="No Questions in Queue"
                  description="Use the generator on the left to create curriculum-grounded assessment questions."
                />
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredDrafts.map((draft, idx) => {
                    const isPending = draft.status === 'DRAFT_AI_GENERATED';
                    return (
                      <div
                        key={draft.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isPending
                            ? 'bg-amber-50/40 border-amber-200'
                            : draft.status === 'APPROVED'
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">#{idx + 1}</span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isPending
                                  ? 'bg-amber-200 text-amber-900'
                                  : draft.status === 'APPROVED'
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : 'bg-red-200 text-red-900'
                              }`}
                            >
                              {draft.status === 'DRAFT_AI_GENERATED' ? 'Pending Admin Approval' : draft.status}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                              {draft.type} • {draft.points} pts
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                              Module: {draft.moduleName}
                            </span>
                          </div>

                          {isPending && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setReviewingDraft(draft);
                                  setReviewNotes('');
                                  if (questionBanks.length > 0) {
                                    setReviewTargetBankId(questionBanks[0].id);
                                  }
                                }}
                                className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Review & Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectDraft(draft.id)}
                                className="text-red-600 hover:bg-red-50 text-xs px-2.5 py-1 rounded-lg"
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                          {draft.text}
                        </p>

                        {/* Choices list */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                          {(draft.choices || []).map((c) => {
                            const isCorrect = c.id === draft.correctAnswerId;
                            return (
                              <div
                                key={c.id}
                                className={`text-xs p-2 rounded-lg border flex items-center gap-2 ${
                                  isCorrect
                                    ? 'bg-emerald-100/60 border-emerald-300 text-emerald-950 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {isCorrect ? '✓' : '•'}
                                </span>
                                <span>{c.text}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation Rationale */}
                        <div className="bg-slate-100/70 p-2.5 rounded-lg text-[11px] text-slate-700 flex items-start gap-2">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Pedagogical Rationale: </span>
                            {draft.explanation}
                          </div>
                        </div>

                        {draft.reviewedBy && (
                          <p className="text-[10px] text-slate-400 mt-2">
                            Reviewed by: {draft.reviewedBy} • {new Date(draft.reviewedAt || '').toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 2: AI-ASSISTED FEEDBACK (FACILITATOR CO-PILOT)
      ---------------------------------------------------- */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          {/* Rules Banner */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3 text-xs text-indigo-900">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-indigo-950">Facilitator Co-Pilot Disclaimer</p>
              <p className="text-indigo-800 mt-0.5">
                AI feedback drafts are strictly advisory and intended to accelerate instructor review cycles.
                The human facilitator is solely authoritative and must validate or edit the final remarks and scores.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <Card className="p-5 border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-600" /> Submission Context & Evaluation Criteria
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Title</label>
                <input
                  type="text"
                  value={fbAssignmentTitle}
                  onChange={(e) => setFbAssignmentTitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Instructions / Criteria</label>
                <textarea
                  rows={2}
                  value={fbInstructions}
                  onChange={(e) => setFbInstructions(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Learner Submission Text (Sanitized)</label>
                <textarea
                  rows={5}
                  value={fbSubmissionText}
                  onChange={(e) => setFbSubmissionText(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Submission / Repo URL</label>
                  <input
                    type="text"
                    value={fbSubmissionUrl}
                    onChange={(e) => setFbSubmissionUrl(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Score</label>
                  <input
                    type="number"
                    value={fbMaxScore}
                    onChange={(e) => setFbMaxScore(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerateFeedback}
                disabled={isGeneratingFeedback || !fbSubmissionText.trim()}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
              >
                {isGeneratingFeedback ? (
                  <>
                    <Spinner size="sm" />
                    <span>Analyzing Rubric & Drafting Remarks...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate AI Feedback Co-Pilot Draft</span>
                  </>
                )}
              </Button>
            </Card>

            {/* Output Feedback Draft */}
            <Card className="p-5 border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" /> Generated Advisory Feedback Draft
                  </h3>
                  {generatedFeedback && (
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                      Suggested Score: {generatedFeedback.suggestedScore} / {fbMaxScore}
                    </span>
                  )}
                </div>

                {!generatedFeedback ? (
                  <EmptyState
                    title="No Feedback Draft Generated Yet"
                    description="Submit a learner coursework entry on the left to produce rubric-aligned advisory feedback."
                  />
                ) : (
                  <div className="space-y-4">
                    {/* Strengths & Growth */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                        <p className="text-xs font-bold text-emerald-900 mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Key Strengths
                        </p>
                        <ul className="text-xs text-emerald-800 space-y-1 list-disc list-inside">
                          {(generatedFeedback.strengths || []).map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-xs font-bold text-amber-900 mb-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Concrete Areas for Growth
                        </p>
                        <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                          {(generatedFeedback.growthAreas || []).map((g, idx) => (
                            <li key={idx}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Rubric Breakdown */}
                    <div>
                      <p className="text-xs font-bold text-slate-700 mb-2">Rubric Breakdown</p>
                      <div className="space-y-2">
                        {(generatedFeedback.rubricBreakdown || []).map((r, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
                            <div className="flex items-center justify-between font-semibold text-slate-800">
                              <span>{r.criterion}</span>
                              <span className="text-orange-600">
                                {r.score} / {r.maxScore}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{r.comments}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Full Remarks Body */}
                    <div>
                      <p className="text-xs font-bold text-slate-700 mb-1">Draft Feedback to Learner</p>
                      <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 leading-relaxed font-sans">
                        {generatedFeedback.draftFeedback}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {generatedFeedback && (
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between mt-4">
                  <span>🛡️ {generatedFeedback.disclaimer}</span>
                  <span className="font-semibold text-slate-700">Facilitator Sign-Off Required</span>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 3: AI-ASSISTED REPORTING SYNTHESIS
      ---------------------------------------------------- */}
      {activeTab === 'reporting' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control Panel */}
            <Card className="p-5 border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-orange-600" /> Synthesis Configuration
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Report Context</label>
                <select
                  value={repType}
                  onChange={(e) => setRepType(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                >
                  <option value="COHORT_REPORT">Cohort Performance Report</option>
                  <option value="PROGRAMME_REPORT">Programme Reach & Velocity</option>
                  <option value="IMPACT_DONOR_REPORT">Impact & Donor / Grant Narrative</option>
                  <option value="ME_EVALUATION_REPORT">Monitoring & Evaluation Report</option>
                  <option value="ATTENDANCE_ASSESSMENT_REPORT">Attendance & Mastery Audit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Report Title</label>
                <input
                  type="text"
                  value={repTitle}
                  onChange={(e) => setRepTitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Target Audience</label>
                <select
                  value={repAudience}
                  onChange={(e) => setRepAudience(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                >
                  <option value="leadership">Executive Leadership & PMs</option>
                  <option value="donors">Philanthropic Donors & Grant Bodies</option>
                  <option value="m_and_e">M&E Quality Assurance Officers</option>
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                <p className="font-bold text-slate-800">Aggregated Feeds Connected:</p>
                <p className="text-[11px] text-slate-600">• Cohort Enrolments & Retention (120 learners)</p>
                <p className="text-[11px] text-slate-600">• 88.4% Completion Rate • 92.1% Attendance</p>
                <p className="text-[11px] text-slate-600">• 54% Female Participation Track</p>
              </div>

              <Button
                onClick={handleSynthesizeReport}
                disabled={isSynthesizingReport}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
              >
                {isSynthesizingReport ? (
                  <>
                    <Spinner size="sm" />
                    <span>Synthesizing Institutional Insights...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate AI Executive Synthesis</span>
                  </>
                )}
              </Button>
            </Card>

            {/* Synthesis Results View */}
            <Card className="p-5 border-slate-200 shadow-xs lg:col-span-2 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-orange-600" /> Strategic Executive Synthesis
                </h3>
                {reportSynthesis && (
                  <span className="text-xs text-slate-400">
                    Generated: {new Date(reportSynthesis.generatedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {!reportSynthesis ? (
                <EmptyState
                  title="No Synthesis Generated Yet"
                  description="Run the AI Synthesis on the left to produce executive summaries and impact narratives."
                />
              ) : (
                <div className="space-y-4">
                  {/* Executive Summary */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs sm:text-sm text-slate-800 leading-relaxed">
                    <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                      <BrainCircuit className="w-4 h-4 text-orange-600" /> Executive Summary
                    </p>
                    <div className="whitespace-pre-wrap">{reportSynthesis.executiveSummary}</div>
                  </div>

                  {/* Donor Impact Narrative */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 text-xs sm:text-sm text-emerald-950 leading-relaxed">
                    <p className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" /> Funder & Donor Impact Narrative
                    </p>
                    <p>{reportSynthesis.donorImpactNarrative}</p>
                  </div>

                  {/* Recommendations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-900 mb-2">Pedagogical Recommendations</p>
                      <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                        {(reportSynthesis.pedagogicalRecommendations || []).map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-900 mb-2">Operational Next Steps</p>
                      <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                        {(reportSynthesis.operationalNextSteps || []).map((o, idx) => (
                          <li key={idx}>{o}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 4: AI GOVERNANCE, SAFETY & AUDIT LEDGER
      ---------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* 4 Pillars of Platform AI Governance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-slate-200 bg-white">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-2">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">Deterministic Scoring</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Objective questions strictly evaluated with exact match keys. No AI subjective grading on quizzes.
              </p>
            </Card>

            <Card className="p-4 border-slate-200 bg-white">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold mb-2">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">Human-in-the-Loop</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Human administrators must approve all AI assessment questions and review all submission feedback.
              </p>
            </Card>

            <Card className="p-4 border-slate-200 bg-white">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold mb-2">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">No Autonomous Decisions</p>
              <p className="text-[11px] text-slate-500 mt-1">
                AI cannot autonomously issue admission decisions or final graduation certificates.
              </p>
            </Card>

            <Card className="p-4 border-slate-200 bg-white">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold mb-2">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">PII Data Protection</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Learner identity, phone numbers, and sensitive credentials are sanitized before server-side LLM calls.
              </p>
            </Card>
          </div>

          {/* Audit Ledger Table */}
          <Card className="p-5 border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-orange-600" /> Immutable AI Operation Telemetry & Audit Logs
                </h3>
                <p className="text-xs text-slate-500">
                  Every prompt digest, token estimate, model invocation, and human sign-off recorded in real-time.
                </p>
              </div>
              <span className="text-xs text-slate-500">{auditLogs.length} Logged Invocations</span>
            </div>

            {auditLogs.length === 0 ? (
              <EmptyState title="No AI Audit Logs Recorded Yet" description="Invocations will appear here automatically." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Log ID</th>
                      <th className="py-2.5 px-3">Operation</th>
                      <th className="py-2.5 px-3">Model</th>
                      <th className="py-2.5 px-3">User & Role</th>
                      <th className="py-2.5 px-3">Prompt Summary</th>
                      <th className="py-2.5 px-3">Human Sign-off</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{log.id}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                            {log.operationType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{log.model}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-800">{log.userName}</p>
                          <p className="text-[10px] text-slate-400">{log.userRole}</p>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate text-slate-700">{log.promptSummary}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              log.humanApprovalStatus === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.humanApprovalStatus === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {log.humanApprovalStatus || 'N/A'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 5: SUPPORT ESCALATIONS QUEUE
      ---------------------------------------------------- */}
      {activeTab === 'escalations' && (
        <Card className="p-5 border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-orange-600" /> AI Support Escalation Tickets
              </h3>
              <p className="text-xs text-slate-500">
                Grievances, technical queries, or academic issues automatically routed from the 24/7 AI Assistant.
              </p>
            </div>
            <span className="text-xs text-slate-500">{escalations.length} Tickets</span>
          </div>

          {escalations.length === 0 ? (
            <EmptyState
              title="No Escalation Tickets Pending"
              description="When learners encounter issues that require staff attention, the AI assistant creates tickets here."
            />
          ) : (
            <div className="space-y-3">
              {escalations.map((t) => {
                const isOpen = t.status === 'OPEN';
                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isOpen ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-800">{t.id}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.priority === 'HIGH'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.priority}
                        </span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">
                          {t.category}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">{t.summary}</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Learner: {t.userName} ({t.userEmail}) • {t.programmeName}
                      </p>
                    </div>

                    {isOpen ? (
                      <Button
                        size="sm"
                        onClick={async () => {
                          await resolveAIEscalationTicket(
                            t.id,
                            userProfile?.displayName || 'Administrator',
                            'Followed up with learner directly.'
                          );
                          setNotification({
                            type: 'success',
                            message: `Ticket ${t.id} resolved.`,
                          });
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark Resolved
                      </Button>
                    ) : (
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full shrink-0">
                        Resolved by {t.assignedTo || 'Staff'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Review & Approve Modal */}
      {reviewingDraft && (
        <Modal
          isOpen={true}
          onClose={() => setReviewingDraft(null)}
          title="Review & Approve AI Question Draft"
        >
          <div className="space-y-4">
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900">
              <p className="font-bold">Human Administrator Verification</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Verify that the correct answer key is accurate and the question adheres to accredited curriculum.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Question Prompt</label>
              <textarea
                rows={3}
                value={reviewingDraft.text}
                onChange={(e) => setReviewingDraft({ ...reviewingDraft, text: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Deterministic Choices</label>
              <div className="space-y-1.5">
                {(reviewingDraft.choices || []).map((c, i) => {
                  const isCorrect = c.id === reviewingDraft.correctAnswerId;
                  return (
                    <div key={c.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={isCorrect}
                        onChange={() => setReviewingDraft({ ...reviewingDraft, correctAnswerId: c.id })}
                        name="correct-choice"
                        className="text-orange-600"
                      />
                      <input
                        type="text"
                        value={c.text}
                        onChange={(e) => {
                          const updated = [...reviewingDraft.choices];
                          updated[i].text = e.target.value;
                          setReviewingDraft({ ...reviewingDraft, choices: updated });
                        }}
                        className={`flex-1 text-xs border rounded-lg p-2 ${
                          isCorrect ? 'bg-emerald-50 border-emerald-300 font-semibold' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Points Value</label>
                <input
                  type="number"
                  value={reviewingDraft.points}
                  onChange={(e) => setReviewingDraft({ ...reviewingDraft, points: Number(e.target.value) })}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Add to Question Bank</label>
                <select
                  value={reviewTargetBankId}
                  onChange={(e) => setReviewTargetBankId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2"
                >
                  <option value="">Do not add to bank immediately</option>
                  {questionBanks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Approval Notes</label>
              <input
                type="text"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Optional sign-off remarks..."
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" onClick={() => setReviewingDraft(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleApproveDraft}
                disabled={isApproving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                {isApproving ? <Spinner size="sm" /> : <Check className="w-4 h-4" />}
                Confirm & Approve Question
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
