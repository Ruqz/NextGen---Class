import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { Home } from '../pages/Home';
import { AuthPage } from '../pages/AuthPage';
import { PortalHub } from '../pages/PortalHub';
import { ProgrammeManagement } from '../pages/ProgrammeManagement';
import { PublicProgrammePage } from '../pages/PublicProgrammePage';
import { ApplicationFormPage } from '../pages/ApplicationFormPage';
import { PMApplicationDashboard } from '../pages/PMApplicationDashboard';
import { FormBuilderView } from '../components/formBuilder/FormBuilderView';
import { PMAssessmentManagement } from '../pages/PMAssessmentManagement';
import { PMAdmissionDashboard } from '../pages/PMAdmissionDashboard';
import { AssessmentTakingPage } from '../pages/AssessmentTakingPage';
import { ApplicantStatusTracker } from '../pages/ApplicantStatusTracker';
import { LearnerDashboard } from '../pages/LearnerDashboard';
import { CurriculumManagementPage } from '../pages/CurriculumManagementPage';
import { Unauthorized } from '../pages/Unauthorized';
import { NotFound } from '../pages/NotFound';
import { getProgrammes, getCohorts } from '../services/programmes';
import { Programme, Cohort } from '../types';

export const AppRoutes: React.FC = () => {
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

  // Determine view rendering based on currentPath
  if (currentPath.startsWith('/portal')) {
    // Determine target portal content
    let portalContent = <PortalHub onNavigate={navigate} />;
    let allowedRoles: any[] | undefined = undefined;

    if (currentPath.startsWith('/portal/pm/programmes') || currentPath.startsWith('/portal/admin/programmes')) {
      allowedRoles = ['Programme Manager', 'Super Admin', 'PROGRAMME_MANAGER', 'SUPER_ADMIN'];
      portalContent = <ProgrammeManagement initialTab="programmes" />;
    } else if (currentPath.startsWith('/portal/pm/cohorts')) {
      allowedRoles = ['Programme Manager', 'Super Admin', 'PROGRAMME_MANAGER', 'SUPER_ADMIN'];
      portalContent = <ProgrammeManagement initialTab="cohorts" />;
    } else if (currentPath.startsWith('/portal/pm/curriculum')) {
      allowedRoles = ['Programme Manager', 'Super Admin', 'PROGRAMME_MANAGER', 'SUPER_ADMIN'];
      portalContent = <CurriculumManagementPage />;
    } else if (currentPath.startsWith('/portal/pm/form-builder')) {
      allowedRoles = ['Programme Manager', 'Super Admin', 'PROGRAMME_MANAGER', 'SUPER_ADMIN'];
      portalContent = <FormBuilderView programmes={programmes} cohorts={cohorts} />;
    } else if (currentPath.startsWith('/portal/pm/applications')) {
      allowedRoles = ['Programme Manager', 'Super Admin', 'PROGRAMME_MANAGER', 'SUPER_ADMIN'];
      portalContent = <PMApplicationDashboard />;
    } else if (currentPath.startsWith('/portal/pm/assessments')) {
      allowedRoles = ['Programme Manager', 'Super Admin', 'PROGRAMME_MANAGER', 'SUPER_ADMIN'];
      portalContent = <PMAssessmentManagement />;
    } else if (currentPath.startsWith('/portal/pm/admissions')) {
      allowedRoles = ['Programme Manager', 'Super Admin', 'PROGRAMME_MANAGER', 'SUPER_ADMIN'];
      portalContent = <PMAdmissionDashboard />;
    } else if (
      currentPath.startsWith('/portal/applicant/assessment') ||
      currentPath.startsWith('/portal/assessment-invite') ||
      currentPath.startsWith('/portal/assessment')
    ) {
      allowedRoles = undefined; // allow candidates with link
      portalContent = <AssessmentTakingPage onNavigate={navigate} />;
    } else if (currentPath.startsWith('/portal/pm')) {
      allowedRoles = ['Programme Manager', 'Super Admin', 'PROGRAMME_MANAGER', 'SUPER_ADMIN'];
      portalContent = <PMApplicationDashboard />;
    } else if (currentPath.startsWith('/portal/facilitator')) {
      allowedRoles = ['Facilitator', 'Programme Manager', 'Super Admin', 'FACILITATOR', 'PROGRAMME_MANAGER', 'SUPER_ADMIN'];
    } else if (currentPath.startsWith('/portal/me')) {
      allowedRoles = ['M&E Manager', 'Programme Manager', 'Super Admin', 'ME_MANAGER', 'PROGRAMME_MANAGER', 'SUPER_ADMIN'];
    } else if (currentPath.startsWith('/portal/admin')) {
      allowedRoles = ['Super Admin', 'SUPER_ADMIN'];
    } else if (currentPath.startsWith('/portal/learner')) {
      allowedRoles = ['Learner', 'Programme Manager', 'Super Admin', 'LEARNER', 'PROGRAMME_MANAGER', 'SUPER_ADMIN'];
      portalContent = <LearnerDashboard currentPath={currentPath} onNavigate={navigate} />;
    } else if (currentPath.startsWith('/portal/applicant')) {
      allowedRoles = ['Applicant', 'Programme Manager', 'Super Admin', 'APPLICANT', 'PROGRAMME_MANAGER', 'SUPER_ADMIN'];
      portalContent = <ApplicantStatusTracker onNavigate={navigate} />;
    }

    return (
      <DashboardLayout
        currentPath={currentPath}
        onNavigate={navigate}
        title="NextGen Class Platform Portal"
        subtitle="Role-based administration and learner workspace"
      >
        <ProtectedRoute allowedRoles={allowedRoles} onNavigate={navigate}>
          {portalContent}
        </ProtectedRoute>
      </DashboardLayout>
    );
  }

  if (currentPath.startsWith('/auth')) {
    const searchParams = new URLSearchParams(window.location.search);
    const modeParam = searchParams.get('mode') === 'register' ? 'register' : 'login';
    return (
      <MainLayout currentPath={currentPath} onNavigate={navigate}>
        <AuthPage initialMode={modeParam} onNavigate={navigate} />
      </MainLayout>
    );
  }

  if (currentPath === '/unauthorized') {
    return (
      <MainLayout currentPath={currentPath} onNavigate={navigate}>
        <Unauthorized onNavigate={navigate} />
      </MainLayout>
    );
  }

  if (currentPath.startsWith('/apply')) {
    const parts = currentPath.split('/');
    const cohortIdParam = parts.length >= 3 ? parts[2] : undefined;
    return (
      <MainLayout currentPath={currentPath} onNavigate={navigate}>
        <ApplicationFormPage cohortId={cohortIdParam} onNavigate={navigate} />
      </MainLayout>
    );
  }

  if (currentPath.startsWith('/programmes/')) {
    const parts = currentPath.split('/');
    const slugParam = parts.length >= 3 ? parts[2] : undefined;
    return (
      <MainLayout currentPath={currentPath} onNavigate={navigate}>
        <PublicProgrammePage slug={slugParam} onNavigate={navigate} />
      </MainLayout>
    );
  }

  if (currentPath === '/' || currentPath === '/programmes') {
    return (
      <MainLayout currentPath={currentPath} onNavigate={navigate}>
        <Home onNavigate={navigate} />
      </MainLayout>
    );
  }

  return (
    <MainLayout currentPath={currentPath} onNavigate={navigate}>
      <NotFound onNavigate={navigate} />
    </MainLayout>
  );
};
