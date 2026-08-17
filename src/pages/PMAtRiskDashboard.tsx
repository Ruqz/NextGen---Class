import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  UserX,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  Calendar,
  FileText,
  ShieldAlert,
  ArrowRight,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import {
  RiskRuleConfig,
  InterventionRecord,
  FlaggedAtRiskLearner,
  RiskLevel,
  InterventionOutcome,
} from '../types';
import {
  subscribeToRiskRuleConfigs,
  saveRiskRuleConfig,
  subscribeToInterventions,
  createIntervention,
  updateIntervention,
  deleteIntervention,
  autoEvaluateAtRiskLearners,
  DEFAULT_RISK_RULE,
} from '../services/atRisk';

interface PMAtRiskDashboardProps {
  onNavigate?: (path: string) => void;
}

export const PMAtRiskDashboard: React.FC<PMAtRiskDashboardProps> = ({ onNavigate }) => {
  // State
  const [activeTab, setActiveTab] = useState<'flagged' | 'interventions'>('flagged');
  const [ruleConfig, setRuleConfig] = useState<RiskRuleConfig>(DEFAULT_RISK_RULE);
  const [interventions, setInterventions] = useState<InterventionRecord[]>([]);
  const [flaggedLearners, setFlaggedLearners] = useState<FlaggedAtRiskLearner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);

  // Filters
  const [selectedProgramme, setSelectedProgramme] = useState<string>('ALL');
  const [selectedCohort, setSelectedCohort] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('ALL');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('ALL');

  // Modals
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);
  const [showInterventionModal, setShowInterventionModal] = useState<boolean>(false);
  const [editingIntervention, setEditingIntervention] = useState<InterventionRecord | null>(null);

  // Rule Config Form State
  const [ruleForm, setRuleForm] = useState<Partial<RiskRuleConfig>>({
    attendanceMinThreshold: 80,
    missedAssignmentsMaxThreshold: 2,
    assessmentScoreMinThreshold: 70,
    inactivityDaysMaxThreshold: 7,
  });

  // Intervention Form State
  const [interventionForm, setInterventionForm] = useState<{
    learnerId: string;
    learnerName: string;
    learnerEmail: string;
    programmeId: string;
    programmeName: string;
    cohortId: string;
    cohortName: string;
    reason: string;
    riskLevel: RiskLevel;
    action: string;
    assignedStaffName: string;
    assignedStaffRole: string;
    followUpDate: string;
    outcome: InterventionOutcome;
    notes: string;
  }>({
    learnerId: '',
    learnerName: '',
    learnerEmail: '',
    programmeId: 'prog_ai_eng',
    programmeName: 'AI & Machine Learning Engineering',
    cohortId: 'cohort_2026_q1',
    cohortName: 'Cohort 2026-Q1',
    reason: '',
    riskLevel: 'HIGH',
    action: '',
    assignedStaffName: 'Dr. Evelyn Vance',
    assignedStaffRole: 'Programme Manager',
    followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    outcome: 'PENDING',
    notes: '',
  });

  // Load Rule Configs & Interventions
  useEffect(() => {
    setLoading(true);

    const unsubRules = subscribeToRiskRuleConfigs((configs) => {
      const activeRule = configs.find((c) => c.programmeId === selectedProgramme) || configs[0] || DEFAULT_RISK_RULE;
      setRuleConfig(activeRule);
      setRuleForm({
        attendanceMinThreshold: activeRule.attendanceMinThreshold,
        missedAssignmentsMaxThreshold: activeRule.missedAssignmentsMaxThreshold,
        assessmentScoreMinThreshold: activeRule.assessmentScoreMinThreshold,
        inactivityDaysMaxThreshold: activeRule.inactivityDaysMaxThreshold,
      });
    });

    const unsubInterventions = subscribeToInterventions(
      selectedProgramme,
      selectedCohort,
      (records) => {
        setInterventions(records);
        setLoading(false);
      }
    );

    return () => {
      unsubRules();
      unsubInterventions();
    };
  }, [selectedProgramme, selectedCohort]);

  // Trigger Automatic Risk Scan whenever rules or interventions change
  useEffect(() => {
    runRiskScan();
  }, [ruleConfig, interventions, selectedProgramme, selectedCohort]);

  const runRiskScan = async () => {
    setScanning(true);
    try {
      const results = await autoEvaluateAtRiskLearners(
        selectedProgramme,
        selectedCohort,
        ruleConfig,
        interventions
      );
      setFlaggedLearners(results);
    } catch (err) {
      console.error('Failed to run risk scan:', err);
    } finally {
      setScanning(false);
    }
  };

  // Save Rule Configuration
  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveRiskRuleConfig({
        id: ruleConfig.id || 'DEFAULT_RISK_RULE',
        programmeId: selectedProgramme,
        programmeName: selectedProgramme === 'ALL' ? 'All Programmes' : selectedProgramme,
        attendanceMinThreshold: Number(ruleForm.attendanceMinThreshold ?? 80),
        missedAssignmentsMaxThreshold: Number(ruleForm.missedAssignmentsMaxThreshold ?? 2),
        assessmentScoreMinThreshold: Number(ruleForm.assessmentScoreMinThreshold ?? 70),
        inactivityDaysMaxThreshold: Number(ruleForm.inactivityDaysMaxThreshold ?? 7),
        updatedBy: 'pm@platform.org',
      });
      setShowRuleModal(false);
      runRiskScan();
    } catch (err) {
      console.error('Failed to save risk rules:', err);
    }
  };

  // Open Create Intervention Modal pre-filled for a flagged learner
  const handleInitiateIntervention = (learner: FlaggedAtRiskLearner) => {
    setEditingIntervention(null);
    setInterventionForm({
      learnerId: learner.learnerId,
      learnerName: learner.learnerName,
      learnerEmail: learner.learnerEmail,
      programmeId: learner.programmeId,
      programmeName: learner.programmeName,
      cohortId: learner.cohortId || 'cohort_2026_q1',
      cohortName: learner.cohortName || 'Cohort 2026-Q1',
      reason: (learner.reasons || []).join(' | '),
      riskLevel: learner.riskLevel,
      action: `Primary Action: Contact ${learner.learnerName} via email/phone regarding ${(learner.reasons && learner.reasons[0]) || 'academic performance'}.`,
      assignedStaffName: 'Dr. Evelyn Vance',
      assignedStaffRole: 'Programme Manager',
      followUpDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      outcome: 'PENDING',
      notes: `Automatically flagged on ${new Date(learner.flaggedAt).toLocaleDateString()}. Initial outreach pending.`,
    });
    setShowInterventionModal(true);
  };

  // Open Edit Intervention Modal
  const handleEditIntervention = (record: InterventionRecord) => {
    setEditingIntervention(record);
    setInterventionForm({
      learnerId: record.learnerId,
      learnerName: record.learnerName,
      learnerEmail: record.learnerEmail,
      programmeId: record.programmeId,
      programmeName: record.programmeName,
      cohortId: record.cohortId || 'ALL',
      cohortName: record.cohortName || 'All Cohorts',
      reason: record.reason,
      riskLevel: record.riskLevel,
      action: record.action,
      assignedStaffName: record.assignedStaffName,
      assignedStaffRole: record.assignedStaffRole,
      followUpDate: record.followUpDate,
      outcome: record.outcome,
      notes: record.notes,
    });
    setShowInterventionModal(true);
  };

  // Save Intervention Form
  const handleSaveIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interventionForm.learnerName || !interventionForm.reason || !interventionForm.action) {
      alert('Please fill in required fields (Learner Name, Reason, Action)');
      return;
    }

    try {
      if (editingIntervention) {
        await updateIntervention(editingIntervention.id, {
          reason: interventionForm.reason,
          riskLevel: interventionForm.riskLevel,
          action: interventionForm.action,
          assignedStaffName: interventionForm.assignedStaffName,
          assignedStaffRole: interventionForm.assignedStaffRole,
          followUpDate: interventionForm.followUpDate,
          outcome: interventionForm.outcome,
          notes: interventionForm.notes,
        });
      } else {
        await createIntervention({
          learnerId: interventionForm.learnerId || `learner_${Date.now()}`,
          learnerName: interventionForm.learnerName,
          learnerEmail: interventionForm.learnerEmail || `${interventionForm.learnerName.toLowerCase().replace(/\s+/g, '.')}@student.edu`,
          programmeId: interventionForm.programmeId,
          programmeName: interventionForm.programmeName,
          cohortId: interventionForm.cohortId,
          cohortName: interventionForm.cohortName,
          reason: interventionForm.reason,
          riskLevel: interventionForm.riskLevel,
          action: interventionForm.action,
          assignedStaffId: 'staff_pm_1',
          assignedStaffName: interventionForm.assignedStaffName,
          assignedStaffRole: interventionForm.assignedStaffRole,
          followUpDate: interventionForm.followUpDate,
          outcome: interventionForm.outcome,
          notes: interventionForm.notes,
          createdBy: 'pm@platform.org',
        });
      }
      setShowInterventionModal(false);
      setEditingIntervention(null);
      runRiskScan();
    } catch (err) {
      console.error('Failed to save intervention:', err);
    }
  };

  // Delete Intervention
  const handleDeleteIntervention = async (id: string) => {
    if (confirm('Are you sure you want to delete this intervention record?')) {
      await deleteIntervention(id);
      runRiskScan();
    }
  };

  // Filtered lists
  const filteredFlagged = flaggedLearners.filter((learner) => {
    const matchesSearch =
      learner.learnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      learner.learnerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = selectedRiskLevel === 'ALL' || learner.riskLevel === selectedRiskLevel;
    return matchesSearch && matchesRisk;
  });

  const filteredInterventions = interventions.filter((record) => {
    const matchesSearch =
      record.learnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.learnerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.reason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = selectedRiskLevel === 'ALL' || record.riskLevel === selectedRiskLevel;
    const matchesOutcome = selectedOutcome === 'ALL' || record.outcome === selectedOutcome;
    return matchesSearch && matchesRisk && matchesOutcome;
  });

  // Metrics
  const totalFlagged = flaggedLearners.length;
  const criticalCount = flaggedLearners.filter((l) => l.riskLevel === 'CRITICAL').length;
  const activeInterventionsCount = interventions.filter(
    (i) => i.outcome === 'PENDING' || i.outcome === 'IN_PROGRESS'
  ).length;
  const resolvedCount = interventions.filter((i) => i.outcome === 'RESOLVED').length;

  // Helper Badge Renderers
  const renderRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-semibold">Critical Risk</Badge>;
      case 'HIGH':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-medium">High Risk</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium Risk</Badge>;
      case 'LOW':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Low Risk</Badge>;
    }
  };

  const renderOutcomeBadge = (outcome: InterventionOutcome) => {
    switch (outcome) {
      case 'PENDING':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Pending</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-medium">In Progress</Badge>;
      case 'RESOLVED':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-medium">Resolved</Badge>;
      case 'ESCALATED':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-medium">Escalated</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                At-Risk Learner Management & Interventions
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Automatically detect struggling learners via custom rule engines and manage targeted intervention plans.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowRuleModal(true)}
            className="flex items-center gap-2 border-slate-300 hover:bg-slate-50"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-600" />
            Config Risk Rules
          </Button>

          <Button
            variant="outline"
            onClick={runRiskScan}
            disabled={scanning}
            className="flex items-center gap-2 border-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Run Risk Scan'}
          </Button>

          <Button
            onClick={() => {
              setEditingIntervention(null);
              setInterventionForm({
                learnerId: '',
                learnerName: '',
                learnerEmail: '',
                programmeId: selectedProgramme === 'ALL' ? 'prog_ai_eng' : selectedProgramme,
                programmeName: 'AI & Machine Learning Engineering',
                cohortId: selectedCohort === 'ALL' ? 'cohort_2026_q1' : selectedCohort,
                cohortName: 'Cohort 2026-Q1',
                reason: '',
                riskLevel: 'HIGH',
                action: '',
                assignedStaffName: 'Dr. Evelyn Vance',
                assignedStaffRole: 'Programme Manager',
                followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                outcome: 'PENDING',
                notes: '',
              });
              setShowInterventionModal(true);
            }}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            Log Manual Intervention
          </Button>
        </div>
      </div>

      {/* SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Flagged At-Risk</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalFlagged}</h3>
              <p className="text-xs text-rose-600 font-medium mt-1">Requires academic check-in</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Critical Risk Level</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">{criticalCount}</h3>
              <p className="text-xs text-slate-500 mt-1">3+ rules violated</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
              <UserX className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Interventions</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">{activeInterventionsCount}</h3>
              <p className="text-xs text-slate-500 mt-1">Pending or in progress</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Resolved Cases</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{resolvedCount}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">Learners back on track</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER CONTROLS & NAVIGATION TABS */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* TABS */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 lg:pb-0 lg:border-none">
              <button
                onClick={() => setActiveTab('flagged')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'flagged'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Auto-Flagged Learners ({flaggedLearners.length})
              </button>

              <button
                onClick={() => setActiveTab('interventions')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'interventions'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Intervention Records ({interventions.length})
              </button>
            </div>

            {/* SEARCH & FILTERS */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search learner or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="w-36">
                <Select
                  value={selectedRiskLevel}
                  onChange={(e) => setSelectedRiskLevel(e.target.value)}
                  className="h-9 text-xs"
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="CRITICAL">Critical Risk</option>
                  <option value="HIGH">High Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="LOW">Low Risk</option>
                </Select>
              </div>

              {activeTab === 'interventions' && (
                <div className="w-36">
                  <Select
                    value={selectedOutcome}
                    onChange={(e) => setSelectedOutcome(e.target.value)}
                    className="h-9 text-xs"
                  >
                    <option value="ALL">All Outcomes</option>
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="ESCALATED">Escalated</option>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE RULE SUMMARY BADGE */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">Active Rule Thresholds:</span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                Attendance &lt; {ruleConfig.attendanceMinThreshold}%
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                Missed Assignments &gt; {ruleConfig.missedAssignmentsMaxThreshold}
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                Assessment Score &lt; {ruleConfig.assessmentScoreMinThreshold}%
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                Inactivity &gt; {ruleConfig.inactivityDaysMaxThreshold} days
              </span>
            </div>
            <button
              onClick={() => setShowRuleModal(true)}
              className="text-rose-600 hover:text-rose-700 font-medium underline"
            >
              Modify Rule Thresholds
            </button>
          </div>
        </CardContent>
      </Card>

      {/* TAB 1: AUTO-FLAGGED LEARNERS TABLE */}
      {activeTab === 'flagged' && (
        <Card className="border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Auto-Flagged Struggling Learners
              </CardTitle>
              <p className="text-xs text-slate-500">
                Identified automatically based on real-time attendance, assignment completions, and portal activity.
              </p>
            </div>
            <Badge variant="secondary" className="bg-rose-50 text-rose-700">
              {filteredFlagged.length} Learners At-Risk
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <Spinner className="mx-auto text-rose-600" />
                <p className="text-sm text-slate-500 mt-2">Evaluating risk criteria...</p>
              </div>
            ) : filteredFlagged.length === 0 ? (
              <EmptyState
                icon={<UserCheck className="w-12 h-12 text-emerald-500" />}
                title="No At-Risk Learners Flagged"
                description="All learners are currently meeting academic and attendance threshold targets."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-6">Learner Details</th>
                      <th className="py-3 px-4">Risk Level</th>
                      <th className="py-3 px-4">Violated Risk Criteria & Reasons</th>
                      <th className="py-3 px-4">Key Metrics</th>
                      <th className="py-3 px-4">Intervention Status</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {filteredFlagged.map((learner) => (
                      <tr key={learner.learnerId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-900">{learner.learnerName}</div>
                          <div className="text-xs text-slate-500">{learner.learnerEmail}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{learner.programmeName}</div>
                        </td>

                        <td className="py-4 px-4">{renderRiskBadge(learner.riskLevel)}</td>

                        <td className="py-4 px-4 max-w-xs">
                          <ul className="space-y-1">
                            {(learner.reasons || []).map((r, i) => (
                              <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                <span className="text-rose-500 font-bold">•</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </td>

                        <td className="py-4 px-4 text-xs space-y-1">
                          <div>
                            <span className="text-slate-500">Attendance:</span>{' '}
                            <span
                              className={`font-semibold ${
                                learner.attendancePercent < ruleConfig.attendanceMinThreshold
                                  ? 'text-rose-600'
                                  : 'text-slate-800'
                              }`}
                            >
                              {learner.attendancePercent}%
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Missed Assignments:</span>{' '}
                            <span
                              className={`font-semibold ${
                                learner.missedAssignmentsCount > ruleConfig.missedAssignmentsMaxThreshold
                                  ? 'text-rose-600'
                                  : 'text-slate-800'
                              }`}
                            >
                              {learner.missedAssignmentsCount}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Inactivity:</span>{' '}
                            <span
                              className={`font-semibold ${
                                learner.daysInactive > ruleConfig.inactivityDaysMaxThreshold
                                  ? 'text-rose-600'
                                  : 'text-slate-800'
                              }`}
                            >
                              {learner.daysInactive} days
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {learner.hasActiveIntervention ? (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                              Active Intervention
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 border-slate-300">
                              No Intervention Yet
                            </Badge>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleInitiateIntervention(learner)}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs py-1 px-3"
                          >
                            <PlusCircle className="w-3.5 h-3.5 mr-1" />
                            Create Intervention
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: INTERVENTION RECORDS MANAGER */}
      {activeTab === 'interventions' && (
        <Card className="border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Staff Intervention & Outreach Records
              </CardTitle>
              <p className="text-xs text-slate-500">
                Track logged actions, assigned staff members, follow-up timelines, and case resolution outcomes.
              </p>
            </div>
            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
              {filteredInterventions.length} Total Records
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <Spinner className="mx-auto text-rose-600" />
                <p className="text-sm text-slate-500 mt-2">Loading intervention records...</p>
              </div>
            ) : filteredInterventions.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-12 h-12 text-slate-400" />}
                title="No Intervention Records Found"
                description="No active or past staff interventions match your current filter selections."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-6">Learner</th>
                      <th className="py-3 px-4">Risk & Reason</th>
                      <th className="py-3 px-4">Intervention Strategy & Action</th>
                      <th className="py-3 px-4">Assigned Staff</th>
                      <th className="py-3 px-4">Follow-Up Target</th>
                      <th className="py-3 px-4">Outcome</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {filteredInterventions.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-900">{record.learnerName}</div>
                          <div className="text-xs text-slate-500">{record.learnerEmail}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{record.programmeName}</div>
                        </td>

                        <td className="py-4 px-4 max-w-xs">
                          <div className="mb-1">{renderRiskBadge(record.riskLevel)}</div>
                          <p className="text-xs text-slate-600 line-clamp-2">{record.reason}</p>
                        </td>

                        <td className="py-4 px-4 max-w-sm">
                          <p className="text-xs font-medium text-slate-800 line-clamp-2">{record.action}</p>
                          {record.notes && (
                            <p className="text-[11px] text-slate-500 italic mt-1 line-clamp-1">
                              Note: {record.notes}
                            </p>
                          )}
                        </td>

                        <td className="py-4 px-4 text-xs">
                          <div className="font-medium text-slate-900">{record.assignedStaffName}</div>
                          <div className="text-slate-500">{record.assignedStaffRole}</div>
                        </td>

                        <td className="py-4 px-4 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {record.followUpDate}
                          </div>
                        </td>

                        <td className="py-4 px-4">{renderOutcomeBadge(record.outcome)}</td>

                        <td className="py-4 px-6 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditIntervention(record)}
                            className="text-xs py-1 px-2.5 border-slate-300"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteIntervention(record.id)}
                            className="text-xs py-1 px-2 border-rose-200 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL 1: RISK RULE CONFIGURATION */}
      <Modal
        isOpen={showRuleModal}
        onClose={() => setShowRuleModal(false)}
        title="Configure Risk Auto-Flagging Rules"
      >
        <form onSubmit={handleSaveRules} className="space-y-4 py-2">
          <p className="text-xs text-slate-500">
            Learners whose performance falls outside these thresholds will be automatically flagged as At-Risk on the management dashboard.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attendance Minimum Threshold (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={ruleForm.attendanceMinThreshold ?? 80}
                onChange={(e) => setRuleForm({ ...ruleForm, attendanceMinThreshold: Number(e.target.value) })}
                helperText="Flag learner if attendance falls below this percentage (e.g. 80%)."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Missed Assignments Maximum Limit
              </label>
              <Input
                type="number"
                min={0}
                max={20}
                value={ruleForm.missedAssignmentsMaxThreshold ?? 2}
                onChange={(e) => setRuleForm({ ...ruleForm, missedAssignmentsMaxThreshold: Number(e.target.value) })}
                helperText="Flag learner if overdue/unsubmitted assignments exceed this count (e.g. 2)."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assessment Average Minimum Score (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={ruleForm.assessmentScoreMinThreshold ?? 70}
                onChange={(e) => setRuleForm({ ...ruleForm, assessmentScoreMinThreshold: Number(e.target.value) })}
                helperText="Flag learner if quiz/exam average drops below this score (e.g. 70%)."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inactivity Maximum Threshold (Days)
              </label>
              <Input
                type="number"
                min={1}
                max={60}
                value={ruleForm.inactivityDaysMaxThreshold ?? 7}
                onChange={(e) => setRuleForm({ ...ruleForm, inactivityDaysMaxThreshold: Number(e.target.value) })}
                helperText="Flag learner if no portal login or activity is recorded for this many days (e.g. 7 days)."
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setShowRuleModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">
              Save Rule Configuration
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: CREATE / EDIT INTERVENTION RECORD */}
      <Modal
        isOpen={showInterventionModal}
        onClose={() => setShowInterventionModal(false)}
        title={editingIntervention ? 'Edit Intervention Record' : 'Create Staff Intervention Record'}
      >
        <form onSubmit={handleSaveIntervention} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Learner Name *</label>
              <Input
                type="text"
                required
                placeholder="e.g. Alex Morgan"
                value={interventionForm.learnerName}
                onChange={(e) => setInterventionForm({ ...interventionForm, learnerName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Learner Email</label>
              <Input
                type="email"
                placeholder="alex.morgan@student.edu"
                value={interventionForm.learnerEmail}
                onChange={(e) => setInterventionForm({ ...interventionForm, learnerEmail: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Risk Level *</label>
              <Select
                value={interventionForm.riskLevel}
                onChange={(e) => setInterventionForm({ ...interventionForm, riskLevel: e.target.value as RiskLevel })}
              >
                <option value="CRITICAL">Critical Risk</option>
                <option value="HIGH">High Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="LOW">Low Risk</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Outcome Status *</label>
              <Select
                value={interventionForm.outcome}
                onChange={(e) => setInterventionForm({ ...interventionForm, outcome: e.target.value as InterventionOutcome })}
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="ESCALATED">Escalated</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Intervention *</label>
            <Textarea
              rows={2}
              required
              placeholder="e.g. Attendance dropped to 62% and missed Module 3 lab submission."
              value={interventionForm.reason}
              onChange={(e) => setInterventionForm({ ...interventionForm, reason: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Action Plan & Outreach Strategy *</label>
            <Textarea
              rows={2}
              required
              placeholder="e.g. Schedule 1-on-1 coaching call with Marcus Thorne, grant 3-day lab extension."
              value={interventionForm.action}
              onChange={(e) => setInterventionForm({ ...interventionForm, action: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Staff Name</label>
              <Input
                type="text"
                placeholder="Dr. Evelyn Vance"
                value={interventionForm.assignedStaffName}
                onChange={(e) => setInterventionForm({ ...interventionForm, assignedStaffName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Staff Role</label>
              <Input
                type="text"
                placeholder="Programme Manager"
                value={interventionForm.assignedStaffRole}
                onChange={(e) => setInterventionForm({ ...interventionForm, assignedStaffRole: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-Up Target Date</label>
            <Input
              type="date"
              value={interventionForm.followUpDate}
              onChange={(e) => setInterventionForm({ ...interventionForm, followUpDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Progress Notes / Updates</label>
            <Textarea
              rows={2}
              placeholder="e.g. Learner was contacted via phone on Aug 12. Reported technical blocker."
              value={interventionForm.notes}
              onChange={(e) => setInterventionForm({ ...interventionForm, notes: e.target.value })}
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setShowInterventionModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">
              {editingIntervention ? 'Update Record' : 'Log Intervention'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
