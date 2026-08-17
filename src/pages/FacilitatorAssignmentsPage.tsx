import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToAssignmentsList,
  subscribeToSubmissionsList,
  saveAssignment,
  deleteAssignment,
  gradeAssignmentSubmission,
  resolveLearnerAssignmentStatus,
} from '../services/assignments';
import { getProgrammes, getCohorts } from '../services/programmes';
import { subscribeToAllEnrolments } from '../services/learners';
import {
  Programme,
  Cohort,
  Enrolment,
  AssignmentItem,
  AssignmentSubmissionItem,
  AssignmentStatusType,
} from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  ExternalLink,
  Edit,
  Trash2,
  Send,
  Search,
  Filter,
  Users,
  Award,
  History,
  Paperclip,
  CheckCheck,
  Sparkles,
} from 'lucide-react';

interface FacilitatorAssignmentsPageProps {
  onNavigate?: (path: string) => void;
}

export const FacilitatorAssignmentsPage: React.FC<FacilitatorAssignmentsPageProps> = ({
  onNavigate,
}) => {
  const { userProfile } = useAuth();

  // Data State
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmissionItem[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Active View & Filters
  const [activeTab, setActiveTab] = useState<'submissions' | 'pending' | 'graded' | 'missing' | 'manage'>('submissions');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [programmeFilter, setProgrammeFilter] = useState<string>('ALL');
  const [cohortFilter, setCohortFilter] = useState<string>('ALL');

  // Create / Edit Assignment Modal State
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formProgrammeId, setFormProgrammeId] = useState('');
  const [formCohortId, setFormCohortId] = useState('');
  const [formModuleName, setFormModuleName] = useState('Core Module');
  const [formWeekNumber, setFormWeekNumber] = useState(1);
  const [formDueDate, setFormDueDate] = useState('');
  const [formTotalPoints, setFormTotalPoints] = useState(100);
  const [formAllowResubmission, setFormAllowResubmission] = useState(true);
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  // Grading Modal State
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmissionItem | null>(null);
  const [gradingScore, setGradingScore] = useState<number>(100);
  const [gradingFeedback, setGradingFeedback] = useState<string>('');
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  // Load Real-time Subscriptions & Data
  useEffect(() => {
    setLoading(true);

    const unsubAssignments = subscribeToAssignmentsList(programmeFilter, cohortFilter, (list) => {
      setAssignments(list);
    });

    const unsubSubmissions = subscribeToSubmissionsList('ALL', undefined, (sList) => {
      setSubmissions(sList);
      setLoading(false);
    });

    const unsubEnrolments = subscribeToAllEnrolments((eList) => {
      setEnrolments(eList);
    });

    getProgrammes().then((p) => {
      setProgrammes(p);
      if (p.length > 0 && !formProgrammeId) setFormProgrammeId(p[0].id);
    }).catch(console.error);

    getCohorts().then((c) => {
      setCohorts(c);
      if (c.length > 0 && !formCohortId) setFormCohortId(c[0].id);
    }).catch(console.error);

    return () => {
      unsubAssignments();
      unsubSubmissions();
      unsubEnrolments();
    };
  }, [programmeFilter, cohortFilter]);

  // Open Create/Edit Assignment Modal
  const handleOpenAssignmentModal = (asgn?: AssignmentItem) => {
    if (asgn) {
      setEditingAssignment(asgn);
      setFormTitle(asgn.title);
      setFormDescription(asgn.description);
      setFormInstructions(asgn.instructions || '');
      setFormProgrammeId(asgn.programmeId);
      setFormCohortId(asgn.cohortId || '');
      setFormModuleName(asgn.moduleName || 'Core Module');
      setFormWeekNumber(asgn.weekNumber || 1);
      setFormDueDate(asgn.dueDate ? asgn.dueDate.split('T')[0] : '');
      setFormTotalPoints(asgn.totalPoints || 100);
      setFormAllowResubmission(asgn.allowResubmission !== false);
      setFormAttachmentUrl(asgn.attachmentUrl || '');
    } else {
      setEditingAssignment(null);
      setFormTitle('');
      setFormDescription('');
      setFormInstructions('');
      setFormProgrammeId(programmes[0]?.id || '');
      setFormCohortId(cohorts[0]?.id || '');
      setFormModuleName('Generative AI Core');
      setFormWeekNumber(1);
      // Default due date: 7 days from today
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setFormDueDate(d.toISOString().split('T')[0]);
      setFormTotalPoints(100);
      setFormAllowResubmission(true);
      setFormAttachmentUrl('');
    }
    setIsAssignmentModalOpen(true);
    setActionError(null);
  };

  // Save Assignment Handler
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDueDate) {
      setActionError('Title and due date are required.');
      return;
    }

    setIsSavingAssignment(true);
    setActionError(null);

    const selProg = programmes.find((p) => p.id === formProgrammeId);
    const selCohort = cohorts.find((c) => c.id === formCohortId);

    try {
      await saveAssignment({
        id: editingAssignment?.id,
        title: formTitle,
        description: formDescription,
        instructions: formInstructions,
        programmeId: formProgrammeId,
        programmeName: selProg?.name || 'Gen AI Programme',
        cohortId: formCohortId,
        cohortName: selCohort?.name || 'Cohort 2',
        moduleName: formModuleName,
        weekNumber: Number(formWeekNumber),
        dueDate: new Date(formDueDate).toISOString(),
        totalPoints: Number(formTotalPoints),
        allowResubmission: formAllowResubmission,
        attachmentUrl: formAttachmentUrl,
        createdBy: userProfile?.email || 'Facilitator',
        createdByName: userProfile?.displayName || 'Facilitator',
      });

      setActionSuccess(`Assignment "${formTitle}" saved successfully!`);
      setIsAssignmentModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save assignment.');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  // Delete Assignment Handler
  const handleDeleteAssignment = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete assignment "${title}"?`)) return;
    try {
      await deleteAssignment(id);
      setActionSuccess(`Assignment "${title}" deleted.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete assignment.');
    }
  };

  // Open Grading Modal
  const handleOpenGradingModal = (sub: AssignmentSubmissionItem) => {
    setGradingSubmission(sub);
    setGradingScore(sub.score !== undefined ? sub.score : sub.maxScore || 100);
    setGradingFeedback(sub.feedback || '');
    setActionError(null);
  };

  // Submit Grade & Feedback
  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    setIsSubmittingGrade(true);
    setActionError(null);

    try {
      await gradeAssignmentSubmission({
        submissionId: gradingSubmission.id,
        score: Number(gradingScore),
        maxScore: gradingSubmission.maxScore || 100,
        feedback: gradingFeedback,
        gradedBy: userProfile?.email || 'Facilitator',
        gradedByName: userProfile?.displayName || 'Facilitator',
      });

      setActionSuccess(`Graded submission for ${gradingSubmission.userName} (${gradingScore}/${gradingSubmission.maxScore || 100}).`);
      setGradingSubmission(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to record grade.');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  // Status Trackers
  const totalSubmissionsCount = submissions.length;
  const pendingGradingCount = submissions.filter((s) => s.status !== 'GRADED').length;
  const gradedCount = submissions.filter((s) => s.status === 'GRADED').length;
  const lateCount = submissions.filter((s) => s.isLate || s.status === 'LATE').length;

  // Filtered Submissions list
  const filteredSubmissions = submissions.filter((s) => {
    const matchesAssignment = selectedAssignmentId === 'ALL' || s.assignmentId === selectedAssignmentId;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.userName.toLowerCase().includes(q) ||
      s.userEmail.toLowerCase().includes(q) ||
      s.learnerId.toLowerCase().includes(q) ||
      s.assignmentTitle.toLowerCase().includes(q);

    if (!matchesAssignment || !matchesSearch) return false;

    if (activeTab === 'pending') return s.status !== 'GRADED';
    if (activeTab === 'graded') return s.status === 'GRADED';
    return true;
  });

  // Calculate Missing Submissions across active assignments
  const activeAssignments = selectedAssignmentId === 'ALL' ? assignments : assignments.filter((a) => a.id === selectedAssignmentId);
  const nowTime = new Date().getTime();

  const missingList: Array<{
    assignment: AssignmentItem;
    learnerName: string;
    learnerEmail: string;
    learnerId: string;
    dueDate: string;
  }> = [];

  activeAssignments.forEach((asgn) => {
    const isPastDue = nowTime > new Date(asgn.dueDate).getTime();
    if (isPastDue) {
      // Find enrolled learners who haven't submitted
      const cEnrolments = enrolments.filter(
        (e) => !asgn.cohortId || e.cohortId === asgn.cohortId || e.programmeId === asgn.programmeId
      );

      cEnrolments.forEach((e) => {
        const hasSub = submissions.some(
          (s) => s.assignmentId === asgn.id && (s.learnerId === e.learnerId || s.userId === e.userId)
        );
        if (!hasSub) {
          missingList.push({
            assignment: asgn,
            learnerName: e.userName || 'Enrolled Learner',
            learnerEmail: e.userEmail || '',
            learnerId: e.learnerId || e.userId,
            dueDate: asgn.dueDate,
          });
        }
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
            <ClipboardList className="w-4 h-4" /> Facilitator & PM Workspace
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Assignments, Submissions & Grading
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create lab assignments, review learner URL/file submissions, return scores & detailed feedback, and track missing coursework.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenAssignmentModal()}
            className="font-bold shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create Assignment
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <Alert type="success" onDismiss={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      {actionError && (
        <Alert type="error" onDismiss={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* Tracker Overview Cards (SUBMITTED, LATE, GRADED, MISSING) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Total Submissions</p>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalSubmissionsCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Across all active cohorts</p>
        </Card>

        <Card className="p-4 bg-amber-50/60 border-amber-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-amber-800 uppercase">Pending Grading</p>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-900 mt-1">{pendingGradingCount}</p>
          <p className="text-[10px] text-amber-700 mt-0.5">Awaiting instructor feedback</p>
        </Card>

        <Card className="p-4 bg-emerald-50/60 border-emerald-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-800 uppercase">Graded & Returned</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{gradedCount}</p>
          <p className="text-[10px] text-emerald-700 mt-0.5">Scores & feedback dispatched</p>
        </Card>

        <Card className="p-4 bg-rose-50/60 border-rose-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-rose-800 uppercase">Late & Missing</p>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-900 mt-1">
            {lateCount} <span className="text-xs text-rose-700 font-normal">/ {missingList.length} Missing</span>
          </p>
          <p className="text-[10px] text-rose-700 mt-0.5">Past due date submissions</p>
        </Card>
      </div>

      {/* Main Filter & Navigation Toolbar */}
      <Card className="p-4 bg-white border-slate-200 space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full lg:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'submissions'
                  ? 'bg-white text-orange-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 inline mr-1" /> All Submissions ({submissions.length})
            </button>

            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap relative ${
                activeTab === 'pending'
                  ? 'bg-white text-orange-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 inline mr-1" /> Pending Grading
              {pendingGradingCount > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingGradingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('graded')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'graded'
                  ? 'bg-white text-orange-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 inline mr-1" /> Graded Log ({gradedCount})
            </button>

            <button
              onClick={() => setActiveTab('missing')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap relative ${
                activeTab === 'missing'
                  ? 'bg-white text-orange-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 inline mr-1" /> Missing Submissions
              {missingList.length > 0 && (
                <span className="ml-1.5 bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {missingList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('manage')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'manage'
                  ? 'bg-white text-orange-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 inline mr-1" /> Manage Assignments ({assignments.length})
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
            <div className="w-full sm:w-56">
              <Select
                options={[
                  { value: 'ALL', label: 'All Assignments' },
                  ...(assignments || []).map((a) => ({ value: a.id, label: a.title })),
                ]}
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Input
                placeholder="Search learner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* VIEW TAB 1, 2, 3: SUBMISSIONS LIST & GRADING */}
      {(activeTab === 'submissions' || activeTab === 'pending' || activeTab === 'graded') && (
        <Card className="bg-white border-slate-200 overflow-hidden">
          {loading ? (
            <div className="py-12 text-center">
              <Spinner size="lg" label="Loading submissions log..." />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState
                title="No submissions found"
                description="When learners submit coursework, deliverables will appear here for evaluation."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Learner</th>
                    <th className="p-3.5">Assignment</th>
                    <th className="p-3.5">Submission Attachments & URL</th>
                    <th className="p-3.5">Submitted Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Score & Feedback</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{sub.userName}</div>
                        <div className="text-slate-500 text-[11px]">{sub.userEmail}</div>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 rounded">
                          {sub.learnerId}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{sub.assignmentTitle}</div>
                        <div className="text-[11px] text-slate-500">{sub.programmeName || 'Gen AI'}</div>
                      </td>

                      <td className="p-3.5 max-w-[240px]">
                        <p className="text-slate-700 font-medium truncate mb-1" title={sub.submissionText}>
                          "{sub.submissionText}"
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {sub.submissionUrl && (
                            <a
                              href={sub.submissionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                            >
                              <ExternalLink className="w-3 h-3" /> Project Link
                            </a>
                          )}
                          {sub.attachmentName && (
                            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                              <Paperclip className="w-3 h-3 text-slate-400" /> {sub.attachmentName}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-600 text-[11px]">
                        <div>{new Date(sub.submittedAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">{new Date(sub.submittedAt).toLocaleTimeString()}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sub.status === 'GRADED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.isLate
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {sub.status === 'GRADED' ? 'GRADED' : sub.isLate ? 'LATE' : 'SUBMITTED'}
                          </span>

                          {sub.isLate && (
                            <span className="text-[10px] font-bold text-rose-600 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" /> Late Submission
                            </span>
                          )}

                          {sub.resubmissionCount > 0 && (
                            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-0.5">
                              <History className="w-3 h-3" /> {sub.resubmissionCount} Resubmissions
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        {sub.status === 'GRADED' ? (
                          <div>
                            <span className="font-bold text-slate-900">{sub.score} / {sub.maxScore || 100}</span>
                            {sub.feedback && (
                              <p className="text-[11px] text-slate-500 truncate max-w-[160px]" title={sub.feedback}>
                                "{sub.feedback}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not graded yet</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <Button
                          variant={sub.status === 'GRADED' ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => handleOpenGradingModal(sub)}
                          className="font-bold text-xs"
                        >
                          {sub.status === 'GRADED' ? 'Edit Grade' : 'Grade & Feedback'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* VIEW TAB 4: MISSING SUBMISSIONS */}
      {activeTab === 'missing' && (
        <Card className="bg-white border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Overdue / Missing Submissions</h3>
              <p className="text-xs text-slate-500">Learners who have not submitted required coursework past due date.</p>
            </div>
            <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {missingList.length} Missing
            </span>
          </div>

          {missingList.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState title="No missing submissions!" description="All active cohort learners have submitted coursework on time." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Assignment Title</th>
                    <th className="p-3.5">Learner Details</th>
                    <th className="p-3.5">Due Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {missingList.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{m.assignment.title}</div>
                        <div className="text-[11px] text-slate-500">{m.assignment.programmeName}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{m.learnerName}</div>
                        <div className="text-[11px] text-slate-500">{m.learnerEmail}</div>
                      </td>

                      <td className="p-3.5 text-rose-700 font-bold text-[11px]">
                        {new Date(m.dueDate).toLocaleDateString()}
                      </td>

                      <td className="p-3.5">
                        <Badge variant="rose" size="sm">MISSING</Badge>
                      </td>

                      <td className="p-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActionSuccess(`Reminder dispatched to ${m.learnerEmail}`)}
                          className="text-xs font-semibold text-orange-600 border-orange-300"
                        >
                          <Send className="w-3.5 h-3.5 mr-1" /> Send Reminder
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* VIEW TAB 5: MANAGE ASSIGNMENTS */}
      {activeTab === 'manage' && (
        <Card className="bg-white border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Master Assignments Directory</h3>
              <p className="text-xs text-slate-500">Manage lab tasks, due dates, instructions, and total points.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenAssignmentModal()}
              className="font-bold"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Assignment
            </Button>
          </div>

          {assignments.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState title="No assignments created yet" description="Click 'Add Assignment' to configure lab tasks and homework." />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((asgn) => (
                <div key={asgn.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        {asgn.moduleName || 'Core Module'} • Week {asgn.weekNumber || 1}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{asgn.title}</h4>
                      <p className="text-[11px] text-slate-500">{asgn.programmeName} • {asgn.cohortName || 'Cohort 2'}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAssignmentModal(asgn)}
                        className="p-1.5 h-8 w-8 text-slate-600"
                        title="Edit Assignment"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAssignment(asgn.id, asgn.title)}
                        className="p-1.5 h-8 w-8 text-rose-600 border-rose-200 hover:bg-rose-50"
                        title="Delete Assignment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{asgn.description}</p>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Due Date: <strong className="text-slate-800">{new Date(asgn.dueDate).toLocaleDateString()}</strong></span>
                    <span>Max Score: <strong className="text-slate-800">{asgn.totalPoints} pts</strong></span>
                    <span>Resubmission: <strong className="text-emerald-700">{asgn.allowResubmission ? 'Allowed' : 'Disabled'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* CREATE / EDIT ASSIGNMENT MODAL */}
      <Modal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        title={editingAssignment ? 'Edit Coursework Assignment' : 'Create New Coursework Assignment'}
      >
        <form onSubmit={handleSaveAssignment} className="space-y-4 pt-2">
          <Input
            label="Assignment Title"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="e.g. Lab 3: Fine-Tuning LLMs with LoRA & PEFT"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Target Programme"
              options={(programmes || []).map((p) => ({ value: p.id, label: p.name || (p as any).title || p.id }))}
              value={formProgrammeId}
              onChange={(e) => setFormProgrammeId(e.target.value)}
              required
            />
            <Select
              label="Target Cohort"
              options={(cohorts || []).map((c) => ({ value: c.id, label: c.name }))}
              value={formCohortId}
              onChange={(e) => setFormCohortId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Module / Topic Name"
              value={formModuleName}
              onChange={(e) => setFormModuleName(e.target.value)}
              placeholder="e.g. Prompt Engineering & RAG"
            />
            <Input
              label="Week Number"
              type="number"
              min="1"
              value={String(formWeekNumber)}
              onChange={(e) => setFormWeekNumber(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Due Date"
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
              required
            />
            <Input
              label="Total Points / Max Score"
              type="number"
              min="1"
              value={String(formTotalPoints)}
              onChange={(e) => setFormTotalPoints(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Short Description / Summary
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              rows={2}
              placeholder="Summary of assignment scope and deliverables..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detailed Instructions & Grading Rubric
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              rows={3}
              placeholder="Detail submission requirements (e.g. submit GitHub link, Colab notebook URL, or uploaded PDF report)..."
              value={formInstructions}
              onChange={(e) => setFormInstructions(e.target.value)}
            />
          </div>

          <Input
            label="Template / Reference Attachment URL (Optional)"
            type="url"
            placeholder="https://github.com/example/starter-repo or Google Drive link"
            value={formAttachmentUrl}
            onChange={(e) => setFormAttachmentUrl(e.target.value)}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="allowResubmission"
              checked={formAllowResubmission}
              onChange={(e) => setFormAllowResubmission(e.target.checked)}
              className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4"
            />
            <label htmlFor="allowResubmission" className="text-xs font-medium text-slate-700">
              Allow learners to resubmit assignment before or after grading
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAssignmentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingAssignment}
              className="font-bold shadow-xs"
            >
              {isSavingAssignment ? <Spinner size="sm" /> : 'Save Assignment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* GRADING & FEEDBACK MODAL */}
      <Modal
        isOpen={!!gradingSubmission}
        onClose={() => setGradingSubmission(null)}
        title="Grade Submission & Return Feedback"
      >
        {gradingSubmission && (
          <form onSubmit={handleSubmitGrade} className="space-y-4 pt-2">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <p className="font-bold text-slate-900 text-sm">{gradingSubmission.userName} ({gradingSubmission.learnerId})</p>
              <p className="text-slate-600">Assignment: <span className="font-semibold text-slate-900">{gradingSubmission.assignmentTitle}</span></p>
              <p className="text-slate-500">Submitted: {new Date(gradingSubmission.submittedAt).toLocaleString()}</p>
              {gradingSubmission.isLate && (
                <p className="text-rose-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Late Submission
                </p>
              )}
            </div>

            {/* Submission Content Review */}
            <div className="p-3.5 bg-slate-100 rounded-xl space-y-2 border border-slate-200 text-xs">
              <p className="font-bold text-slate-700 uppercase text-[10px]">Learner Deliverable Text</p>
              <p className="text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] whitespace-pre-wrap">
                {gradingSubmission.submissionText || 'No text provided'}
              </p>

              {gradingSubmission.submissionUrl && (
                <div>
                  <p className="font-bold text-slate-700 uppercase text-[10px] mb-1">Submitted Project URL</p>
                  <a
                    href={gradingSubmission.submissionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 font-bold hover:underline inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-slate-200 text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Deliverable Link
                  </a>
                </div>
              )}

              {gradingSubmission.attachmentName && (
                <div>
                  <p className="font-bold text-slate-700 uppercase text-[10px] mb-1">Attached Deliverable File</p>
                  <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-slate-200 text-xs text-slate-800 font-medium">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" /> {gradingSubmission.attachmentName}
                  </span>
                </div>
              )}

              {gradingSubmission.history && gradingSubmission.history.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="font-bold text-slate-700 uppercase text-[10px] mb-1 flex items-center gap-1">
                    <History className="w-3 h-3" /> Resubmission History ({gradingSubmission.history.length} previous versions)
                  </p>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {gradingSubmission.history.map((h, i) => (
                      <div key={i} className="text-[10px] bg-white p-2 rounded border border-slate-200">
                        <span className="font-bold text-slate-600">Version {i + 1} ({new Date(h.submittedAt).toLocaleDateString()}):</span> "{h.submissionText}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Score Input */}
            <Input
              label={`Score (Out of ${gradingSubmission.maxScore || 100})`}
              type="number"
              min="0"
              max={gradingSubmission.maxScore || 100}
              value={String(gradingScore)}
              onChange={(e) => setGradingScore(Number(e.target.value))}
              required
            />

            {/* Instructor Comments & Feedback */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detailed Instructor Feedback & Comments
              </label>
              <textarea
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="Provide constructive feedback, code review remarks, or areas for improvement..."
                value={gradingFeedback}
                onChange={(e) => setGradingFeedback(e.target.value)}
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGradingSubmission(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmittingGrade}
                className="font-bold shadow-xs"
              >
                {isSubmittingGrade ? <Spinner size="sm" /> : 'Save Score & Return Feedback'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
