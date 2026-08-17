import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToProgressRules,
  subscribeToLearnerProgress,
  saveProgressRule,
  saveLearnerProgressScore,
  calculateProgressFromInputs,
  DEFAULT_PROGRESS_RULE,
} from '../services/progressEngine';
import { getProgrammes, getCohorts } from '../services/programmes';
import { subscribeToAllEnrolments } from '../services/learners';
import {
  ProgressRuleConfig,
  LearnerProgressScore,
  ProgressStatusType,
  Programme,
  Cohort,
  Enrolment,
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
  TrendingUp,
  Sliders,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Award,
  Search,
  Filter,
  Edit,
  Save,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';

interface PMProgressDashboardProps {
  onNavigate?: (path: string) => void;
}

export const PMProgressDashboard: React.FC<PMProgressDashboardProps> = ({ onNavigate }) => {
  const { userProfile } = useAuth();

  // Data States
  const [rules, setRules] = useState<ProgressRuleConfig[]>([]);
  const [scoresList, setScoresList] = useState<LearnerProgressScore[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters
  const [programmeFilter, setProgrammeFilter] = useState<string>('ALL');
  const [cohortFilter, setCohortFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Rules Configuration Modal State
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [selectedRuleProgrammeId, setSelectedRuleProgrammeId] = useState<string>('ALL');
  const [attWeight, setAttWeight] = useState<number>(20);
  const [assWeight, setAssWeight] = useState<number>(25);
  const [quizWeight, setQuizWeight] = useState<number>(20);
  const [faWeight, setFaWeight] = useState<number>(15);
  const [fpWeight, setFpWeight] = useState<number>(20);

  const [completedThresh, setCompletedThresh] = useState<number>(80);
  const [onTrackThresh, setOnTrackThresh] = useState<number>(70);
  const [atRiskThresh, setAtRiskThresh] = useState<number>(50);

  const [isSavingRule, setIsSavingRule] = useState(false);

  // Score Adjustment Modal State for a specific Learner
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [editingLearner, setEditingLearner] = useState<LearnerProgressScore | null>(null);
  const [editAttScore, setEditAttScore] = useState<number>(85);
  const [editAssScore, setEditAssScore] = useState<number>(85);
  const [editQuizScore, setEditQuizScore] = useState<number>(85);
  const [editFaScore, setEditFaScore] = useState<number>(85);
  const [editFpScore, setEditFpScore] = useState<number>(85);
  const [isSavingScore, setIsSavingScore] = useState(false);

  // Load subscriptions & data
  useEffect(() => {
    setLoading(true);

    const unsubRules = subscribeToProgressRules((rList) => {
      setRules(rList);
    });

    const unsubScores = subscribeToLearnerProgress(
      programmeFilter,
      cohortFilter,
      undefined,
      (sList) => {
        setScoresList(sList);
        setLoading(false);
      }
    );

    const unsubEnrolments = subscribeToAllEnrolments((eList) => {
      setEnrolments(eList);
    });

    getProgrammes().then((p) => setProgrammes(p)).catch(console.error);
    getCohorts().then((c) => setCohorts(c)).catch(console.error);

    return () => {
      unsubRules();
      unsubScores();
      unsubEnrolments();
    };
  }, [programmeFilter, cohortFilter]);

  // Determine active rule for selected programme filter
  const activeRuleConfig =
    rules.find((r) => r.programmeId === programmeFilter) ||
    rules.find((r) => r.programmeId === 'ALL') ||
    DEFAULT_PROGRESS_RULE;

  // Open Config Rules Modal
  const handleOpenRulesModal = () => {
    setSelectedRuleProgrammeId(programmeFilter);
    setAttWeight(activeRuleConfig.attendanceWeight);
    setAssWeight(activeRuleConfig.assignmentsWeight);
    setQuizWeight(activeRuleConfig.assessmentsWeight);
    setFaWeight(activeRuleConfig.finalAssessmentWeight);
    setFpWeight(activeRuleConfig.finalProjectWeight);

    setCompletedThresh(activeRuleConfig.completedThreshold);
    setOnTrackThresh(activeRuleConfig.onTrackThreshold);
    setAtRiskThresh(activeRuleConfig.atRiskThreshold);

    setIsRulesModalOpen(true);
    setActionError(null);
  };

  // Save Configured Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const sum = attWeight + assWeight + quizWeight + faWeight + fpWeight;
    if (sum !== 100) {
      setActionError(`Weights must sum to 100%. Current sum: ${sum}%`);
      return;
    }

    setIsSavingRule(true);
    setActionError(null);

    const selProg = programmes.find((p) => p.id === selectedRuleProgrammeId);

    try {
      await saveProgressRule({
        programmeId: selectedRuleProgrammeId,
        programmeName: selProg?.title || 'All Programmes',
        attendanceWeight: attWeight,
        assignmentsWeight: assWeight,
        assessmentsWeight: quizWeight,
        finalAssessmentWeight: faWeight,
        finalProjectWeight: fpWeight,
        completedThreshold: completedThresh,
        onTrackThreshold: onTrackThresh,
        atRiskThreshold: atRiskThresh,
        updatedBy: userProfile?.email || 'pm@platform.org',
      });

      setActionSuccess('Progress calculation rules updated successfully!');
      setIsRulesModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save rules.');
    } finally {
      setIsSavingRule(false);
    }
  };

  // Open Score Modal for Learner
  const handleOpenScoreModal = (score: LearnerProgressScore) => {
    setEditingLearner(score);
    setEditAttScore(score.attendanceScore);
    setEditAssScore(score.assignmentsScore);
    setEditQuizScore(score.assessmentsScore);
    setEditFaScore(score.finalAssessmentScore);
    setEditFpScore(score.finalProjectScore);

    setIsScoreModalOpen(true);
    setActionError(null);
  };

  // Save Score Adjustment
  const handleSaveScoreAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLearner) return;

    setIsSavingScore(true);
    setActionError(null);

    const ruleForLearner =
      rules.find((r) => r.programmeId === editingLearner.programmeId) ||
      rules.find((r) => r.programmeId === 'ALL') ||
      DEFAULT_PROGRESS_RULE;

    const { overallWeightedScore, status } = calculateProgressFromInputs(
      {
        attendanceScore: editAttScore,
        assignmentsScore: editAssScore,
        assessmentsScore: editQuizScore,
        finalAssessmentScore: editFaScore,
        finalProjectScore: editFpScore,
      },
      ruleForLearner
    );

    try {
      await saveLearnerProgressScore({
        ...editingLearner,
        attendanceScore: editAttScore,
        assignmentsScore: editAssScore,
        assessmentsScore: editQuizScore,
        finalAssessmentScore: editFaScore,
        finalProjectScore: editFpScore,
        overallWeightedScore,
        status,
        lastCalculatedAt: new Date().toISOString(),
      });

      setActionSuccess(`Progress scores updated for ${editingLearner.learnerName}.`);
      setIsScoreModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save score.');
    } finally {
      setIsSavingScore(false);
    }
  };

  // Filtered Roster
  const filteredScores = scoresList.filter((s) => {
    const matchesProgramme = programmeFilter === 'ALL' || s.programmeId === programmeFilter;
    const matchesCohort = cohortFilter === 'ALL' || s.cohortId === cohortFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.learnerName.toLowerCase().includes(q) ||
      s.learnerEmail.toLowerCase().includes(q) ||
      s.programmeName.toLowerCase().includes(q);

    return matchesProgramme && matchesCohort && matchesStatus && matchesSearch;
  });

  // Calculate Summary Counts
  const totalCount = filteredScores.length;
  const completedCount = filteredScores.filter((s) => s.status === 'COMPLETED').length;
  const onTrackCount = filteredScores.filter((s) => s.status === 'ON_TRACK').length;
  const atRiskCount = filteredScores.filter((s) => s.status === 'AT_RISK').length;
  const criticalCount = filteredScores.filter((s) => s.status === 'CRITICAL').length;

  const avgScoreSum = filteredScores.reduce((acc, curr) => acc + curr.overallWeightedScore, 0);
  const avgProgressScore = totalCount > 0 ? (avgScoreSum / totalCount).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" /> Programme Manager Dashboard
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Progress Engine & Learner Performance Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Calculate learner progress using configurable weights across attendance, lab assignments, assessments, final assessment, and final project. Categorize status automatically.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenRulesModal}
          className="font-bold shadow-xs whitespace-nowrap"
        >
          <Sliders className="w-4 h-4 mr-1.5" /> Configure Calculation Rules
        </Button>
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

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 bg-white border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Avg Progress Score</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-slate-900">{avgProgressScore}%</p>
            <TrendingUp className="w-4 h-4 text-orange-600" />
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-orange-600 h-full rounded-full" style={{ width: `${avgProgressScore}%` }} />
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Total Enrolled</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-slate-900">{totalCount}</p>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Active roster count</p>
        </Card>

        <Card className="p-3.5 bg-emerald-50/60 border-emerald-200">
          <p className="text-[10px] font-bold text-emerald-900 uppercase">On Track</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-emerald-900">{onTrackCount}</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-[10px] text-emerald-700 mt-2">&gt;= {activeRuleConfig.onTrackThreshold}% benchmark</p>
        </Card>

        <Card className="p-3.5 bg-purple-50/60 border-purple-200">
          <p className="text-[10px] font-bold text-purple-900 uppercase">Completed</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-purple-900">{completedCount}</p>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-[10px] text-purple-700 mt-2">&gt;= {activeRuleConfig.completedThreshold}% fulfilled</p>
        </Card>

        <Card className="p-3.5 bg-amber-50/60 border-amber-200">
          <p className="text-[10px] font-bold text-amber-900 uppercase">At Risk</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-amber-900">{atRiskCount}</p>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-[10px] text-amber-700 mt-2">Needs intervention</p>
        </Card>

        <Card className="p-3.5 bg-rose-50/60 border-rose-200">
          <p className="text-[10px] font-bold text-rose-900 uppercase">Critical</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-rose-900">{criticalCount}</p>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-[10px] text-rose-700 mt-2">&lt; {activeRuleConfig.atRiskThreshold}% benchmark</p>
        </Card>
      </div>

      {/* Active Rules & Weights Information Bar */}
      <Card className="p-4 bg-slate-900 text-white border-slate-800 space-y-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-orange-400" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
              Active Weights for {activeRuleConfig.programmeName || 'Selected Rule'}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenRulesModal}
            className="text-[10px] text-orange-400 border-slate-700 hover:bg-slate-800 p-1.5 h-7"
          >
            Edit Weights & Thresholds
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px] pt-1">
          <div className="bg-slate-800 p-1.5 rounded">
            <span className="text-slate-400 block text-[10px]">Attendance</span>
            <strong className="text-orange-400">{activeRuleConfig.attendanceWeight}%</strong>
          </div>
          <div className="bg-slate-800 p-1.5 rounded">
            <span className="text-slate-400 block text-[10px]">Assignments</span>
            <strong className="text-orange-400">{activeRuleConfig.assignmentsWeight}%</strong>
          </div>
          <div className="bg-slate-800 p-1.5 rounded">
            <span className="text-slate-400 block text-[10px]">Assessments</span>
            <strong className="text-orange-400">{activeRuleConfig.assessmentsWeight}%</strong>
          </div>
          <div className="bg-slate-800 p-1.5 rounded">
            <span className="text-slate-400 block text-[10px]">Final Assessment</span>
            <strong className="text-orange-400">{activeRuleConfig.finalAssessmentWeight}%</strong>
          </div>
          <div className="bg-slate-800 p-1.5 rounded">
            <span className="text-slate-400 block text-[10px]">Final Capstone</span>
            <strong className="text-orange-400">{activeRuleConfig.finalProjectWeight}%</strong>
          </div>
        </div>
      </Card>

      {/* Main Filter & Roster Card */}
      <Card className="bg-white border-slate-200 overflow-hidden space-y-4 p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'ALL', label: 'All Programmes' },
                  ...(programmes || []).map((p) => ({ value: p.id, label: p.name || (p as any).title || p.id })),
                ]}
                value={programmeFilter}
                onChange={(e) => setProgrammeFilter(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-44">
              <Select
                options={[
                  { value: 'ALL', label: 'All Cohorts' },
                  ...(cohorts || []).map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={cohortFilter}
                onChange={(e) => setCohortFilter(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-44">
              <Select
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'ON_TRACK', label: 'ON TRACK' },
                  { value: 'COMPLETED', label: 'COMPLETED' },
                  { value: 'AT_RISK', label: 'AT RISK' },
                  { value: 'CRITICAL', label: 'CRITICAL' },
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full md:w-56">
            <Input
              placeholder="Search learner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Spinner size="lg" label="Calculating learner progress scores..." />
          </div>
        ) : filteredScores.length === 0 ? (
          <div className="p-8 text-center">
            <EmptyState
              title="No learner progress records found"
              description="Progress scores will automatically update as learners attend classes and complete assignments."
            />
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-slate-100 pt-2">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Learner</th>
                  <th className="p-3.5">Attendance</th>
                  <th className="p-3.5">Assignments</th>
                  <th className="p-3.5">Quizzes</th>
                  <th className="p-3.5">Final Exam</th>
                  <th className="p-3.5">Capstone</th>
                  <th className="p-3.5">Weighted Score</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredScores.map((s) => {
                  const badgeVariant: 'success' | 'warning' | 'danger' | 'purple' =
                    s.status === 'COMPLETED'
                      ? 'purple'
                      : s.status === 'ON_TRACK'
                      ? 'success'
                      : s.status === 'AT_RISK'
                      ? 'warning'
                      : 'danger';

                  return (
                    <tr key={s.learnerId} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{s.learnerName}</div>
                        <div className="text-[11px] text-slate-500">{s.learnerEmail}</div>
                      </td>

                      <td className="p-3.5 font-semibold text-slate-700">{s.attendanceScore}%</td>
                      <td className="p-3.5 font-semibold text-slate-700">{s.assignmentsScore}%</td>
                      <td className="p-3.5 font-semibold text-slate-700">{s.assessmentsScore}%</td>
                      <td className="p-3.5 font-semibold text-slate-700">{s.finalAssessmentScore}%</td>
                      <td className="p-3.5 font-semibold text-slate-700">{s.finalProjectScore}%</td>

                      <td className="p-3.5 font-bold text-slate-900 text-sm">
                        {s.overallWeightedScore}%
                      </td>

                      <td className="p-3.5">
                        <Badge variant={badgeVariant} size="sm" className="font-bold">
                          {s.status}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenScoreModal(s)}
                          className="text-xs font-semibold"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" /> Adjust Scores
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CONFIGURE RULES MODAL */}
      <Modal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        title="Configure Progress Engine Rules & Weights"
      >
        <form onSubmit={handleSaveRule} className="space-y-4 pt-2">
          <Select
            label="Target Programme Rule"
            options={[
              { value: 'ALL', label: 'All Programmes (Default Rule)' },
              ...(programmes || []).map((p) => ({ value: p.id, label: p.name || (p as any).title || p.id })),
            ]}
            value={selectedRuleProgrammeId}
            onChange={(e) => setSelectedRuleProgrammeId(e.target.value)}
          />

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
            <strong className="block font-bold mb-1">Weight Allocation Rule (Must sum to 100%):</strong>
            Configure the percentage influence of each input component on the final weighted progress score.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Attendance Weight (%)"
              type="number"
              min={0}
              max={100}
              value={attWeight}
              onChange={(e) => setAttWeight(Number(e.target.value))}
              required
            />

            <Input
              label="Lab Assignments Weight (%)"
              type="number"
              min={0}
              max={100}
              value={assWeight}
              onChange={(e) => setAssWeight(Number(e.target.value))}
              required
            />

            <Input
              label="Assessments / Quizzes Weight (%)"
              type="number"
              min={0}
              max={100}
              value={quizWeight}
              onChange={(e) => setQuizWeight(Number(e.target.value))}
              required
            />

            <Input
              label="Final Assessment Weight (%)"
              type="number"
              min={0}
              max={100}
              value={faWeight}
              onChange={(e) => setFaWeight(Number(e.target.value))}
              required
            />

            <Input
              label="Final Capstone Project Weight (%)"
              type="number"
              min={0}
              max={100}
              value={fpWeight}
              onChange={(e) => setFpWeight(Number(e.target.value))}
              required
            />

            <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between font-bold text-xs">
              <span>Total Sum:</span>
              <span className={attWeight + assWeight + quizWeight + faWeight + fpWeight === 100 ? 'text-emerald-700' : 'text-rose-600'}>
                {attWeight + assWeight + quizWeight + faWeight + fpWeight}%
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Status Threshold Rules (%)</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="COMPLETED Benchmark (%)"
                type="number"
                value={completedThresh}
                onChange={(e) => setCompletedThresh(Number(e.target.value))}
                required
              />

              <Input
                label="ON TRACK Benchmark (%)"
                type="number"
                value={onTrackThresh}
                onChange={(e) => setOnTrackThresh(Number(e.target.value))}
                required
              />

              <Input
                label="AT RISK Benchmark (%)"
                type="number"
                value={atRiskThresh}
                onChange={(e) => setAtRiskThresh(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRulesModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingRule}
              className="font-bold shadow-xs"
            >
              {isSavingRule ? <Spinner size="sm" /> : 'Save Progress Rules'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ADJUST SCORE MODAL */}
      <Modal
        isOpen={isScoreModalOpen}
        onClose={() => setIsScoreModalOpen(false)}
        title={`Adjust Progress Scores: ${editingLearner?.learnerName || ''}`}
      >
        <form onSubmit={handleSaveScoreAdjustment} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Attendance Score (%)"
              type="number"
              min={0}
              max={100}
              value={editAttScore}
              onChange={(e) => setEditAttScore(Number(e.target.value))}
              required
            />

            <Input
              label="Lab Assignments Score (%)"
              type="number"
              min={0}
              max={100}
              value={editAssScore}
              onChange={(e) => setEditAssScore(Number(e.target.value))}
              required
            />

            <Input
              label="Assessments Score (%)"
              type="number"
              min={0}
              max={100}
              value={editQuizScore}
              onChange={(e) => setEditQuizScore(Number(e.target.value))}
              required
            />

            <Input
              label="Final Assessment Score (%)"
              type="number"
              min={0}
              max={100}
              value={editFaScore}
              onChange={(e) => setEditFaScore(Number(e.target.value))}
              required
            />

            <Input
              label="Final Capstone Project Score (%)"
              type="number"
              min={0}
              max={100}
              value={editFpScore}
              onChange={(e) => setEditFpScore(Number(e.target.value))}
              required
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsScoreModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingScore}
              className="font-bold shadow-xs"
            >
              {isSavingScore ? <Spinner size="sm" /> : 'Save Score Adjustment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
