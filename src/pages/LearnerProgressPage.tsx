import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToProgressRules,
  subscribeToLearnerProgress,
  calculateProgressFromInputs,
  saveLearnerProgressScore,
  DEFAULT_PROGRESS_RULE,
} from '../services/progressEngine';
import {
  subscribeToAssignmentsList,
  subscribeToSubmissionsList,
} from '../services/assignments';
import { subscribeToAttendanceRecords } from '../services/attendance';
import { subscribeToAssessments, getUserAttempts } from '../services/assessments';
import {
  ProgressRuleConfig,
  LearnerProgressScore,
  ProgressStatusType,
  AssignmentItem,
  AssignmentSubmissionItem,
  Assessment,
  AssessmentAttempt,
} from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  CalendarCheck,
  HelpCircle,
  BookOpen,
  Layers,
  Sparkles,
  ArrowRight,
  Sliders,
} from 'lucide-react';

interface LearnerProgressPageProps {
  learnerId?: string;
  learnerName?: string;
  learnerEmail?: string;
  programmeId?: string;
  programmeName?: string;
  cohortId?: string;
  cohortName?: string;
  onNavigate?: (path: string) => void;
}

export const LearnerProgressPage: React.FC<LearnerProgressPageProps> = ({
  learnerId,
  learnerName,
  learnerEmail,
  programmeId = 'ALL',
  programmeName = 'All Programmes',
  cohortId = 'ALL',
  cohortName = 'All Cohorts',
  onNavigate,
}) => {
  const { currentUser, userProfile } = useAuth();
  const activeUid = learnerId || currentUser?.uid || 'learner_1';
  const activeName = learnerName || userProfile?.displayName || 'Active Learner';
  const activeEmail = learnerEmail || userProfile?.email || 'learner@platform.org';

  // Rule Config & Calculated Progress
  const [activeRule, setActiveRule] = useState<ProgressRuleConfig>(DEFAULT_PROGRESS_RULE);
  const [calculatedScore, setCalculatedScore] = useState<LearnerProgressScore | null>(null);

  // Dynamic Scores (0-100)
  const [attendanceScore, setAttendanceScore] = useState<number>(85);
  const [assignmentsScore, setAssignmentsScore] = useState<number>(88);
  const [assessmentsScore, setAssessmentsScore] = useState<number>(82);
  const [finalAssessmentScore, setFinalAssessmentScore] = useState<number>(90);
  const [finalProjectScore, setFinalProjectScore] = useState<number>(85);

  useEffect(() => {
    // Subscribe to Rules
    const unsubRules = subscribeToProgressRules((rules) => {
      const match = rules.find((r) => r.programmeId === programmeId) || rules.find((r) => r.programmeId === 'ALL') || DEFAULT_PROGRESS_RULE;
      setActiveRule(match);
    });

    // Subscribe to calculated progress if available
    const unsubProgress = subscribeToLearnerProgress(programmeId, cohortId, activeUid, (scores) => {
      if (scores.length > 0) {
        setCalculatedScore(scores[0]);
        setAttendanceScore(scores[0].attendanceScore);
        setAssignmentsScore(scores[0].assignmentsScore);
        setAssessmentsScore(scores[0].assessmentsScore);
        setFinalAssessmentScore(scores[0].finalAssessmentScore);
        setFinalProjectScore(scores[0].finalProjectScore);
      }
    });

    return () => {
      unsubRules();
      unsubProgress();
    };
  }, [programmeId, cohortId, activeUid]);

  // Recalculate score live using active rule weights
  const { overallWeightedScore, status } = calculateProgressFromInputs(
    {
      attendanceScore,
      assignmentsScore,
      assessmentsScore,
      finalAssessmentScore,
      finalProjectScore,
    },
    activeRule
  );

  // Auto-save calculated score to Firestore for PM visibility
  useEffect(() => {
    const payload: LearnerProgressScore = {
      learnerId: activeUid,
      learnerName: activeName,
      learnerEmail: activeEmail,
      programmeId,
      programmeName,
      cohortId,
      cohortName,
      attendanceScore,
      assignmentsScore,
      assessmentsScore,
      finalAssessmentScore,
      finalProjectScore,
      overallWeightedScore,
      status,
      lastCalculatedAt: new Date().toISOString(),
    };

    saveLearnerProgressScore(payload).catch((err) => console.warn('Progress sync warning:', err));
  }, [
    activeUid,
    activeName,
    activeEmail,
    programmeId,
    programmeName,
    cohortId,
    cohortName,
    attendanceScore,
    assignmentsScore,
    assessmentsScore,
    finalAssessmentScore,
    finalProjectScore,
    overallWeightedScore,
    status,
  ]);

  // Status Styling Config
  const statusConfig: Record<
    ProgressStatusType,
    { label: string; color: string; badge: 'success' | 'warning' | 'danger' | 'purple'; icon: React.ReactNode; desc: string }
  > = {
    COMPLETED: {
      label: 'COMPLETED',
      color: 'bg-emerald-500 text-white border-emerald-600',
      badge: 'success',
      icon: <Award className="w-5 h-5 text-emerald-600" />,
      desc: 'Congratulations! You have fulfilled all core academic requirements and achieved programme completion criteria.',
    },
    ON_TRACK: {
      label: 'ON TRACK',
      color: 'bg-emerald-500 text-white border-emerald-600',
      badge: 'success',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      desc: 'Great performance! Your overall progress meets or exceeds programme benchmarks across coursework, attendance, and assessments.',
    },
    AT_RISK: {
      label: 'AT RISK',
      color: 'bg-amber-500 text-white border-amber-600',
      badge: 'warning',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      desc: 'Attention required! Your progress score is below optimal targets. Focus on completing missing lab assignments and upcoming quizzes.',
    },
    CRITICAL: {
      label: 'CRITICAL',
      color: 'bg-rose-500 text-white border-rose-600',
      badge: 'danger',
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
      desc: 'Immediate intervention needed. Your performance is significantly behind programme benchmarks. Reach out to your facilitator.',
    },
  };

  const activeStatusMeta = statusConfig[status];

  return (
    <div className="space-y-6">
      {/* Top Overview Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
              <TrendingUp className="w-4 h-4" /> Academic Progress Engine
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Learner Progress & Performance Breakdown
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time progress score calculated using configured programme weights across attendance, assignments, assessments, final assessment, and final capstone project.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Overall Score</span>
              <span className="text-2xl font-bold text-slate-900">{overallWeightedScore}%</span>
            </div>
            <Badge variant={activeStatusMeta.badge} size="lg" className="px-3.5 py-1.5 text-xs font-bold uppercase">
              {activeStatusMeta.label}
            </Badge>
          </div>
        </div>

        {/* Big Weighted Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Overall Weighted Completion</span>
            <span>{overallWeightedScore}% / 100%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                status === 'COMPLETED' || status === 'ON_TRACK'
                  ? 'bg-emerald-600'
                  : status === 'AT_RISK'
                  ? 'bg-amber-500'
                  : 'bg-rose-600'
              }`}
              style={{ width: `${overallWeightedScore}%` }}
            />
          </div>
        </div>

        {/* Status Advisory Banner */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3 text-xs">
          <div className="shrink-0 mt-0.5">{activeStatusMeta.icon}</div>
          <p className="text-slate-700 leading-relaxed">{activeStatusMeta.desc}</p>
        </div>
      </div>

      {/* Active Weighting Rules Info Bar */}
      <Card className="p-4 bg-slate-900 text-white border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
            <Sliders className="w-4 h-4" /> Active Programme Weighting Rules
          </div>
          <span className="text-[11px] text-slate-400">Target Rule: {activeRule.programmeName || 'Default Config'}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block uppercase">Attendance Weight</span>
            <strong className="text-orange-400 text-sm">{activeRule.attendanceWeight}%</strong>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block uppercase">Assignments Weight</span>
            <strong className="text-orange-400 text-sm">{activeRule.assignmentsWeight}%</strong>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block uppercase">Assessments Weight</span>
            <strong className="text-orange-400 text-sm">{activeRule.assessmentsWeight}%</strong>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block uppercase">Final Assessment</span>
            <strong className="text-orange-400 text-sm">{activeRule.finalAssessmentWeight}%</strong>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block uppercase">Final Capstone Project</span>
            <strong className="text-orange-400 text-sm">{activeRule.finalProjectWeight}%</strong>
          </div>
        </div>
      </Card>

      {/* 5 Core Input Dimensions Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Attendance */}
        <Card className="p-5 bg-white border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Attendance</h3>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              Weight: {activeRule.attendanceWeight}%
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold text-slate-900">{attendanceScore}%</span>
            <span className="text-xs font-bold text-emerald-700">
              {attendanceScore >= 80 ? 'Satisfactory' : 'Needs Work'}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${attendanceScore}%` }} />
          </div>

          <p className="text-[11px] text-slate-500">
            Measures presence across live classes, mandatory workshop sessions, and lab check-ins.
          </p>
        </Card>

        {/* 2. Coursework Assignments */}
        <Card className="p-5 bg-white border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <FileCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Lab Assignments</h3>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              Weight: {activeRule.assignmentsWeight}%
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold text-slate-900">{assignmentsScore}%</span>
            <span className="text-xs font-bold text-blue-700">
              {assignmentsScore >= 80 ? 'Good Standing' : 'Pending Labs'}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${assignmentsScore}%` }} />
          </div>

          <p className="text-[11px] text-slate-500">
            Evaluates weekly coding submissions, project URL deliverables, and repository commits.
          </p>
        </Card>

        {/* 3. Module Quizzes & Assessments */}
        <Card className="p-5 bg-white border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Module Assessments</h3>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              Weight: {activeRule.assessmentsWeight}%
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold text-slate-900">{assessmentsScore}%</span>
            <span className="text-xs font-bold text-purple-700">
              {assessmentsScore >= 75 ? 'Passed Quizzes' : 'Review Topics'}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-600 h-full rounded-full" style={{ width: `${assessmentsScore}%` }} />
          </div>

          <p className="text-[11px] text-slate-500">
            Multiple choice quizzes, knowledge checks, and timed module assessments.
          </p>
        </Card>

        {/* 4. Final Comprehensive Assessment */}
        <Card className="p-5 bg-white border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Final Assessment</h3>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              Weight: {activeRule.finalAssessmentWeight}%
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold text-slate-900">{finalAssessmentScore}%</span>
            <span className="text-xs font-bold text-amber-700">
              {finalAssessmentScore >= 80 ? 'Mastery' : 'Needs Review'}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${finalAssessmentScore}%` }} />
          </div>

          <p className="text-[11px] text-slate-500">
            End-of-programme proctored exam testing complete domain architecture knowledge.
          </p>
        </Card>

        {/* 5. Final Capstone Project */}
        <Card className="p-5 bg-white border-slate-200 space-y-3 md:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Final Capstone Project</h3>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              Weight: {activeRule.finalProjectWeight}%
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold text-slate-900">{finalProjectScore}%</span>
            <span className="text-xs font-bold text-orange-700">
              {finalProjectScore >= 80 ? 'Production Approved' : 'In Progress'}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-orange-600 h-full rounded-full" style={{ width: `${finalProjectScore}%` }} />
          </div>

          <p className="text-[11px] text-slate-500">
            Full-stack capstone application build evaluated on system architecture, deployment, code quality, and final live presentation.
          </p>
        </Card>
      </div>

      {/* Recommendations & Next Steps Card */}
      <Card className="p-5 bg-white border-slate-200 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-orange-600" /> Actionable Next Steps & Improvement Plan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <strong className="text-slate-900 font-bold block">1. Complete Pending Labs</strong>
            <p className="text-slate-600 text-[11px]">Check your assignments directory for any overdue lab deliverables or resubmission feedback.</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <strong className="text-slate-900 font-bold block">2. Attend Office Hours</strong>
            <p className="text-slate-600 text-[11px]">Schedule 1-on-1 office hours with your facilitator to review difficult AI model topics.</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <strong className="text-slate-900 font-bold block">3. Prepare Capstone Demo</strong>
            <p className="text-slate-600 text-[11px]">Finalize your repository README, deploy to Cloud Run, and submit live demo links.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
