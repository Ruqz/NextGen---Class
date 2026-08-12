import React, { useState, useEffect, useRef } from 'react';
import {
  Assessment,
  AssessmentQuestion,
  AssessmentAttempt,
  AssessmentInvitation,
} from '../types';
import {
  getAssessments,
  getAssessmentById,
  getUserAttempts,
  startAttempt,
  saveAnswerProgress,
  submitAttempt,
  seedDefaultAssessmentIfEmpty,
} from '../services/assessments';
import {
  getInvitationByToken,
  completeInvitationAttempt,
} from '../services/admissions';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Save,
  HelpCircle,
  RotateCcw,
  ShieldCheck,
  List,
  User,
  Link2,
} from 'lucide-react';

interface AssessmentTakingPageProps {
  assessmentId?: string;
  invitationToken?: string;
  onNavigate: (path: string) => void;
}

export const AssessmentTakingPage: React.FC<AssessmentTakingPageProps> = ({
  assessmentId,
  invitationToken: propToken,
  onNavigate,
}) => {
  const { currentUser, userProfile } = useAuth();

  // Extract token from URL if not explicitly passed
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token') || propToken || (window.location.pathname.startsWith('/portal/assessment-invite/') ? window.location.pathname.split('/portal/assessment-invite/')[1] : undefined);

  const [invitation, setInvitation] = useState<AssessmentInvitation | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<AssessmentAttempt | null>(null);
  const [userAttempts, setUserAttempts] = useState<AssessmentAttempt[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Test State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [autoSubmittedAlert, setAutoSubmittedAlert] = useState(false);

  // Completed Test Result View
  const [completedAttempt, setCompletedAttempt] = useState<AssessmentAttempt | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      setError(null);
      try {
        let targetAssessmentId = assessmentId;
        let foundInv: AssessmentInvitation | null = null;

        // Check if loading via unique invitation access token
        if (tokenFromUrl) {
          foundInv = await getInvitationByToken(tokenFromUrl);
          if (foundInv) {
            setInvitation(foundInv);
            targetAssessmentId = foundInv.assessmentId;
          } else {
            setError(`Invalid or expired assessment invitation token: ${tokenFromUrl}`);
            setLoading(false);
            return;
          }
        }

        if (!targetAssessmentId) {
          targetAssessmentId = await seedDefaultAssessmentIfEmpty();
        }

        const asst = await getAssessmentById(targetAssessmentId);
        if (!asst) {
          setError('Assessment not found or unavailable.');
          setLoading(false);
          return;
        }

        // Apply pass threshold override from invitation if configured
        if (foundInv && foundInv.passThresholdPercentage) {
          asst.passThresholdPercentage = foundInv.passThresholdPercentage;
        }

        setAssessment(asst);

        const uid = foundInv?.applicantId || currentUser?.uid || 'guest_user';
        const history = await getUserAttempts(uid, asst.id);
        setUserAttempts(history);

        // Check if there is an attempt currently in progress
        const inProgress = history.find((a) => a.status === 'IN_PROGRESS');
        if (inProgress) {
          setActiveAttempt(inProgress);
          setAnswers(inProgress.answers || {});

          if (inProgress.expiresAt) {
            const diff = Math.floor(
              (new Date(inProgress.expiresAt).getTime() - new Date().getTime()) / 1000
            );
            setRemainingSeconds(diff > 0 ? diff : 0);
          }
        } else {
          const latestCompleted = history.find(
            (a) => a.status === 'SUBMITTED' || a.status === 'TIMED_OUT'
          );
          if (latestCompleted) {
            setCompletedAttempt(latestCompleted);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize assessment.');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [assessmentId, tokenFromUrl, currentUser]);


  // Countdown Timer Effect
  useEffect(() => {
    if (activeAttempt && remainingSeconds !== null && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeAttempt, remainingSeconds]);

  // Handle Timer Expiration
  const handleTimeExpired = async () => {
    if (!activeAttempt || !assessment) return;
    setAutoSubmittedAlert(true);
    await handleFinalSubmit();
  };

  // Start a New Attempt
  const handleStartExam = async () => {
    if (!assessment) return;
    setLoading(true);
    setError(null);
    try {
      const uid = invitation?.applicantId || currentUser?.uid || 'guest_user';
      const uname = invitation?.applicantName || userProfile?.displayName || currentUser?.email || 'Candidate';
      const uemail = invitation?.applicantEmail || currentUser?.email || 'candidate@example.com';

      const newAttempt = await startAttempt(assessment, uid, uname, uemail);
      setActiveAttempt(newAttempt);
      setCompletedAttempt(null);
      setAnswers(newAttempt.answers || {});
      setCurrentQuestionIndex(0);

      if (newAttempt.expiresAt) {
        const diff = Math.floor(
          (new Date(newAttempt.expiresAt).getTime() - new Date().getTime()) / 1000
        );
        setRemainingSeconds(diff > 0 ? diff : 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start exam attempt.');
    } finally {
      setLoading(false);
    }
  };

  // Select Choice & Auto-Save Progress
  const handleSelectAnswer = async (questionId: string, choiceId: string) => {
    const updatedAnswers = { ...answers, [questionId]: choiceId };
    setAnswers(updatedAnswers);

    if (activeAttempt) {
      saveAnswerProgress(activeAttempt.id, updatedAnswers).catch(console.error);
    }
  };

  // Final Assessment Submission
  const handleFinalSubmit = async () => {
    if (!activeAttempt || !assessment) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await submitAttempt(activeAttempt.id, answers, assessment);

      // If this attempt is linked to an assessment invitation, complete the invitation record
      if (invitation) {
        try {
          await completeInvitationAttempt(invitation.id, result);
        } catch (invErr) {
          console.error('Error completing invitation attempt:', invErr);
        }
      }

      setActiveAttempt(null);
      setCompletedAttempt(result);
      setIsSubmitModalOpen(false);

      // Refresh attempts history
      const uid = invitation?.applicantId || currentUser?.uid || 'guest_user';
      const history = await getUserAttempts(uid, assessment.id);
      setUserAttempts(history);
    } catch (err: any) {
      setError(err.message || 'Failed to submit exam attempt.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper formatting for timer mm:ss
  const formatTimer = (totalSeconds: number | null) => {
    if (totalSeconds === null) return 'Unlimited';
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" label="Preparing Assessment Engine Workspace..." />
      </div>
    );
  }

  // --- RESULT VIEW (COMPLETED EXAM) ---
  if (completedAttempt && !activeAttempt) {
    const passed = completedAttempt.passed;
    const completedCount = userAttempts.filter(
      (a) => a.status === 'SUBMITTED' || a.status === 'TIMED_OUT'
    ).length;
    const canRetake =
      assessment?.maxAttempts === -1 || (assessment && completedCount < assessment.maxAttempts);

    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <Card variant="bordered-orange" className="p-8 text-center space-y-6">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-md ${
              passed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
            }`}
          >
            {passed ? <CheckCircle2 className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
          </div>

          <div className="space-y-2">
            <Badge variant={passed ? 'success' : 'danger'} className="text-xs uppercase font-bold">
              {passed ? 'Assessment Passed' : 'Benchmark Not Met'}
            </Badge>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {completedAttempt.assessmentTitle}
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your test has been automatically graded by the deterministic scoring engine.
            </p>
          </div>

          {/* Score Metric Gauge */}
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl max-w-md mx-auto grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Score</span>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {completedAttempt.score} / {completedAttempt.maxScore}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Percentage</span>
              <p
                className={`text-2xl font-black mt-0.5 ${
                  passed ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {completedAttempt.percentage}%
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Pass Goal</span>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {assessment?.passThresholdPercentage}%
              </p>
            </div>
          </div>

          {/* Breakdown Review of Questions */}
          {assessment?.questions && (
            <div className="text-left space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <List className="w-4 h-4 text-orange-600" /> Question & Answer Review
              </h3>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {assessment.questions.map((q, idx) => {
                  const candidateChoiceId = completedAttempt.answers[q.id];
                  const isQuestionCorrect = candidateChoiceId === q.correctAnswerId;

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        isQuestionCorrect
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-red-50/50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          Q{idx + 1}. {q.text}
                        </span>
                        <Badge variant={isQuestionCorrect ? 'success' : 'danger'}>
                          {isQuestionCorrect ? `+${q.points} pts` : '0 pts'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {q.choices.map((c) => {
                          const isCandidateChoice = candidateChoiceId === c.id;
                          const isCorrectChoice = c.id === q.correctAnswerId;

                          let bgClass = 'bg-white border-slate-200 text-slate-600';
                          if (isCandidateChoice && isCorrectChoice) {
                            bgClass = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold';
                          } else if (isCandidateChoice && !isCorrectChoice) {
                            bgClass = 'bg-red-100 border-red-400 text-red-900 font-bold';
                          } else if (isCorrectChoice) {
                            bgClass = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold';
                          }

                          return (
                            <div key={c.id} className={`p-2 rounded border text-[11px] ${bgClass}`}>
                              {c.text}
                              {isCandidateChoice && ' (Your Choice)'}
                              {isCorrectChoice && ' ✓ Correct'}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <p className="text-[11px] text-slate-500 italic bg-white/80 p-2 rounded border border-slate-100 mt-1">
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            {canRetake && (
              <Button
                variant="primary"
                size="md"
                onClick={handleStartExam}
                className="bg-orange-600 hover:bg-orange-500 font-bold"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" /> Retake Assessment
              </Button>
            )}

            <Button variant="outline" size="md" onClick={() => onNavigate('/portal')}>
              Return to Portal Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // --- PRE-EXAM INSTRUCTION CARD ---
  if (!activeAttempt) {
    const completedCount = userAttempts.filter(
      (a) => a.status === 'SUBMITTED' || a.status === 'TIMED_OUT'
    ).length;
    const attemptsLeft =
      assessment?.maxAttempts && assessment.maxAttempts > 0
        ? assessment.maxAttempts - completedCount
        : 'Unlimited';

    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        {invitation && (
          <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-orange-950 shadow-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-orange-800">
                <Link2 className="w-4 h-4 text-orange-600" /> Assessment Invitation Token
                <span className="font-mono bg-orange-100 text-orange-900 px-2 py-0.5 rounded text-[11px] font-semibold">
                  {invitation.token}
                </span>
              </div>
              <p className="text-slate-600">
                Issued for: <span className="font-semibold text-slate-900">{invitation.applicantName}</span> ({invitation.applicantEmail})
              </p>
              <p className="text-[11px] text-slate-500">
                Programme: <span className="font-medium text-slate-800">{invitation.programmeName}</span>
                {invitation.cohortName && ` • Cohort: ${invitation.cohortName}`}
              </p>
            </div>
            <Badge variant="warning" className="self-start sm:self-center">
              Personalized Link
            </Badge>
          </div>
        )}

        <Card className="p-6 space-y-6">
          <div className="space-y-2 text-center border-b border-slate-100 pb-4">
            <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider block">
              Pre-Admission Skills Testing
            </span>
            <h1 className="text-2xl font-bold text-slate-900">{assessment?.title}</h1>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {assessment?.description ||
                'Evaluate your readiness and technical proficiency for programme entry.'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Duration</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {assessment?.durationMinutes ? `${assessment.durationMinutes} Minutes` : 'Unlimited'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Pass Goal</span>
              <p className="font-bold text-emerald-600 text-sm mt-0.5">
                {assessment?.passThresholdPercentage}% Benchmark
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Attempts Left</span>
              <p className="font-bold text-orange-600 text-sm mt-0.5">{attemptsLeft}</p>
            </div>
          </div>

          <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-xl space-y-2 text-xs text-orange-900">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-orange-600" /> Exam Rules & Auto-Saving
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              <li>Answers are automatically saved as you select option choices.</li>
              <li>Once started, the countdown timer runs continuously.</li>
              <li>If the timer expires, your saved answers will be automatically submitted.</li>
            </ul>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <Button
            variant="primary"
            size="lg"
            onClick={handleStartExam}
            className="w-full bg-orange-600 hover:bg-orange-500 font-bold"
          >
            Start Assessment Now <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Card>
      </div>
    );
  }

  // --- ACTIVE EXAM RUNNER ---
  const questionsList = assessment?.questions || [];
  const currentQ = questionsList[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Top Exam Header with Live Timer & Progress */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider block">
            Exam In Progress — {assessment?.title}
          </span>
          <p className="text-xs text-slate-300">
            Question <span className="font-bold text-white">{currentQuestionIndex + 1}</span> of{' '}
            <span className="font-bold text-white">{questionsList.length}</span> ({answeredCount} Answered)
          </p>
        </div>

        {/* Live Countdown Timer */}
        {remainingSeconds !== null && (
          <div
            className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-mono text-sm font-bold ${
              remainingSeconds < 120
                ? 'bg-red-500/20 text-red-400 border-red-500 animate-pulse'
                : 'bg-slate-800 text-orange-400 border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>
        )}
      </div>

      {autoSubmittedAlert && (
        <Alert type="warning">
          Time expired! Your assessment answers are being auto-submitted...
        </Alert>
      )}

      {/* Question Navigator Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {questionsList.map((q, idx) => {
          const isAnswered = Boolean(answers[q.id]);
          const isCurrent = idx === currentQuestionIndex;

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentQuestionIndex(idx)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                isCurrent
                  ? 'bg-orange-600 text-white ring-2 ring-orange-500/30'
                  : isAnswered
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Active Question Card */}
      {currentQ && (
        <Card className="p-6 space-y-6">
          <div className="space-y-2 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-[10px]">
                {currentQ.type === 'TRUE_FALSE' ? 'True / False' : 'Multiple Choice'}
              </Badge>
              <span className="text-xs font-bold text-slate-500">{currentQ.points || 10} Points</span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {currentQuestionIndex + 1}. {currentQ.text}
            </h2>
          </div>

          {/* Answer Option Choices */}
          <div className="space-y-3">
            {currentQ.choices.map((choice) => {
              const isSelected = answers[currentQ.id] === choice.id;

              return (
                <div
                  key={choice.id}
                  onClick={() => handleSelectAnswer(currentQ.id, choice.id)}
                  className={`p-4 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{choice.text}</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-orange-600 bg-orange-600 text-white' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Previous Question
            </Button>

            {currentQuestionIndex < questionsList.length - 1 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                className="bg-orange-600 hover:bg-orange-500 font-bold"
              >
                Next Question <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsSubmitModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold"
              >
                Submit Exam
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Final Submission Modal */}
      {isSubmitModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsSubmitModalOpen(false)}
          title="Submit Assessment?"
          description={`You have answered ${answeredCount} of ${questionsList.length} questions.`}
        >
          <div className="space-y-4 text-xs">
            {answeredCount < questionsList.length && (
              <Alert type="warning">
                You have {questionsList.length - answeredCount} unanswered questions remaining. Unanswered questions will receive 0 points.
              </Alert>
            )}

            <p className="text-slate-600">
              Are you sure you want to finish and submit your answers for automatic grading?
            </p>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsSubmitModalOpen(false)}>
                Continue Exam
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleFinalSubmit}
                isLoading={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold"
              >
                Confirm Submission
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
