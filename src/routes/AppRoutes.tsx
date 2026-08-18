import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApplicantLayout } from '../layouts/ApplicantLayout';
import { LearnerLayout } from '../layouts/LearnerLayout';
import { StaffLayout } from '../layouts/StaffLayout';

import { AuthPage } from '../pages/AuthPage';
import { ProgrammeManagement } from '../pages/ProgrammeManagement';
import { PMApplicationDashboard } from '../pages/PMApplicationDashboard';
import { PMControlCenter } from '../pages/PMControlCenter';
import { FacilitatorAttendancePage } from '../pages/FacilitatorAttendancePage';
import { FacilitatorAssignmentsPage } from '../pages/FacilitatorAssignmentsPage';
import { PMAttendanceDashboard } from '../pages/PMAttendanceDashboard';
import { PMFeedbackDashboard } from '../pages/PMFeedbackDashboard';
import { PMProgressDashboard } from '../pages/PMProgressDashboard';
import { PMFinalProjectDashboard } from '../pages/PMFinalProjectDashboard';
import { PMAtRiskDashboard } from '../pages/PMAtRiskDashboard';
import { LearnerProgressPage } from '../pages/LearnerProgressPage';
import { FormBuilderView } from '../components/formBuilder/FormBuilderView';
import { PMAssessmentManagement } from '../pages/PMAssessmentManagement';
import { PMAdmissionDashboard } from '../pages/PMAdmissionDashboard';
import { PMNotificationDashboard } from '../pages/PMNotificationDashboard';
import { PMMEDashboard } from '../pages/PMMEDashboard';
import { PMReportsDashboard } from '../pages/PMReportsDashboard';
import { PMAICenter } from '../pages/PMAICenter';
import { AssessmentTakingPage } from '../pages/AssessmentTakingPage';
import { ApplicantStatusTracker } from '../pages/ApplicantStatusTracker';
import { ApplicationFormPage } from '../pages/ApplicationFormPage';
import { LearnerDashboard } from '../pages/LearnerDashboard';
import { CurriculumManagementPage } from '../pages/CurriculumManagementPage';
import { StaffLoginPage } from '../pages/StaffLoginPage';
import { Unauthorized } from '../pages/Unauthorized';

import { ApplicantAssessmentResourcesView } from '../components/applicant/ApplicantAssessmentResourcesView';
import { LearnerAssignmentsCapstoneView } from '../components/learner/LearnerAssignmentsCapstoneView';
import { StaffAssessmentResourcesView } from '../components/staff/StaffAssessmentResourcesView';
import { StaffManagementView } from '../components/staff/StaffManagementView';

import { Spinner } from '../components/ui/Spinner';
import { getProgrammes, getCohorts } from '../services/programmes';
import { Programme, Cohort, AccountType } from '../types';
import { Layers } from 'lucide-react';

export const AppRoutes: React.FC = () => {
  const {
    currentUser,
    userProfile,
    accountStatus,
    activeRole,
    staffRole,
    loading,
    getPostLoginPath,
  } = useAuth();

  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);

    getProgrammes().then(setProgrammes).catch(console.error);
    getCohorts().then(setCohorts).catch(console.error);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  // 1. SESSION INITIALIZATION LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 select-none">
        <div className="w-16 h-16 rounded-2xl bg-orange-600 flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-orange-600/30">
          <Layers className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">NEXTGEN CLASS</h1>
        <div className="text-sm text-slate-400 font-medium flex items-center gap-2">
          <Spinner size="sm" />
          <span>Verifying secure session...</span>
        </div>
      </div>
    );
  }

  // 2. GLOBAL AUTHENTICATION GATE
  // If user is not authenticated:
  if (!currentUser || !userProfile) {
    if (currentPath === '/staff/login' || currentPath === '/staff-login') {
      return <StaffLoginPage onNavigate={navigate} />;
    }
    if (currentPath === '/apply' || currentPath.startsWith('/apply')) {
      const cohortId = currentPath.split('/apply/')[1]?.split('?')[0] || undefined;
      return <ApplicationFormPage cohortId={cohortId} onNavigate={navigate} />;
    }
    return <AuthPage onNavigate={navigate} />;
  }

  // 3. ACCOUNT SUSPENDED GUARD
  if (accountStatus === 'SUSPENDED' || userProfile.accountStatus === 'SUSPENDED') {
    return (
      <Unauthorized
        onNavigate={navigate}
        customMessage="ACCOUNT SUSPENDED: Your account access has been temporarily suspended by administration."
      />
    );
  }

  // 4. USER PORTAL DETERMINATION
  const roleLower = (userProfile.role || '').toLowerCase();
  const isFacilitator =
    staffRole === 'FACILITATOR' ||
    (activeRole && activeRole.toLowerCase().includes('facilitator')) ||
    roleLower.includes('facilitator');

  const userAccountType: AccountType =
    userProfile.accountType ||
    (roleLower === 'applicant'
      ? 'APPLICANT'
      : roleLower === 'learner'
      ? 'LEARNER'
      : 'STAFF');

  // Root / Auth redirect if authenticated user lands on entry portals
  if (
    currentPath === '/' ||
    currentPath === '/login' ||
    currentPath === '/auth' ||
    currentPath === '/staff/login' ||
    currentPath === '/staff-login'
  ) {
    const postLoginTarget = getPostLoginPath(userProfile);
    if (postLoginTarget && postLoginTarget !== currentPath) {
      setTimeout(() => navigate(postLoginTarget), 0);
    }
  }

  // =========================================================================
  // 5. APPLICANT PORTAL ROUTING
  // =========================================================================
  if (
    currentPath.startsWith('/applicant') ||
    currentPath.startsWith('/portal/applicant') ||
    currentPath.startsWith('/apply')
  ) {
    if (userAccountType !== 'APPLICANT') {
      return (
        <Unauthorized
          onNavigate={navigate}
          customMessage="ACCESS RESTRICTED: Your account is not registered as an Applicant. Please return to your authorized portal."
        />
      );
    }

    let pageTitle = 'Applicant Dashboard';
    let pageSubtitle = 'Admissions lifecycle, application status, assessments, and offer letters';
    let content = <ApplicantStatusTracker initialTab="status" onNavigate={navigate} />;

    if (
      currentPath === '/applicant/application' ||
      currentPath.startsWith('/apply') ||
      currentPath.startsWith('/applicant/apply')
    ) {
      let cohortId: string | undefined = undefined;
      if (currentPath.includes('/apply/')) {
        cohortId = currentPath.split('/apply/')[1]?.split('?')[0] || undefined;
      }
      pageTitle = 'My Application Form';
      pageSubtitle = 'Complete your official application profile and cohort selection';
      content = <ApplicationFormPage cohortId={cohortId} onNavigate={navigate} />;
    } else if (
      currentPath === '/applicant/programmes' ||
      currentPath === '/applicant/catalog'
    ) {
      pageTitle = 'Available Programmes Catalog';
      pageSubtitle = 'Explore our open cohorts, learning paths, and admissions schedule';
      content = <ApplicantStatusTracker initialTab="catalog" onNavigate={navigate} />;
    } else if (currentPath === '/applicant/assessment') {
      pageTitle = 'Pre-Admission Assessment';
      pageSubtitle = 'Timed assessment and technical aptitude screening';
      content = <AssessmentTakingPage onNavigate={navigate} />;
    } else if (
      currentPath === '/applicant/assessment-resources' ||
      currentPath === '/applicant/resources'
    ) {
      pageTitle = 'Assessment Study Resources';
      pageSubtitle = 'Official syllabus documents, sample question sets, and technical guides';
      content = <ApplicantAssessmentResourcesView onNavigate={navigate} />;
    } else if (currentPath === '/applicant/assessment-result') {
      pageTitle = 'Assessment Result & Score Breakdown';
      pageSubtitle = 'Review your evaluation status and performance metrics';
      content = <ApplicantStatusTracker initialTab="assessment" onNavigate={navigate} />;
    } else if (currentPath === '/applicant/admission-status') {
      pageTitle = 'Admission Decision & Enrolment';
      pageSubtitle = 'Official admission decision, acceptance letter, and cohort enrolment code';
      content = <ApplicantStatusTracker initialTab="decision" onNavigate={navigate} />;
    } else if (currentPath === '/applicant/profile') {
      pageTitle = 'Applicant Profile';
      pageSubtitle = 'Manage your applicant contact details and account credentials';
      content = <ApplicantStatusTracker initialTab="status" onNavigate={navigate} />;
    }

    return (
      <ApplicantLayout
        currentPath={currentPath}
        onNavigate={navigate}
        title={pageTitle}
        subtitle={pageSubtitle}
      >
        {content}
      </ApplicantLayout>
    );
  }

  // =========================================================================
  // 6. LEARNER PORTAL ROUTING
  // =========================================================================
  if (currentPath.startsWith('/learner') || currentPath.startsWith('/portal/learner')) {
    if (userAccountType !== 'LEARNER') {
      return (
        <Unauthorized
          onNavigate={navigate}
          customMessage="ACCESS RESTRICTED: Learner portal access is reserved for enrolled students."
        />
      );
    }

    let pageTitle = 'Learner Hub & Timetable';
    let pageSubtitle = 'Track live masterclasses, learning milestones, and assignments';
    let content = <LearnerDashboard currentPath="/portal/learner/dashboard" onNavigate={navigate} />;

    if (currentPath === '/learner/classes') {
      pageTitle = 'My Classes & Timetable';
      pageSubtitle = 'Live cohort sessions, schedule, and join links';
      content = <LearnerDashboard currentPath="/portal/learner/classes" onNavigate={navigate} />;
    } else if (currentPath === '/learner/resources') {
      pageTitle = 'Course Resources & Library';
      pageSubtitle = 'Module slides, code repositories, and reading materials';
      content = <LearnerDashboard currentPath="/portal/learner/resources" onNavigate={navigate} />;
    } else if (currentPath === '/learner/assignments') {
      pageTitle = 'Assignments & Final Capstone Project';
      pageSubtitle = 'Weekly assignments, project submissions, and instructor feedback';
      content = <LearnerAssignmentsCapstoneView onNavigate={navigate} />;
    } else if (currentPath === '/learner/attendance') {
      pageTitle = 'Attendance Record';
      pageSubtitle = 'Track your attendance percentage and class participation';
      content = <LearnerDashboard currentPath="/portal/learner/attendance" onNavigate={navigate} />;
    } else if (currentPath === '/learner/progress') {
      pageTitle = 'Learning Progress & Milestones';
      pageSubtitle = 'Syllabus mastery, completion status, and graduation eligibility';
      content = <LearnerProgressPage onNavigate={navigate} />;
    } else if (currentPath === '/learner/feedback') {
      pageTitle = 'Feedback & Surveys';
      pageSubtitle = 'Share your weekly cohort experience and course ratings';
      content = <LearnerDashboard currentPath="/portal/learner/feedback" onNavigate={navigate} />;
    } else if (currentPath === '/learner/certificate') {
      pageTitle = 'Official Certificate & Verification';
      pageSubtitle = 'Download verified graduation credential upon curriculum completion';
      content = <LearnerDashboard currentPath="/portal/learner/certificate" onNavigate={navigate} />;
    } else if (currentPath === '/learner/profile') {
      pageTitle = 'Learner Profile';
      pageSubtitle = 'Personal profile, enrolment ID, and notification preferences';
      content = <LearnerDashboard currentPath="/portal/learner/profile" onNavigate={navigate} />;
    }

    return (
      <LearnerLayout
        currentPath={currentPath}
        onNavigate={navigate}
        title={pageTitle}
        subtitle={pageSubtitle}
      >
        {content}
      </LearnerLayout>
    );
  }

  // =========================================================================
  // 7. STAFF PORTAL ROUTING (PROGRAMME MANAGER & FACILITATOR)
  // =========================================================================
  if (
    currentPath.startsWith('/staff') ||
    currentPath.startsWith('/portal/pm') ||
    currentPath.startsWith('/portal/facilitator') ||
    currentPath.startsWith('/portal/staff') ||
    currentPath.startsWith('/portal/admin') ||
    currentPath.startsWith('/portal/me') ||
    currentPath.startsWith('/pm') ||
    currentPath.startsWith('/facilitator')
  ) {
    if (userAccountType !== 'STAFF') {
      return (
        <Unauthorized
          onNavigate={navigate}
          customMessage="ACCESS RESTRICTED: Staff portal is restricted to authorized Programme Managers and Facilitators."
        />
      );
    }

    // Facilitator Route Permission Enforcement
    if (isFacilitator) {
      const pmRestrictedPaths = [
        '/staff/forms',
        '/staff/applications',
        '/staff/assessments',
        '/staff/assessment-resources',
        '/staff/admissions',
        '/staff/programmes',
        '/staff/cohorts',
        '/staff/staff-management',
        '/staff/reports',
        '/staff/me',
        '/portal/pm/forms',
        '/portal/pm/applications',
        '/portal/pm/admissions',
      ];

      const isTryingRestricted = pmRestrictedPaths.some((p) => currentPath.startsWith(p));
      if (isTryingRestricted) {
        return (
          <Unauthorized
            onNavigate={navigate}
            customMessage="ACCESS RESTRICTED: Facilitator accounts do not have permission to manage programme admissions, form builders, or system settings."
          />
        );
      }
    }

    let pageTitle = isFacilitator ? 'Facilitator Console' : 'Programme Operations';
    let pageSubtitle = isFacilitator
      ? 'Class delivery, learner attendance, assignment grading, and progress'
      : 'Programmes, admissions, assessments, curriculum, M&E and team management';
    let content = <PMControlCenter initialTab="schedule" onNavigate={navigate} />;

    // Subroute mapping
    if (currentPath === '/staff/programmes' || currentPath.startsWith('/portal/pm/programmes')) {
      pageTitle = 'Programme Directory & Configuration';
      pageSubtitle = 'Create and manage NextGen Class educational tracks';
      content = <ProgrammeManagement initialTab="programmes" />;
    } else if (currentPath === '/staff/cohorts' || currentPath.startsWith('/portal/pm/cohorts')) {
      pageTitle = 'Cohort Management';
      pageSubtitle = 'Schedule cohort dates, capacity, and application intake cycles';
      content = <ProgrammeManagement initialTab="cohorts" />;
    } else if (currentPath === '/staff/curriculum' || currentPath.startsWith('/portal/pm/curriculum')) {
      pageTitle = 'Curriculum & Modules';
      pageSubtitle = 'Organize modules, learning outcomes, lessons, and course resources';
      content = <CurriculumManagementPage />;
    } else if (currentPath === '/staff/applications' || currentPath.startsWith('/portal/pm/applications')) {
      pageTitle = 'Applicant Admissions & Applications';
      pageSubtitle = 'Review incoming applications, score answers, and manage admissions intake';
      content = <PMApplicationDashboard />;
    } else if (currentPath === '/staff/forms' || currentPath.startsWith('/portal/pm/form-builder')) {
      pageTitle = 'Custom Form & Assessment Builder';
      pageSubtitle = 'Design multi-step forms, question banks, AI document import, and rubric criteria';
      content = <FormBuilderView programmes={programmes} cohorts={cohorts} />;
    } else if (currentPath === '/staff/assessments' || currentPath.startsWith('/portal/pm/assessments')) {
      pageTitle = 'Applicant Assessments & Question Bank';
      pageSubtitle = 'Pre-admission tests, synchronous window controls (DRAFT, READY, OPEN, CLOSED), and attempts';
      content = <PMAssessmentManagement onNavigate={navigate} />;
    } else if (currentPath === '/staff/assessment-resources') {
      pageTitle = 'Assessment Study Resources & Guides';
      pageSubtitle = 'Upload and publish applicant study guides, syllabus PDFs, and preparation materials';
      content = <StaffAssessmentResourcesView />;
    } else if (currentPath === '/staff/admissions' || currentPath.startsWith('/portal/pm/admissions')) {
      pageTitle = 'Admissions Decisions & Cohort Enrolment';
      pageSubtitle = 'Issue offer letters, rejection notices, and generate official learner enrolments';
      content = <PMAdmissionDashboard />;
    } else if (currentPath === '/staff/learners' || currentPath.startsWith('/portal/pm/learners')) {
      pageTitle = 'Learner Directory & Attendance';
      pageSubtitle = 'Student management, enrolled cohorts, and daily check-ins';
      content = <PMAttendanceDashboard onNavigate={navigate} />;
    } else if (currentPath === '/staff/classes') {
      pageTitle = 'Live Classes & Masterclasses';
      pageSubtitle = 'Conduct class sessions, launch meeting links, and mark student attendance';
      content = <FacilitatorAttendancePage onNavigate={navigate} />;
    } else if (currentPath === '/staff/attendance') {
      pageTitle = 'Attendance Tracking & Records';
      pageSubtitle = 'Track and audit student attendance records across cohorts';
      content = <PMAttendanceDashboard onNavigate={navigate} />;
    } else if (currentPath === '/staff/assignments') {
      pageTitle = 'Assignment & Capstone Submissions';
      pageSubtitle = 'Grade weekly deliverables, provide student feedback, and score capstone projects';
      content = <FacilitatorAssignmentsPage onNavigate={navigate} />;
    } else if (currentPath === '/staff/progress') {
      pageTitle = 'Learner Progress Engine';
      pageSubtitle = 'Track student milestone mastery and completion progress';
      content = <PMProgressDashboard onNavigate={navigate} />;
    } else if (currentPath === '/staff/at-risk') {
      pageTitle = 'At-Risk Early Warning & Interventions';
      pageSubtitle = 'Automated risk detection for attendance drops and missed assignments';
      content = <PMAtRiskDashboard onNavigate={navigate} />;
    } else if (currentPath === '/staff/feedback') {
      pageTitle = 'Learner Feedback & Survey Analysis';
      pageSubtitle = 'Monitor satisfaction scores, facilitator ratings, and qualitative comments';
      content = <PMFeedbackDashboard onNavigate={navigate} />;
    } else if (currentPath === '/staff/certificates') {
      pageTitle = 'Certificate Issuance & Verification';
      pageSubtitle = 'Generate and verify official graduation certificates for qualifying learners';
      content = <LearnerDashboard currentPath="/portal/learner/certificate" onNavigate={navigate} />;
    } else if (currentPath === '/staff/resources') {
      pageTitle = 'Curriculum & Course Resources';
      pageSubtitle = 'Manage downloadable learning materials and course assets';
      content = <CurriculumManagementPage />;
    } else if (currentPath === '/staff/reports' || currentPath.startsWith('/portal/pm/reports')) {
      pageTitle = 'Reports & Data Exports';
      pageSubtitle = 'Cohort completion reports, demographic breakdowns, and exportable analytics';
      content = <PMReportsDashboard />;
    } else if (currentPath === '/staff/me' || currentPath.startsWith('/portal/pm/me')) {
      pageTitle = 'Monitoring & Evaluation (M&E) Indicators';
      pageSubtitle = 'Impact metrics, retention rates, and institutional key performance indicators';
      content = <PMMEDashboard currentPath={currentPath} />;
    } else if (currentPath === '/staff/ai' || currentPath.startsWith('/portal/pm/ai')) {
      pageTitle = 'AI Intelligence & Question Generator';
      pageSubtitle = 'Automated curriculum assistance, question bank generation, and audit logs';
      content = <PMAICenter />;
    } else if (currentPath === '/staff/notifications' || currentPath.startsWith('/portal/pm/notifications')) {
      pageTitle = 'Notification Center';
      pageSubtitle = 'Send cohort announcements and broadcast automated system alerts';
      content = <PMNotificationDashboard />;
    } else if (currentPath === '/staff/staff-management') {
      pageTitle = 'Staff Management & Role Assignments';
      pageSubtitle = 'Manage instructors, assign facilitators to cohorts, and configure team permissions';
      content = <StaffManagementView />;
    }

    return (
      <StaffLayout
        currentPath={currentPath}
        onNavigate={navigate}
        title={pageTitle}
        subtitle={pageSubtitle}
      >
        {content}
      </StaffLayout>
    );
  }

  // Default fallback -> redirect to user's post-login dashboard
  const fallbackTarget = getPostLoginPath(userProfile);
  if (fallbackTarget && fallbackTarget !== currentPath) {
    setTimeout(() => navigate(fallbackTarget), 0);
  }

  return <AuthPage onNavigate={navigate} />;
};
