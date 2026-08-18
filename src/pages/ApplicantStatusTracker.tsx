import React, { useState, useEffect } from 'react';
import {
  Application,
  ApplicationStatus,
  AssessmentInvitation,
  AdmissionDecision,
  Programme,
  Cohort,
} from '../types';
import {
  subscribeToApplicantApplications,
  subscribeToAllApplications,
  withdrawApplication,
  submitApplication,
} from '../services/applications';
import {
  subscribeToAssessmentInvitations,
  subscribeToAdmissionDecisions,
} from '../services/admissions';
import {
  getProgrammes,
  getCohorts,
  seedInitialDataIfEmpty,
} from '../services/programmes';
import { createEnrolmentForAcceptedApplicant } from '../services/learners';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Eye,
  Trash2,
  GraduationCap,
  Sparkles,
  ClipboardList,
  Award,
  ArrowRight,
  ShieldCheck,
  Check,
  Calendar,
  Layers,
  Send,
  BookOpen,
} from 'lucide-react';

interface ApplicantStatusTrackerProps {
  initialTab?: 'status' | 'assessment' | 'decision' | 'catalog';
  onNavigate: (path: string) => void;
}

export const ApplicantStatusTracker: React.FC<ApplicantStatusTrackerProps> = ({
  initialTab = 'status',
  onNavigate,
}) => {
  const { currentUser, userProfile, switchRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'status' | 'assessment' | 'decision' | 'catalog'>(initialTab);

  const [applications, setApplications] = useState<Application[]>([]);
  const [invitations, setInvitations] = useState<AssessmentInvitation[]>([]);
  const [decisions, setDecisions] = useState<AdmissionDecision[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [enrollingAppId, setEnrollingAppId] = useState<string | null>(null);
  const [seedingDemo, setSeedingDemo] = useState(false);

  // Viewing response modal
  const [viewingApp, setViewingApp] = useState<Application | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const userUid = currentUser?.uid;
    const userEmail = (currentUser?.email || '').toLowerCase().trim();

    const unsubApps = subscribeToAllApplications((allApps) => {
      // Filter applications matching either user UID or user email
      const userApps = allApps.filter(
        (app) =>
          (userUid && app.applicantId === userUid) ||
          (userEmail && app.applicantEmail?.toLowerCase().trim() === userEmail)
      );
      setApplications(userApps);
      setLoading(false);
    });

    const unsubInvs = subscribeToAssessmentInvitations((allInvs) => {
      const userInvs = allInvs.filter(
        (inv) =>
          (userUid && inv.applicantId === userUid) ||
          (userEmail && inv.applicantEmail?.toLowerCase().trim() === userEmail)
      );
      setInvitations(userInvs);
    });

    const unsubDecs = subscribeToAdmissionDecisions((allDecs) => {
      const userDecs = allDecs.filter(
        (dec) =>
          (userUid && dec.applicantId === userUid) ||
          (userEmail && dec.applicantEmail?.toLowerCase().trim() === userEmail)
      );
      setDecisions(userDecs);
    });

    const loadMeta = async () => {
      try {
        await seedInitialDataIfEmpty().catch(console.error);
        const progs = await getProgrammes();
        const chs = await getCohorts();
        setProgrammes(progs);
        setCohorts(chs);
      } catch (err) {
        console.error('Error loading meta cohorts/programmes:', err);
      }
    };
    loadMeta();

    return () => {
      unsubApps();
      unsubInvs();
      unsubDecs();
    };
  }, [currentUser?.uid, currentUser?.email]);

  const handleWithdraw = async (appId: string) => {
    if (window.confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
      try {
        await withdrawApplication(appId);
        setSuccessMessage('Application has been successfully withdrawn.');
      } catch (err: any) {
        setError(err.message || 'Failed to withdraw application.');
      }
    }
  };

  const handleAcceptAdmission = async (app: Application) => {
    setEnrollingAppId(app.id);
    setError(null);
    try {
      // 1. Create enrolment in Firestore
      await createEnrolmentForAcceptedApplicant(app);
      // 2. Switch active role to Learner
      await switchRole('Learner');
      // 3. Navigate to Learner Dashboard
      onNavigate('/portal/learner/dashboard');
    } catch (err: any) {
      console.error('Error accepting admission:', err);
      setError(err.message || 'Failed to complete enrolment.');
    } finally {
      setEnrollingAppId(null);
    }
  };

  const handleSeedDemoApplication = async () => {
    setSeedingDemo(true);
    setError(null);
    try {
      const meta = await seedInitialDataIfEmpty();
      const targetProg = programmes.find((p) => p.id === meta.programmeId) || programmes[0];
      const targetCohort = cohorts.find((c) => c.id === meta.cohortId) || cohorts[0];

      await submitApplication({
        applicantId: currentUser?.uid || `applicant_${Date.now()}`,
        applicantName: userProfile?.displayName || currentUser?.displayName || 'Prospective Applicant',
        applicantEmail: currentUser?.email || 'applicant@nextgenclass.org',
        applicantPhone: userProfile?.phoneNumber || '+234 800 123 4567',
        programmeId: targetProg?.id || meta.programmeId,
        programmeName: targetProg?.name || 'Generative AI & AI Automation',
        cohortId: targetCohort?.id || meta.cohortId,
        cohortName: targetCohort?.name || 'Cohort 2',
        formId: 'default_form',
        formVersionId: 'v1',
        formVersion: 1,
        status: 'UNDER_REVIEW',
        qualificationStatus: 'QUALIFIED',
        assessmentStatus: 'IN_PROGRESS',
        admissionStatus: 'APPLIED',
        answers: {
          q_laptop: 'Yes',
          q_internet: 'Yes',
          q_weekly_hours: '15 - 20 Hours',
          q_ai_experience: 'Intermediate prompt engineering with ChatGPT, Claude, and automation workflows.',
          q_motivation: 'I want to master enterprise AI agents and generative AI automation to advance my career.',
        },
        uploadedFiles: {},
      });

      setSuccessMessage('Demo application created successfully! You can now track your application workflow.');
      setActiveTab('status');
    } catch (err: any) {
      setError(err.message || 'Failed to seed demo application.');
    } finally {
      setSeedingDemo(false);
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge variant="primary">SUBMITTED</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="warning">UNDER REVIEW</Badge>;
      case 'SHORTLISTED':
        return <Badge variant="success">SHORTLISTED</Badge>;
      case 'ACCEPTED':
        return <Badge variant="success" className="bg-emerald-600 text-white font-bold">ACCEPTED</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">NOT SELECTED</Badge>;
      case 'WITHDRAWN':
        return <Badge variant="neutral">WITHDRAWN</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const activeApplication = applications[0];
  const activeDecision = decisions.find((d) => d.applicationId === activeApplication?.id) || decisions[0];
  const activeInvitation = invitations.find((i) => i.applicationId === activeApplication?.id) || invitations[0];
  const isAccepted = activeApplication?.status === 'ACCEPTED' || activeApplication?.admissionStatus === 'ACCEPTED' || activeDecision?.decision === 'ACCEPTED';

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Spinner size="lg" label="Loading your applicant dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" /> NextGen Class Applicant Workspace
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Applicant Admission Portal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track admission review status, complete pre-admission tests, and view official acceptance decisions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            id="btn-applicant-apply-now"
            onClick={() => onNavigate('/applicant/application')}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold cursor-pointer shadow-xs"
          >
            <FileText className="w-4 h-4 mr-1.5" /> Apply to a Programme
          </Button>

          <Button
            variant="outline"
            size="sm"
            id="btn-applicant-explore-catalog"
            onClick={() => {
              setActiveTab('catalog');
            }}
          >
            <GraduationCap className="w-4 h-4 mr-1.5" /> Browse Catalog
          </Button>

          {applications.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              isLoading={seedingDemo}
              onClick={handleSeedDemoApplication}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Sparkles className="w-4 h-4 mr-1.5" /> Generate Test Application
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert type="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert type="success" onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 select-none">
        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={`py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'status'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Applications</span>
          {applications.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'status' ? 'bg-orange-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {applications.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assessment')}
          className={`py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'assessment'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Pre-Admission Assessment</span>
          {invitations.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'assessment' ? 'bg-orange-700 text-white' : 'bg-orange-100 text-orange-700'}`}>
              {invitations.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('decision')}
          className={`py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'decision'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Admission Decision & Letter</span>
          {isAccepted && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-black animate-pulse">
              OFFER READY
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Browse Available Programmes</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Submissions
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-slate-900">{applications.length}</span>
            <FileText className="w-5 h-5 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Review Status
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-bold text-slate-900">
              {activeApplication ? activeApplication.status.replace(/_/g, ' ') : 'No Application'}
            </span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Assessment Status
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-bold text-slate-900">
              {activeInvitation?.status === 'COMPLETED'
                ? activeInvitation.passed ? 'Passed' : 'Completed'
                : activeInvitation ? 'Invited / Active' : 'Not Required'}
            </span>
            <ClipboardList className="w-5 h-5 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Admission Outcome
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className={`text-sm font-bold ${isAccepted ? 'text-emerald-600' : 'text-slate-900'}`}>
              {isAccepted ? 'OFFER GRANTED' : activeApplication ? activeApplication.admissionStatus : 'Awaiting Review'}
            </span>
            <Award className={`w-5 h-5 ${isAccepted ? 'text-emerald-500' : 'text-slate-400'}`} />
          </div>
        </Card>
      </div>

      {/* TAB 1: MY APPLICATIONS */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          {applications.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-12 h-12 text-slate-400" />}
              title="No Submitted Applications Found"
              description="You haven't submitted any cohort applications yet. You can explore available programmes or generate a sample application to test the admissions flow."
              action={
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    id="btn-empty-apply-now"
                    onClick={() => onNavigate('/applicant/application')}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold cursor-pointer"
                  >
                    <FileText className="w-4 h-4 mr-1.5" /> Apply to a Programme
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    id="btn-empty-browse-cohorts"
                    onClick={() => setActiveTab('catalog')}
                  >
                    <BookOpen className="w-4 h-4 mr-1.5" /> Browse Open Cohorts
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={seedingDemo}
                    onClick={handleSeedDemoApplication}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" /> Generate Test Application
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="space-y-5">
              {applications.map((app) => (
                <Card key={app.id} className="p-6 border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          REF: {app.id.substring(0, 10)}
                        </span>
                        {getStatusBadge(app.status)}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 mt-2">
                        {app.programmeName}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        Target Cohort: <strong className="text-slate-800">{app.cohortName}</strong>
                      </p>
                    </div>

                    <div className="text-right text-xs text-slate-500 space-y-1">
                      <p>
                        Submitted: <span className="font-semibold text-slate-800">{new Date(app.submittedAt).toLocaleDateString()}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Last Updated: {new Date(app.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* 5-Step Visual Progress Stepper */}
                  <div className="my-5 py-3 px-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Admission Progress Workflow
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                      {/* Step 1: Application Submitted */}
                      <div className="flex flex-col items-center p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1" />
                        <span className="text-[11px] font-bold">1. Submitted</span>
                        <span className="text-[10px] text-emerald-600">Completed</span>
                      </div>

                      {/* Step 2: Qualification Review */}
                      <div className={`flex flex-col items-center p-2 rounded-lg border font-medium ${
                        app.qualificationStatus === 'QUALIFIED'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : app.qualificationStatus === 'DISQUALIFIED'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}>
                        {app.qualificationStatus === 'QUALIFIED' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600 mb-1" />
                        )}
                        <span className="text-[11px] font-bold">2. Eligibility</span>
                        <span className="text-[10px]">
                          {app.qualificationStatus || 'In Review'}
                        </span>
                      </div>

                      {/* Step 3: Pre-Admission Quiz */}
                      <div className={`flex flex-col items-center p-2 rounded-lg border font-medium ${
                        app.assessmentStatus === 'PASSED'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : app.assessmentStatus === 'FAILED'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : app.assessmentStatus === 'IN_PROGRESS'
                          ? 'bg-blue-50 border-blue-200 text-blue-800 animate-pulse'
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}>
                        {app.assessmentStatus === 'PASSED' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1" />
                        ) : (
                          <ClipboardList className="w-4 h-4 text-slate-500 mb-1" />
                        )}
                        <span className="text-[11px] font-bold">3. Assessment</span>
                        <span className="text-[10px]">
                          {app.assessmentStatus ? app.assessmentStatus.replace(/_/g, ' ') : 'Pending'}
                        </span>
                      </div>

                      {/* Step 4: Admission Decision */}
                      <div className={`flex flex-col items-center p-2 rounded-lg border font-medium ${
                        app.status === 'ACCEPTED' || app.admissionStatus === 'ACCEPTED'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : app.status === 'REJECTED' || app.admissionStatus === 'REJECTED'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}>
                        {app.status === 'ACCEPTED' ? (
                          <Award className="w-4 h-4 text-emerald-600 mb-1" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-slate-500 mb-1" />
                        )}
                        <span className="text-[11px] font-bold">4. Board Decision</span>
                        <span className="text-[10px]">
                          {app.admissionStatus ? app.admissionStatus.replace(/_/g, ' ') : 'Reviewing'}
                        </span>
                      </div>

                      {/* Step 5: Enrolment */}
                      <div className={`col-span-2 sm:col-span-1 flex flex-col items-center p-2 rounded-lg border font-medium ${
                        isAccepted
                          ? 'bg-emerald-600 border-emerald-700 text-white font-bold shadow-xs'
                          : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}>
                        <GraduationCap className={`w-4 h-4 mb-1 ${isAccepted ? 'text-white' : 'text-slate-400'}`} />
                        <span className="text-[11px] font-bold">5. Enrolment</span>
                        <span className="text-[10px]">
                          {isAccepted ? 'Ready to Enrol' : 'Awaiting Decision'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Review Notes from Programme Managers */}
                  {app.reviewNotes && (
                    <div className="my-4 p-3.5 bg-orange-50/70 border border-orange-200/80 rounded-lg text-xs space-y-1">
                      <p className="font-semibold text-orange-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-orange-600" /> Message from Admissions Committee:
                      </p>
                      <p className="text-slate-800 leading-relaxed font-medium">
                        "{app.reviewNotes}"
                      </p>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 font-medium">
                      Applicant: <strong className="text-slate-800">{app.applicantName}</strong> ({app.applicantEmail})
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingApp(app)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View Submitted Answers
                      </Button>

                      {activeInvitation && activeInvitation.status !== 'COMPLETED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setActiveTab('assessment');
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                          <ClipboardList className="w-3.5 h-3.5 mr-1" /> Take Pre-Admission Quiz
                        </Button>
                      )}

                      {isAccepted && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setActiveTab('decision')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                        >
                          <Award className="w-3.5 h-3.5 mr-1" /> View Official Offer Letter
                        </Button>
                      )}

                      {(app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleWithdraw(app.id)}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Withdraw
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRE-ADMISSION ASSESSMENT */}
      {activeTab === 'assessment' && (
        <div className="space-y-6">
          {invitations.length === 0 ? (
            <Card className="p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <ClipboardList className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">No Pending Pre-Admission Quizzes</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Pre-admission assessments are assigned once your initial application responses have been reviewed by the admissions team.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('/portal/assessment')}
              >
                Open General Assessment Hub
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {invitations.map((inv) => (
                <Card key={inv.id} className="p-6 border-slate-200 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="primary" className="text-[11px]">
                          {inv.assessmentTitle}
                        </Badge>
                        <span className="text-xs font-mono text-slate-500">
                          Token: {inv.token}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-2">
                        Programme: {inv.programmeName} ({inv.cohortName})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Pass Threshold: <strong className="text-slate-800">{inv.passThresholdPercentage || 70}%</strong>
                      </p>
                    </div>

                    <Badge
                      variant={
                        inv.status === 'COMPLETED'
                          ? inv.passed ? 'success' : 'danger'
                          : 'warning'
                      }
                      className="text-xs uppercase font-bold"
                    >
                      {inv.status === 'COMPLETED'
                        ? inv.passed ? 'PASSED' : 'FAILED'
                        : 'PENDING / IN PROGRESS'}
                    </Badge>
                  </div>

                  {inv.status === 'COMPLETED' ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs space-y-1 text-slate-700">
                        <p><strong>Score Achieved:</strong> {inv.score} / {inv.maxScore} points ({inv.percentage}%)</p>
                        <p><strong>Result:</strong> {inv.passed ? 'Successfully Passed Pass Threshold' : 'Did not meet passing criteria'}</p>
                        <p><strong>Completed At:</strong> {inv.completedAt ? new Date(inv.completedAt).toLocaleString() : 'N/A'}</p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate(`/portal/assessment?token=${inv.token}`)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View Assessment Summary
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs text-slate-700 space-y-1">
                        <p className="font-bold text-orange-950 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-orange-600" /> Pre-Admission Technical Readiness Test
                        </p>
                        <p className="text-slate-600">
                          Complete this timed assessment to qualify for admission into {inv.cohortName}.
                        </p>
                      </div>

                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => onNavigate(`/portal/assessment?token=${inv.token}`)}
                        className="bg-orange-600 hover:bg-orange-500 text-white font-bold"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                      >
                        Start Assessment Now
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADMISSION DECISION & OFFER LETTER */}
      {activeTab === 'decision' && (
        <div className="space-y-6">
          {isAccepted ? (
            <Card variant="bordered-orange" className="p-8 bg-white border-2 border-orange-500 shadow-xl space-y-6 relative overflow-hidden">
              {/* Decorative Corner Watermark */}
              <div className="absolute top-0 right-0 bg-linear-to-bl from-orange-600 to-orange-500 text-white py-1 px-8 transform rotate-12 translate-x-4 -translate-y-2 text-[10px] font-black uppercase tracking-widest shadow-md">
                OFFICIAL ADMISSION OFFER
              </div>

              {/* Institution Letterhead */}
              <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-orange-600/30">
                    <Layers className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                      NEXTGEN CLASS
                    </h2>
                    <p className="text-xs uppercase font-semibold text-slate-500 tracking-widest">
                      Office of Admissions & Programme Operations
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-600">
                  <p><strong>Date:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  <p><strong>Candidate ID:</strong> {currentUser?.uid?.substring(0, 10).toUpperCase() || 'APPLICANT-2026'}</p>
                </div>
              </div>

              {/* Letter Content */}
              <div className="space-y-4 text-slate-800 text-sm leading-relaxed">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <Award className="w-8 h-8 text-emerald-600 shrink-0" />
                  <div>
                    <h3 className="font-bold text-emerald-950 text-base">
                      Congratulations, {userProfile?.displayName || activeApplication?.applicantName || 'Applicant'}!
                    </h3>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      You have been officially admitted into <strong>{activeApplication?.programmeName || 'Generative AI & AI Automation'}</strong> — <strong>{activeApplication?.cohortName || 'Cohort 2'}</strong>.
                    </p>
                  </div>
                </div>

                <p>
                  Dear {userProfile?.displayName || activeApplication?.applicantName || 'Candidate'},
                </p>

                <p>
                  On behalf of the NextGen Class Admissions Board, we are delighted to offer you admission into our upcoming cohort. Your application, technical readiness, and commitment demonstrated the drive and capability required to succeed in our intensive training.
                </p>

                {/* Offer Specs Table */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-500 block">Admitted Programme:</span>
                    <strong className="text-slate-900 text-sm">{activeApplication?.programmeName || 'Generative AI & AI Automation'}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Cohort Session:</span>
                    <strong className="text-slate-900 text-sm">{activeApplication?.cohortName || 'Cohort 2 (Fall 2026)'}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Training Format:</span>
                    <strong className="text-slate-900">Hybrid (Virtual Live Labs & Hands-on Projects)</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Admission Status:</span>
                    <strong className="text-emerald-600 font-bold uppercase">OFFER CONFIRMED</strong>
                  </div>
                </div>

                {activeApplication?.reviewNotes && (
                  <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-orange-900">Selection Committee Feedback:</span>
                    <p className="text-slate-700 italic">"{activeApplication.reviewNotes}"</p>
                  </div>
                )}

                <p className="text-xs text-slate-600">
                  To secure your seat and activate your complete student access to class schedules, curriculum modules, assignments, and instructors, click the button below to accept your admission and initialize your Learner Dashboard.
                </p>
              </div>

              {/* Action: Enrol as Learner */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  <span>Authorized by Admissions Board • NextGen Class</span>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  isLoading={enrollingAppId === activeApplication?.id}
                  onClick={() => activeApplication && handleAcceptAdmission(activeApplication)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg w-full sm:w-auto"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Accept Offer & Enter Learner Hub
                </Button>
              </div>
            </Card>
          ) : activeApplication?.status === 'REJECTED' || activeApplication?.admissionStatus === 'REJECTED' ? (
            <Card className="p-8 text-center space-y-4 border-rose-200 bg-rose-50/30">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Application Decision: Not Selected</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Thank you for your interest in NextGen Class. Due to competitive cohort capacities, we are unable to offer admission for this session. We strongly encourage you to reapply for upcoming cohorts.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setActiveTab('catalog')}>
                Browse Upcoming Cohorts
              </Button>
            </Card>
          ) : (
            <Card className="p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Admission Review in Progress</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your application is currently being evaluated by the selection committee. Official admission decision letters will be published here upon completion of the review window.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('status')}>
                Check Application Progress
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* TAB 4: AVAILABLE PROGRAMMES & COHORTS */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Available Flagship Programmes</h2>
              <p className="text-xs text-slate-500">Explore open cohorts and submit your application.</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/')}
            >
              View Full Public Catalog
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {programmes.map((prog) => {
              const progCohorts = cohorts.filter((c) => c.programmeId === prog.id);
              const openCohort = progCohorts.find((c) => c.status === 'APPLICATION_OPEN') || progCohorts[0];

              return (
                <Card key={prog.id} className="p-6 border-slate-200 hover:border-orange-300 transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="primary" className="text-[10px]">
                        {prog.duration || '12 Weeks'}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-500">
                        {prog.deliveryFormat || 'Hybrid'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">{prog.name}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {prog.description}
                    </p>

                    {openCohort && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Upcoming Cohort:</span>
                          <strong className="text-slate-800">{openCohort.name} ({openCohort.code})</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">App Deadline:</span>
                          <span className="font-semibold text-orange-600">{openCohort.applicationCloseDate}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate(`/programmes/${prog.slug || prog.id}`)}
                    >
                      Learn More
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onNavigate(`/apply/${openCohort?.id || prog.id}`)}
                      className="bg-orange-600 hover:bg-orange-500 text-white font-bold"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Apply Now
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Submitted Answers Modal */}
      {viewingApp && (
        <Modal
          isOpen={true}
          onClose={() => setViewingApp(null)}
          title={`Application Submission — ${viewingApp.programmeName}`}
          description={`Reference ID: ${viewingApp.id}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <p><strong>Applicant:</strong> {viewingApp.applicantName} ({viewingApp.applicantEmail})</p>
              <p><strong>Cohort:</strong> {viewingApp.cohortName}</p>
              <p><strong>Status:</strong> {viewingApp.status}</p>
              <p><strong>Submitted At:</strong> {new Date(viewingApp.submittedAt).toLocaleString()}</p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Submitted Question Responses</h4>
              {Object.entries(viewingApp.answers || {}).length === 0 ? (
                <p className="text-xs text-slate-500 italic">No structured answers captured.</p>
              ) : (
                Object.entries(viewingApp.answers || {}).map(([qId, val], idx) => {
                  const fieldSnap = viewingApp.fieldSnapshots?.find((f) => f.id === qId);
                  const questionLabel = fieldSnap?.label || fieldSnap?.name || qId;
                  return (
                    <div key={qId} className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                      <p className="font-semibold text-slate-900">
                        {idx + 1}. {questionLabel}
                      </p>
                      <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 font-medium whitespace-pre-wrap">
                        {String(val || 'No answer provided')}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setViewingApp(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
