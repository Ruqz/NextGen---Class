import React, { useState, useEffect } from 'react';
import {
  Application,
  Assessment,
  AssessmentInvitation,
  AdmissionDecision,
  AdmissionDecisionType,
  Programme,
  Cohort,
} from '../types';
import {
  subscribeToAllApplications,
  updateApplicationStatuses,
  submitApplication,
} from '../services/applications';
import {
  getAssessments,
  seedDefaultAssessmentIfEmpty,
} from '../services/assessments';
import {
  subscribeToAssessmentInvitations,
  issueAssessmentInvitation,
  bulkIssueAssessmentInvitations,
  processAdmissionDecision,
  bulkProcessAdmissionDecisions,
  subscribeToAdmissionDecisions,
} from '../services/admissions';
import { getProgrammes, getCohorts } from '../services/programmes';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { Alert } from '../components/ui/Alert';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Award,
  Send,
  Link2,
  Copy,
  Sliders,
  Filter,
  Search,
  UserCheck,
  UserX,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Eye,
  CheckSquare,
  Square,
  MessageSquare,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const PMAdmissionDashboard: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [invitations, setInvitations] = useState<AssessmentInvitation[]>([]);
  const [decisions, setDecisions] = useState<AdmissionDecision[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Configurable Pass Threshold State
  const [passThreshold, setPassThreshold] = useState<number>(70);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgramme, setSelectedProgramme] = useState<string>('ALL');
  const [selectedCohort, setSelectedCohort] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'QUALIFIED' | 'INVITED' | 'COMPLETED' | 'READY' | 'ACCEPTED' | 'WAITLISTED' | 'REJECTED' | 'MANUAL_REVIEW'
  >('ALL');

  // Selection & Bulk Action State
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [targetAppForInvite, setTargetAppForInvite] = useState<Application | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [invitePassThreshold, setInvitePassThreshold] = useState<number>(70);
  const [inviting, setInviting] = useState(false);

  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [targetAppForDecision, setTargetAppForDecision] = useState<Application | null>(null);
  const [pendingDecisionType, setPendingDecisionType] = useState<AdmissionDecisionType>('ACCEPTED');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [processingDecision, setProcessingDecision] = useState(false);

  const [isScoreDetailModalOpen, setIsScoreDetailModalOpen] = useState(false);
  const [viewingInvitation, setViewingInvitation] = useState<AssessmentInvitation | null>(null);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    let unsubApps: () => void;
    let unsubInvs: () => void;
    let unsubDecs: () => void;

    const initData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [progsData, cohortsData, asstData] = await Promise.all([
          getProgrammes(),
          getCohorts(),
          getAssessments(),
        ]);

        setProgrammes(progsData);
        setCohorts(cohortsData);

        let activeAssessments = asstData;
        if (activeAssessments.length === 0) {
          await seedDefaultAssessmentIfEmpty();
          activeAssessments = await getAssessments();
        }
        setAssessments(activeAssessments);
        if (activeAssessments.length > 0) {
          setSelectedAssessmentId(activeAssessments[0].id);
        }

        // Subscriptions
        unsubApps = subscribeToAllApplications((appsList) => {
          setApplications(appsList);
          // If Firestore applications are empty, seed sample applications for demonstration
          if (appsList.length === 0) {
            seedSampleApplications();
          }
        });

        unsubInvs = subscribeToAssessmentInvitations((invsList) => {
          setInvitations(invsList);
        });

        unsubDecs = subscribeToAdmissionDecisions((decsList) => {
          setDecisions(decsList);
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load admission dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    initData();

    return () => {
      if (unsubApps) unsubApps();
      if (unsubInvs) unsubInvs();
      if (unsubDecs) unsubDecs();
    };
  }, []);

  // Seed sample applications if database is empty so PM can test immediately
  const seedSampleApplications = async () => {
    try {
      const defaultProg = programmes[0]?.id || 'prog_gen_ai';
      const defaultProgName = programmes[0]?.name || 'Generative AI & AI Automation';
      const defaultCohort = cohorts[0]?.id || 'cohort_2_2026';
      const defaultCohortName = cohorts[0]?.name || 'Cohort 2 (Fall 2026)';

      const sampleApps = [
        {
          applicantId: 'app_user_1',
          applicantName: 'Amina Bello',
          applicantEmail: 'amina.bello@example.com',
          applicantPhone: '+234 801 234 5678',
          programmeId: defaultProg,
          programmeName: defaultProgName,
          cohortId: defaultCohort,
          cohortName: defaultCohortName,
          answers: { q_laptop: 'Yes', q_internet: 'Yes', q_weekly_hours: '15 - 20 Hours' },
          status: 'UNDER_REVIEW' as const,
          qualificationStatus: 'QUALIFIED' as const,
          assessmentStatus: 'NOT_STARTED' as const,
          admissionStatus: 'APPLIED' as const,
        },
        {
          applicantId: 'app_user_2',
          applicantName: 'David Okonjo',
          applicantEmail: 'david.okonjo@example.com',
          applicantPhone: '+234 802 987 6543',
          programmeId: defaultProg,
          programmeName: defaultProgName,
          cohortId: defaultCohort,
          cohortName: defaultCohortName,
          answers: { q_laptop: 'Yes', q_internet: 'Yes', q_weekly_hours: '10 - 15 Hours' },
          status: 'SHORTLISTED' as const,
          qualificationStatus: 'QUALIFIED' as const,
          assessmentStatus: 'PASSED' as const,
          admissionStatus: 'APPLIED' as const,
        },
        {
          applicantId: 'app_user_3',
          applicantName: 'Chiamaka Nnadi',
          applicantEmail: 'chiamaka.n@example.com',
          applicantPhone: '+234 803 555 1234',
          programmeId: defaultProg,
          programmeName: defaultProgName,
          cohortId: defaultCohort,
          cohortName: defaultCohortName,
          answers: { q_laptop: 'Yes', q_internet: 'Yes', q_weekly_hours: '20+ Hours' },
          status: 'UNDER_REVIEW' as const,
          qualificationStatus: 'QUALIFIED' as const,
          assessmentStatus: 'IN_PROGRESS' as const,
          admissionStatus: 'APPLIED' as const,
        },
        {
          applicantId: 'app_user_4',
          applicantName: 'Emmanuel Mensah',
          applicantEmail: 'emmanuel.m@example.com',
          applicantPhone: '+233 24 123 4567',
          programmeId: defaultProg,
          programmeName: defaultProgName,
          cohortId: defaultCohort,
          cohortName: defaultCohortName,
          answers: { q_laptop: 'No', q_internet: 'Yes', q_weekly_hours: '5 - 10 Hours' },
          status: 'REJECTED' as const,
          qualificationStatus: 'DISQUALIFIED' as const,
          assessmentStatus: 'NOT_STARTED' as const,
          admissionStatus: 'REJECTED' as const,
        },
      ];

      for (const sample of sampleApps) {
        await submitApplication(sample);
      }
    } catch (err) {
      console.error('Error seeding sample applications:', err);
    }
  };

  // Helper map for invitations by application ID
  const invitationByAppMap = React.useMemo(() => {
    const map = new Map<string, AssessmentInvitation>();
    invitations.forEach((inv) => {
      // Pick latest invitation for application
      const existing = map.get(inv.applicationId);
      if (!existing || new Date(inv.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        map.set(inv.applicationId, inv);
      }
    });
    return map;
  }, [invitations]);

  // Derived Filtered Applications
  const filteredApplications = React.useMemo(() => {
    return applications.filter((app) => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        !search ||
        app.applicantName.toLowerCase().includes(search) ||
        app.applicantEmail.toLowerCase().includes(search) ||
        app.id.toLowerCase().includes(search);

      // Programme
      const matchesProg = selectedProgramme === 'ALL' || app.programmeId === selectedProgramme;

      // Cohort
      const matchesCohort = selectedCohort === 'ALL' || app.cohortId === selectedCohort;

      // Tab Filter
      const inv = invitationByAppMap.get(app.id);
      let matchesTab = true;

      if (activeTab === 'QUALIFIED') {
        matchesTab = app.qualificationStatus === 'QUALIFIED' && app.assessmentStatus === 'NOT_STARTED';
      } else if (activeTab === 'INVITED') {
        matchesTab = app.assessmentStatus === 'IN_PROGRESS' || inv?.status === 'INVITED';
      } else if (activeTab === 'COMPLETED') {
        matchesTab = app.assessmentStatus === 'PASSED' || app.assessmentStatus === 'FAILED' || inv?.status === 'COMPLETED';
      } else if (activeTab === 'READY') {
        matchesTab =
          (app.assessmentStatus === 'PASSED' || (inv?.percentage !== undefined && inv.percentage >= passThreshold)) &&
          app.admissionStatus !== 'ACCEPTED' &&
          app.admissionStatus !== 'REJECTED';
      } else if (activeTab === 'ACCEPTED') {
        matchesTab = app.admissionStatus === 'ACCEPTED';
      } else if (activeTab === 'WAITLISTED') {
        matchesTab = app.admissionStatus === 'WAITLISTED';
      } else if (activeTab === 'REJECTED') {
        matchesTab = app.admissionStatus === 'REJECTED';
      } else if (activeTab === 'MANUAL_REVIEW') {
        matchesTab = app.admissionStatus === 'SHORTLISTED' || app.qualificationStatus === 'UNDER_REVIEW';
      }

      return matchesSearch && matchesProg && matchesCohort && matchesTab;
    });
  }, [applications, searchTerm, selectedProgramme, selectedCohort, activeTab, invitationByAppMap, passThreshold]);

  // Aggregate Metrics
  const metrics = React.useMemo(() => {
    const total = applications.length;
    const qualified = applications.filter((a) => a.qualificationStatus === 'QUALIFIED').length;
    const invited = invitations.length;
    const completed = invitations.filter((i) => i.status === 'COMPLETED').length;

    // Check completed scores against pass threshold
    const passedThresholdCount = invitations.filter(
      (i) => i.status === 'COMPLETED' && (i.percentage !== undefined ? i.percentage >= passThreshold : false)
    ).length;

    const accepted = applications.filter((a) => a.admissionStatus === 'ACCEPTED').length;
    const waitlisted = applications.filter((a) => a.admissionStatus === 'WAITLISTED').length;
    const rejected = applications.filter((a) => a.admissionStatus === 'REJECTED').length;
    const manualReview = applications.filter(
      (a) => a.admissionStatus === 'SHORTLISTED' || a.qualificationStatus === 'UNDER_REVIEW'
    ).length;

    return {
      total,
      qualified,
      invited,
      completed,
      passedThresholdCount,
      accepted,
      waitlisted,
      rejected,
      manualReview,
    };
  }, [applications, invitations, passThreshold]);

  // Handle Multi-Select Checkbox
  const toggleSelectAll = () => {
    if (selectedAppIds.length === filteredApplications.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(filteredApplications.map((a) => a.id));
    }
  };

  const toggleSelectApp = (id: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Copy Access Link to Clipboard
  const handleCopyLink = (token: string) => {
    const accessUrl = `${window.location.origin}/portal/assessment-invite/${token}`;
    navigator.clipboard.writeText(accessUrl).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2500);
    });
  };

  // Open Single Invite Modal
  const handleOpenInviteModal = (app?: Application) => {
    setTargetAppForInvite(app || null);
    setIsInviteModalOpen(true);
  };

  // Issue Single or Bulk Invitations
  const handleExecuteInvitation = async () => {
    if (!selectedAssessmentId) {
      setError('Please select an assessment to issue.');
      return;
    }

    setInviting(true);
    setError(null);
    try {
      const selectedAsst = assessments.find((a) => a.id === selectedAssessmentId);
      const asstTitle = selectedAsst?.title || 'Pre-Admission Assessment';

      if (targetAppForInvite) {
        // Single
        await issueAssessmentInvitation({
          application: targetAppForInvite,
          assessmentId: selectedAssessmentId,
          assessmentTitle: asstTitle,
          passThresholdPercentage: invitePassThreshold,
        });
        setSuccessMsg(`Assessment invitation issued to ${targetAppForInvite.applicantName}`);
      } else if (selectedAppIds.length > 0) {
        // Bulk
        const targetApps = applications.filter((a) => selectedAppIds.includes(a.id));
        const count = await bulkIssueAssessmentInvitations({
          applications: targetApps,
          assessmentId: selectedAssessmentId,
          assessmentTitle: asstTitle,
          passThresholdPercentage: invitePassThreshold,
        });
        setSuccessMsg(`Successfully issued ${count} assessment invitations.`);
        setSelectedAppIds([]);
      }

      setIsInviteModalOpen(false);
      setTargetAppForInvite(null);
    } catch (err: any) {
      setError(err.message || 'Failed to issue invitations.');
    } finally {
      setInviting(false);
    }
  };

  // Open Decision Modal
  const handleOpenDecisionModal = (app: Application, decision: AdmissionDecisionType) => {
    setTargetAppForDecision(app);
    setPendingDecisionType(decision);
    setDecisionNotes('');
    setIsDecisionModalOpen(true);
  };

  // Execute Admission Decision
  // CRITICAL REQUIREMENT: Do not automatically create a learner account until the applicant is accepted!
  const handleExecuteDecision = async () => {
    if (!targetAppForDecision) return;

    setProcessingDecision(true);
    setError(null);
    try {
      const inv = invitationByAppMap.get(targetAppForDecision.id);

      await processAdmissionDecision({
        application: targetAppForDecision,
        decision: pendingDecisionType,
        reviewNotes: decisionNotes,
        assessmentScore: inv?.score,
        assessmentPercentage: inv?.percentage,
        assessmentPassed: inv?.passed,
        passThreshold: inv?.passThresholdPercentage || passThreshold,
      });

      if (pendingDecisionType === 'ACCEPTED') {
        setSuccessMsg(
          `Applicant ${targetAppForDecision.applicantName} ACCEPTED! Learner account created/upgraded.`
        );
      } else {
        setSuccessMsg(
          `Admission decision recorded: ${pendingDecisionType} for ${targetAppForDecision.applicantName}. No learner account created.`
        );
      }

      setIsDecisionModalOpen(false);
      setTargetAppForDecision(null);
    } catch (err: any) {
      setError(err.message || 'Failed to process admission decision.');
    } finally {
      setProcessingDecision(false);
    }
  };

  // Bulk Decision Processing
  const handleBulkDecision = async (decision: AdmissionDecisionType) => {
    if (selectedAppIds.length === 0) return;

    const confirmText =
      decision === 'ACCEPTED'
        ? `Accept ${selectedAppIds.length} applicants and CREATE Learner accounts for them?`
        : `Apply '${decision}' status to ${selectedAppIds.length} applicants?`;

    if (!window.confirm(confirmText)) return;

    setLoading(true);
    try {
      const targetApps = applications.filter((a) => selectedAppIds.includes(a.id));
      const count = await bulkProcessAdmissionDecisions({
        applications: targetApps,
        decision,
      });

      setSuccessMsg(`Bulk admission decisions executed for ${count} applicants.`);
      setSelectedAppIds([]);
    } catch (err: any) {
      setError(err.message || 'Failed bulk decision.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && applications.length === 0) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" label="Loading Admission Workflow Engine..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-orange-900 via-slate-900 to-orange-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-orange-800/40">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-semibold border border-orange-500/30">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            Module 8 — Automated Admission & Assessment Pipeline
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Admission & Evaluation Dashboard
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
            Streamline candidate evaluation from qualification checks to assessment invitations, score calculation, pass threshold benchmarks, and final admission decisions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto">
          <Button
            variant="primary"
            size="md"
            onClick={() => handleOpenInviteModal()}
            disabled={selectedAppIds.length === 0}
            className="bg-orange-600 hover:bg-orange-500 font-bold text-white border-none shadow-md"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Issue Invitations ({selectedAppIds.length})
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert type="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* Key Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Apps</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.total}</p>
          <span className="text-[10px] text-slate-500 block">Submitted applications</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Qualified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{metrics.qualified}</p>
          <span className="text-[10px] text-emerald-600/80 block font-medium">Passed eligibility</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-orange-600">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Invited</span>
            <Send className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-black text-orange-700">{metrics.invited}</p>
          <span className="text-[10px] text-orange-600 block font-medium">Active unique links</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Scored Exceeded</span>
            <Award className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-700">
            {metrics.passedThresholdCount}{' '}
            <span className="text-xs font-normal text-slate-400">/ {metrics.completed}</span>
          </p>
          <span className="text-[10px] text-indigo-600 block font-medium">
            ≥ {passThreshold}% Pass Goal
          </span>
        </div>

        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">Accepted</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800">{metrics.accepted}</p>
          <span className="text-[10px] text-emerald-700 block font-semibold">
            Learner accounts created
          </span>
        </div>

        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800">Waitlisted</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-800">{metrics.waitlisted}</p>
          <span className="text-[10px] text-amber-700 block font-medium">On pending list</span>
        </div>
      </div>

      {/* Configurable Pass Threshold Control Panel */}
      <Card className="p-5 border-2 border-orange-200/80 bg-orange-50/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-bold text-slate-900">Configurable Admission Pass Threshold</h3>
            </div>
            <p className="text-xs text-slate-600">
              Adjust the pass benchmark for scoring tests. Applicants achieving at or above this percentage will be flagged as <span className="font-semibold text-emerald-700">Ready for Admission</span>.
            </p>
          </div>

          <div className="flex items-center gap-4 self-stretch sm:self-auto bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="40"
                max="95"
                step="5"
                value={passThreshold}
                onChange={(e) => setPassThreshold(Number(e.target.value))}
                className="w-32 accent-orange-600 cursor-pointer"
              />
              <span className="text-lg font-black text-orange-600 font-mono w-12 text-center">
                {passThreshold}%
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Candidates Met Goal</span>
              <span className="font-bold text-emerald-600">
                {metrics.passedThresholdCount} of {metrics.completed} Completed
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter Toolbar & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate name, email, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Filters:
            </div>

            <select
              value={selectedProgramme}
              onChange={(e) => setSelectedProgramme(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">All Programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">All Cohorts</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Workflow Stage Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-t border-slate-100 pt-3 text-xs scrollbar-none">
          {[
            { id: 'ALL', label: 'All Applicants', count: applications.length },
            { id: 'QUALIFIED', label: 'Qualified (Needs Test)', count: metrics.qualified },
            { id: 'INVITED', label: 'Invited Active', count: metrics.invited },
            { id: 'COMPLETED', label: 'Assessment Completed', count: metrics.completed },
            { id: 'READY', label: 'Ready for Admission', count: metrics.passedThresholdCount },
            { id: 'ACCEPTED', label: 'Accepted (Learners)', count: metrics.accepted },
            { id: 'WAITLISTED', label: 'Waitlisted', count: metrics.waitlisted },
            { id: 'REJECTED', label: 'Rejected', count: metrics.rejected },
            { id: 'MANUAL_REVIEW', label: 'Manual Review', count: metrics.manualReview },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-orange-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Bar (Visible when candidates checked) */}
      {selectedAppIds.length > 0 && (
        <div className="p-3 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2 text-xs">
            <CheckSquare className="w-4 h-4 text-orange-400" />
            <span className="font-bold">{selectedAppIds.length} applicants selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenInviteModal()}
              className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700 text-xs"
            >
              <Send className="w-3.5 h-3.5 mr-1 text-orange-400" /> Bulk Invitation
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleBulkDecision('ACCEPTED')}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold text-xs"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1" /> Bulk Accept (Create Learners)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkDecision('WAITLISTED')}
              className="bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700 text-xs"
            >
              <Clock className="w-3.5 h-3.5 mr-1" /> Bulk Waitlist
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkDecision('REJECTED')}
              className="bg-slate-800 text-red-300 border-slate-700 hover:bg-slate-700 text-xs"
            >
              <UserX className="w-3.5 h-3.5 mr-1" /> Bulk Reject
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedAppIds([])}
              className="text-slate-400 hover:text-white text-xs"
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Applications Table */}
      <Card className="overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600">
                    {selectedAppIds.length === filteredApplications.length && filteredApplications.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-orange-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">Candidate Details</th>
                <th className="p-3.5">Programme & Cohort</th>
                <th className="p-3.5">Qualification</th>
                <th className="p-3.5">Assessment Status</th>
                <th className="p-3.5">Test Score & Goal</th>
                <th className="p-3.5">Admission Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    No applicant records match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const inv = invitationByAppMap.get(app.id);
                  const isChecked = selectedAppIds.includes(app.id);

                  // Score badge calculation
                  const percentage = inv?.percentage;
                  const meetsThreshold = percentage !== undefined && percentage >= passThreshold;

                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isChecked ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => toggleSelectApp(app.id)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-orange-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{app.applicantName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{app.applicantEmail}</div>
                      </td>

                      <td className="p-3.5 max-w-[180px]">
                        <div className="font-medium text-slate-800 truncate">{app.programmeName}</div>
                        <div className="text-[10px] text-slate-400 truncate">{app.cohortName}</div>
                      </td>

                      <td className="p-3.5">
                        {app.qualificationStatus === 'QUALIFIED' ? (
                          <Badge variant="success" className="text-[10px] font-bold">
                            QUALIFIED
                          </Badge>
                        ) : app.qualificationStatus === 'DISQUALIFIED' ? (
                          <Badge variant="danger" className="text-[10px]">
                            DISQUALIFIED
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px]">
                            PENDING
                          </Badge>
                        )}
                      </td>

                      <td className="p-3.5">
                        {inv ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {inv.status === 'COMPLETED' ? (
                                <Badge variant="info" className="text-[10px]">
                                  COMPLETED
                                </Badge>
                              ) : inv.status === 'INVITED' ? (
                                <Badge variant="warning" className="text-[10px]">
                                  INVITED
                                </Badge>
                              ) : (
                                <Badge variant="neutral" className="text-[10px]">
                                  {inv.status}
                                </Badge>
                              )}
                            </div>

                            {/* Access Token Copy Button */}
                            <button
                              onClick={() => handleCopyLink(inv.token)}
                              className="text-[10px] text-orange-600 font-mono hover:underline flex items-center gap-1 font-semibold"
                              title="Copy unique assessment URL"
                            >
                              <Link2 className="w-3 h-3 text-orange-500" />
                              {inv.token.slice(0, 10)}...
                              {copiedToken === inv.token ? (
                                <span className="text-emerald-600 font-sans font-bold">Copied!</span>
                              ) : (
                                <Copy className="w-2.5 h-2.5 text-slate-400" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-medium">Not Invited</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {inv && inv.percentage !== undefined ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-sm font-black font-mono ${
                                  meetsThreshold ? 'text-emerald-600' : 'text-red-600'
                                }`}
                              >
                                {inv.percentage}%
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({inv.score}/{inv.maxScore})
                              </span>
                            </div>

                            <Badge
                              variant={meetsThreshold ? 'success' : 'danger'}
                              className="text-[9px] uppercase tracking-wider py-0"
                            >
                              {meetsThreshold ? 'Meets Goal' : 'Below Threshold'}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {app.admissionStatus === 'ACCEPTED' ? (
                          <Badge variant="success" className="text-[10px] font-extrabold">
                            ACCEPTED (Learner)
                          </Badge>
                        ) : app.admissionStatus === 'WAITLISTED' ? (
                          <Badge variant="warning" className="text-[10px]">
                            WAITLISTED
                          </Badge>
                        ) : app.admissionStatus === 'REJECTED' ? (
                          <Badge variant="danger" className="text-[10px]">
                            REJECTED
                          </Badge>
                        ) : app.admissionStatus === 'SHORTLISTED' ? (
                          <Badge variant="info" className="text-[10px]">
                            MANUAL REVIEW
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px]">
                            APPLIED
                          </Badge>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Issue Invite */}
                          {!inv && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenInviteModal(app)}
                              className="text-[11px] py-1 px-2 text-orange-600 border-orange-200 hover:bg-orange-50 font-bold"
                            >
                              <Send className="w-3 h-3 mr-1" /> Invite
                            </Button>
                          )}

                          {/* Decision Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenDecisionModal(app, 'ACCEPTED')}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Accept Applicant (Create Learner Account)"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenDecisionModal(app, 'WAITLISTED')}
                              className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                              title="Place on Waitlist"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenDecisionModal(app, 'REJECTED')}
                              className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                              title="Reject Applicant"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* --- MODAL 1: ISSUE ASSESSMENT INVITATION --- */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title={targetAppForInvite ? `Invite ${targetAppForInvite.applicantName}` : `Bulk Issue Assessment Invitations`}
        description="Generate unique access tokens and send personalized assessment links to candidates."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Select Assessment Paper</label>
            <select
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.questions.length} questions • {a.durationMinutes}m)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Pass Benchmark Goal (% for this invitation)
            </label>
            <input
              type="number"
              min="10"
              max="100"
              value={invitePassThreshold}
              onChange={(e) => setInvitePassThreshold(Number(e.target.value))}
              className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Candidates scoring at or above {invitePassThreshold}% will meet the passing criteria for admission.
            </p>
          </div>

          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-1 text-orange-900">
            <p className="font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-orange-600" /> Unique Token Generation
            </p>
            <p className="text-[11px] text-slate-600">
              A unique access link (e.g. <span className="font-mono text-orange-800">/portal/assessment-invite/INV-XXXXX</span>) will be generated for each candidate.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExecuteInvitation}
              disabled={inviting}
              className="bg-orange-600 hover:bg-orange-500 font-bold"
            >
              {inviting ? <Spinner size="sm" /> : <Send className="w-3.5 h-3.5 mr-1" />}
              {targetAppForInvite ? 'Issue Invitation' : `Send ${selectedAppIds.length} Invitations`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL 2: ADMISSION DECISION CONFIRMATION --- */}
      <Modal
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        title={`Admission Decision: ${pendingDecisionType}`}
        description={`Record official admission decision for ${targetAppForDecision?.applicantName}`}
      >
        <div className="space-y-4 text-xs">
          {pendingDecisionType === 'ACCEPTED' ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
              <p className="font-bold flex items-center gap-1 text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Learner Account Creation Notice
              </p>
              <p className="text-[11px] text-slate-700">
                Accepting this applicant will automatically convert their role to <span className="font-bold text-slate-900">Learner</span> and activate their portal workspace.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600" /> No Account Creation Notice
              </p>
              <p className="text-[11px] text-slate-700">
                Selecting <span className="font-bold text-slate-900">{pendingDecisionType}</span> records the decision in the admission engine without creating a learner account.
              </p>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">PM Decision & Review Notes (Optional)</label>
            <textarea
              rows={3}
              placeholder="Add review notes, interview feedback, or justifications..."
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsDecisionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExecuteDecision}
              disabled={processingDecision}
              className={`font-bold ${
                pendingDecisionType === 'ACCEPTED'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : pendingDecisionType === 'REJECTED'
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              {processingDecision ? <Spinner size="sm" /> : null}
              Confirm {pendingDecisionType} Decision
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
