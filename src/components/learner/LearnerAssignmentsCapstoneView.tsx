import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToAssignments,
  subscribeToUserSubmissions,
  submitAssignment,
  Assignment,
  AssignmentSubmission,
} from '../../services/learnerPortal';
import { LearnerFinalProjectPage } from '../../pages/LearnerFinalProjectPage';
import {
  ClipboardList,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  ExternalLink,
  Award,
  BookOpen,
} from 'lucide-react';

interface LearnerAssignmentsCapstoneViewProps {
  onNavigate?: (path: string) => void;
}

export const LearnerAssignmentsCapstoneView: React.FC<LearnerAssignmentsCapstoneViewProps> = ({
  onNavigate,
}) => {
  const { currentUser, enrolments } = useAuth();
  const [activeTab, setActiveTab] = useState<'weekly' | 'capstone'>('weekly');

  const activeEnrolment = enrolments && enrolments.length > 0 ? enrolments[0] : null;
  const programmeId = activeEnrolment?.programmeId || 'prog_gen_ai';

  // Weekly assignments state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Submit Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubAssignments = subscribeToAssignments(programmeId, (list) => {
      setAssignments(list);
      setLoading(false);
    });

    const unsubSubmissions = subscribeToUserSubmissions(currentUser.uid, (subs) => {
      setSubmissions(subs);
    });

    return () => {
      unsubAssignments();
      unsubSubmissions();
    };
  }, [programmeId, currentUser?.uid]);

  const handleOpenSubmit = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    const existing = submissions.find((s) => s.assignmentId === assignment.id);
    setSubmissionText(existing?.submissionText || '');
    setSubmissionLink(existing?.attachmentUrl || '');
    setIsSubmitModalOpen(true);
  };

  const handleSaveSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !currentUser) return;

    if (!submissionText.trim() && !submissionLink.trim()) {
      setError('Please provide submission notes or a project repository URL.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitAssignment(
        selectedAssignment,
        activeEnrolment?.learnerId || currentUser.uid,
        currentUser.uid,
        currentUser.displayName || 'Enrolled Learner',
        currentUser.email || '',
        submissionText.trim(),
        submissionLink.trim() || undefined
      );

      setSuccess(`Assignment "${selectedAssignment.title}" submitted successfully.`);
      setIsSubmitModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'weekly'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>WEEKLY ASSIGNMENTS</span>
        </button>
        <button
          onClick={() => setActiveTab('capstone')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'capstone'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>FINAL CAPSTONE PROJECT</span>
        </button>
      </div>

      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert type="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {activeTab === 'weekly' ? (
        <div className="space-y-4">
          <Card className="p-5 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Module & Weekly Deliverables</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete hands-on assignments to build your skills and maintain course progress.
                </p>
              </div>
              <Badge variant="success" className="text-[10px]">
                {submissions.length} / {assignments.length} Submitted
              </Badge>
            </div>
          </Card>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3 bg-white rounded-2xl border border-slate-200">
              <Spinner size="md" />
              <p className="text-xs font-medium">Loading weekly assignments...</p>
            </div>
          ) : assignments.length === 0 ? (
            <EmptyState
              title="No Weekly Assignments Posted Yet"
              description="Your facilitator will release weekly assignments as your cohort progresses through the curriculum."
              icon={<ClipboardList className="w-10 h-10 text-slate-400" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(assignments || []).map((assignment) => {
                const sub = submissions.find((s) => s.assignmentId === assignment.id);
                const isGraded = sub?.status === 'GRADED';
                const isSubmitted = !!sub;

                return (
                  <Card
                    key={assignment.id}
                    className="p-5 bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant={isGraded ? 'success' : isSubmitted ? 'warning' : 'default'}
                          className="text-[10px]"
                        >
                          {isGraded
                            ? `GRADED (${sub.grade}%)`
                            : isSubmitted
                            ? 'SUBMITTED FOR REVIEW'
                            : 'PENDING SUBMISSION'}
                        </Badge>

                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          Due {assignment.dueDate || 'End of Week'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{assignment.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-3">
                          {assignment.description}
                        </p>
                      </div>

                      {sub?.feedback && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <p className="font-bold text-slate-700 mb-1">Facilitator Feedback:</p>
                          <p className="text-slate-600 italic">"{sub.feedback}"</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        Max Score: {assignment.totalPoints || 100} pts
                      </span>

                      <Button
                        variant={isSubmitted ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => handleOpenSubmit(assignment)}
                        className={!isSubmitted ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold' : ''}
                      >
                        {isSubmitted ? 'Update Submission' : 'Submit Assignment'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Final Capstone Tab */
        <div className="space-y-6">
          <LearnerFinalProjectPage />
        </div>
      )}

      {/* Assignment Submit Modal */}
      {isSubmitModalOpen && selectedAssignment && (
        <Modal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          title={`Submit: ${selectedAssignment.title}`}
        >
          <form onSubmit={handleSaveSubmission} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <p className="font-bold text-slate-800 mb-1">Instructions:</p>
              <p>{selectedAssignment.description}</p>
            </div>

            <Textarea
              label="Submission Notes / Solution Summary"
              placeholder="Describe your implementation, key findings, and notes for the facilitator..."
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              rows={4}
            />

            <Input
              label="Project Repository / Demo Link (GitHub, Colab, Google Drive)"
              placeholder="https://github.com/your-org/assignment-solution"
              value={submissionLink}
              onChange={(e) => setSubmissionLink(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
