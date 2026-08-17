import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToProgrammeProjectConfig,
  subscribeToLearnerProjectSubmission,
  submitFinalProject,
} from '../services/finalProject';
import {
  FinalProjectConfig,
  FinalProjectSubmission,
  FinalProjectAttachment,
  FinalProjectStatus,
} from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';
import {
  Sparkles,
  FileText,
  Link,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award,
  ExternalLink,
  Github,
  Trash2,
  Send,
  FileCheck,
  BookOpen,
} from 'lucide-react';

interface LearnerFinalProjectPageProps {
  learnerId?: string;
  learnerName?: string;
  learnerEmail?: string;
  programmeId?: string;
  programmeName?: string;
  cohortId?: string;
  cohortName?: string;
  onNavigate?: (path: string) => void;
}

export const LearnerFinalProjectPage: React.FC<LearnerFinalProjectPageProps> = ({
  learnerId,
  learnerName,
  learnerEmail,
  programmeId = 'ALL',
  programmeName = 'Enrolled Programme',
  cohortId = 'ALL',
  cohortName = 'All Cohorts',
  onNavigate,
}) => {
  const { currentUser, userProfile } = useAuth();
  const activeUid = learnerId || currentUser?.uid || 'learner_1';
  const activeName = learnerName || userProfile?.displayName || 'Active Learner';
  const activeEmail = learnerEmail || userProfile?.email || 'learner@platform.org';

  // Config & Submission state
  const [projectConfig, setProjectConfig] = useState<FinalProjectConfig | null>(null);
  const [submission, setSubmission] = useState<FinalProjectSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  // Form inputs
  const [description, setDescription] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [liveDemoUrl, setLiveDemoUrl] = useState('');
  const [attachments, setAttachments] = useState<FinalProjectAttachment[]>([]);

  // File Upload State
  const [fileNameInput, setFileNameInput] = useState('');
  const [fileUrlInput, setFileUrlInput] = useState('');

  // Submission Async States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    const unsubConfig = subscribeToProgrammeProjectConfig(programmeId, (config) => {
      setProjectConfig(config);
    });

    const unsubSubmission = subscribeToLearnerProjectSubmission(programmeId, activeUid, (sub) => {
      setSubmission(sub);
      if (sub) {
        setDescription(sub.description || '');
        setRepositoryUrl(sub.repositoryUrl || '');
        setLiveDemoUrl(sub.liveDemoUrl || '');
        setAttachments(sub.attachments || []);
      }
      setLoading(false);
    });

    return () => {
      unsubConfig();
      unsubSubmission();
    };
  }, [programmeId, activeUid]);

  // Handle Add File Attachment
  const handleAddAttachment = () => {
    if (!fileNameInput.trim()) return;
    const url = fileUrlInput.trim() || `https://storage.platform.org/files/${encodeURIComponent(fileNameInput)}`;
    setAttachments((prev) => [
      ...prev,
      {
        name: fileNameInput.trim(),
        url,
        size: '1.2 MB',
      },
    ]);
    setFileNameInput('');
    setFileUrlInput('');
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setSubmitError('Project description is required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await submitFinalProject({
        programmeId: projectConfig?.programmeId || programmeId,
        programmeName: projectConfig?.programmeName || programmeName,
        cohortId,
        cohortName,
        learnerId: activeUid,
        learnerName: activeName,
        learnerEmail: activeEmail,
        description,
        repositoryUrl,
        liveDemoUrl,
        attachments,
      });

      setSubmitSuccess('Final project submitted successfully! Your facilitator has been notified for review.');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Meta
  const getStatusBadge = (status?: FinalProjectStatus) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success" size="lg" className="font-bold">✓ APPROVED & PASSED</Badge>;
      case 'SUBMITTED':
        return <Badge variant="warning" size="lg" className="font-bold">SUBMITTED (IN REVIEW)</Badge>;
      case 'IN_REVIEW':
        return <Badge variant="purple" size="lg" className="font-bold">FACILITATOR REVIEWING</Badge>;
      case 'NEEDS_REVISION':
        return <Badge variant="danger" size="lg" className="font-bold">REVISION REQUESTED</Badge>;
      default:
        return <Badge variant="secondary" size="lg" className="font-bold">NOT SUBMITTED</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Spinner size="lg" label="Loading programme final project details..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" /> Programme Final Capstone Project
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {projectConfig?.title || 'Full-Stack Capstone Project'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Programme: {projectConfig?.programmeName || programmeName} | Due Date: {projectConfig?.dueDate || 'End of Cohort'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {getStatusBadge(submission?.status)}
            {submission?.grade !== undefined && (
              <div className="text-right bg-slate-900 text-white px-3.5 py-1.5 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Grade</span>
                <span className="text-lg font-bold text-orange-400">{submission.grade} / {projectConfig?.maxGrade || 100}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {submitSuccess && (
        <Alert type="success" onDismiss={() => setSubmitSuccess(null)}>
          {submitSuccess}
        </Alert>
      )}

      {submitError && (
        <Alert type="error" onDismiss={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      {/* Graded & Approved Feedback Card */}
      {submission?.status === 'APPROVED' && (
        <Card className="p-5 bg-emerald-50/80 border-emerald-200 space-y-3">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <Award className="w-5 h-5 text-emerald-600" /> Final Project Approved & Gradinated
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Your final capstone submission has been reviewed, approved, and scored by your facilitator.
          </p>
          {submission.facilitatorFeedback && (
            <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 text-xs text-slate-800 space-y-1">
              <strong className="block font-bold text-emerald-900">Facilitator Comments:</strong>
              <p className="italic">"{submission.facilitatorFeedback}"</p>
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Requirements & Instructions */}
        <div className="space-y-6">
          <Card className="p-5 bg-white border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <BookOpen className="w-4 h-4 text-orange-600" />
              <h2 className="font-bold text-slate-900 text-sm">Project Description & Requirements</h2>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {projectConfig?.description}
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <strong className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                Submission Requirements:
              </strong>
              <div className="prose prose-xs max-w-none text-slate-700 whitespace-pre-wrap font-mono text-[11px] bg-white p-3 rounded-lg border border-slate-200">
                {projectConfig?.requirements}
              </div>
            </div>

            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-1.5 text-xs text-orange-900">
              <span className="font-bold block">Evaluation Benchmarks:</span>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li>Maximum Grade: <strong>{projectConfig?.maxGrade || 100} Points</strong></li>
                <li>Passing Benchmark: <strong>{projectConfig?.passingGrade || 70} Points</strong></li>
                <li>Weighted Contribution: <strong>Synced directly to Progress Engine</strong></li>
              </ul>
            </div>
          </Card>
        </div>

        {/* Right Column: Submission Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 bg-white border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-orange-600" />
                <h2 className="font-bold text-slate-900 text-base">Submit / Edit Final Capstone</h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {submission?.submittedAt ? `Last update: ${new Date(submission.updatedAt || submission.submittedAt).toLocaleDateString()}` : 'New Submission'}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Project Description */}
              <Textarea
                label="Project Description & Overview *"
                rows={5}
                placeholder="Describe your capstone application, architecture choices, database design, features implemented, and key takeaways..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />

              {/* 2. Repository & Live Demo URLs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="GitHub / Code Repository URL"
                  placeholder="https://github.com/username/project-repo"
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                  leftIcon={<Github className="w-4 h-4" />}
                />

                <Input
                  label="Live App Demo URL"
                  placeholder="https://my-capstone-app.run.app"
                  value={liveDemoUrl}
                  onChange={(e) => setLiveDemoUrl(e.target.value)}
                  leftIcon={<Link className="w-4 h-4" />}
                />
              </div>

              {/* 3. File Uploads Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Upload Deliverables & Attachments
                </label>

                {/* Upload Inputs */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="File Name (e.g. System_Architecture.pdf)"
                      value={fileNameInput}
                      onChange={(e) => setFileNameInput(e.target.value)}
                    />
                    <Input
                      placeholder="File URL or Blob Path (Optional)"
                      value={fileUrlInput}
                      onChange={(e) => setFileUrlInput(e.target.value)}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddAttachment}
                    disabled={!fileNameInput.trim()}
                    className="w-full text-xs font-semibold"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Attach File Document
                  </Button>
                </div>

                {/* Attachments List */}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Attached Files ({attachments.length}):</span>
                    <div className="space-y-1.5">
                      {attachments.map((att, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-100 rounded-lg flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="w-4 h-4 text-orange-600 shrink-0" />
                            <span className="font-medium text-slate-800 truncate">{att.name}</span>
                            <span className="text-[10px] text-slate-400">({att.size || '1 MB'})</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-orange-600 hover:text-orange-700 text-[11px] font-semibold"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(idx)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[11px] text-slate-500">
                  Submitting will notify your programme facilitator for formal review and grading.
                </p>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  className="font-bold shadow-xs px-6"
                >
                  {isSubmitting ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1.5" /> Submit Final Capstone
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
