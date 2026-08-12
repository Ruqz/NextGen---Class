import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  FileCheck,
  Award,
  Users,
  Settings,
  BarChart3,
  ClipboardList,
  GraduationCap,
  BellRing,
  HelpCircle,
  FileText,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

interface NavMenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate }) => {
  const { activeRole } = useAuth();

  const getMenuItems = (role: UserRole): NavMenuItem[] => {
    switch (role) {
      case 'Applicant':
        return [
          { label: 'Application Status', path: '/portal/applicant/status', icon: <FileCheck className="w-4 h-4" /> },
          { label: 'Pre-Admission Quiz', path: '/portal/applicant/assessment', icon: <ClipboardList className="w-4 h-4" />, badge: 'Required' },
          { label: 'Admission Letter', path: '/portal/applicant/decision', icon: <Award className="w-4 h-4" /> },
        ];

      case 'Learner':
        return [
          { label: 'Learner Dashboard', path: '/portal/learner/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Programme & Curriculum', path: '/portal/learner/programme', icon: <BookOpen className="w-4 h-4" /> },
          { label: 'Classes & Live Sessions', path: '/portal/learner/classes', icon: <Calendar className="w-4 h-4" /> },
          { label: 'Assignments & Labs', path: '/portal/learner/assignments', icon: <ClipboardList className="w-4 h-4" /> },
          { label: 'Assessments & Quizzes', path: '/portal/learner/assessments', icon: <FileCheck className="w-4 h-4" /> },
          { label: 'Resources & Library', path: '/portal/learner/resources', icon: <BookOpen className="w-4 h-4" /> },
          { label: 'Progress & Analytics', path: '/portal/learner/progress', icon: <BarChart3 className="w-4 h-4" /> },
          { label: 'Feedback & Ratings', path: '/portal/learner/feedback', icon: <HelpCircle className="w-4 h-4" /> },
          { label: 'Official Certificate', path: '/portal/learner/certificate', icon: <Award className="w-4 h-4" /> },
          { label: 'My Learner Profile', path: '/portal/learner/profile', icon: <Users className="w-4 h-4" /> },
        ];

      case 'Facilitator':
        return [
          { label: 'Instructor Overview', path: '/portal/facilitator/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Class Schedules', path: '/portal/facilitator/classes', icon: <Calendar className="w-4 h-4" /> },
          { label: 'Attendance Roster', path: '/portal/facilitator/attendance', icon: <UserCheck className="w-4 h-4" /> },
          { label: 'Submissions & Grading', path: '/portal/facilitator/assignments', icon: <ClipboardList className="w-4 h-4" />, badge: '5 Pending' },
          { label: 'Learner Directory', path: '/portal/facilitator/learners', icon: <Users className="w-4 h-4" /> },
        ];

      case 'Programme Manager':
        return [
          { label: 'PM Control Center', path: '/portal/pm/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Curriculum Builder', path: '/portal/pm/curriculum', icon: <Layers className="w-4 h-4" />, badge: 'Mod 11' },
          { label: 'Programmes & Specs', path: '/portal/pm/programmes', icon: <BookOpen className="w-4 h-4" /> },
          { label: 'Cohorts Lifecycle', path: '/portal/pm/cohorts', icon: <GraduationCap className="w-4 h-4" /> },
          { label: 'Applications & Review', path: '/portal/pm/applications', icon: <FileText className="w-4 h-4" /> },
          { label: 'Admissions & Enrolment', path: '/portal/pm/admissions', icon: <UserCheck className="w-4 h-4" /> },
          { label: 'Learners & Attendance', path: '/portal/pm/learners', icon: <Users className="w-4 h-4" /> },
          { label: 'At-Risk Interventions', path: '/portal/pm/interventions', icon: <AlertCircle className="w-4 h-4" />, badge: '2 Flagged' },
          { label: 'Certificates Release', path: '/portal/pm/certificates', icon: <Award className="w-4 h-4" /> },
        ];

      case 'M&E Manager':
        return [
          { label: 'M&E Dashboard', path: '/portal/me/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Indicators & Targets', path: '/portal/me/indicators', icon: <BarChart3 className="w-4 h-4" /> },
          { label: 'Cohort Outcomes', path: '/portal/me/outcomes', icon: <GraduationCap className="w-4 h-4" /> },
          { label: 'M&E Evaluation Reports', path: '/portal/me/reports', icon: <FileText className="w-4 h-4" /> },
        ];

      case 'Super Admin':
        return [
          { label: 'System Overview', path: '/portal/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Users & Role Access', path: '/portal/admin/users', icon: <Users className="w-4 h-4" /> },
          { label: 'Programmes Config', path: '/portal/admin/programmes', icon: <BookOpen className="w-4 h-4" /> },
          { label: 'Platform Security & Rules', path: '/portal/admin/security', icon: <ShieldCheck className="w-4 h-4" /> },
          { label: 'System Audit Logs', path: '/portal/admin/audit', icon: <ClipboardList className="w-4 h-4" /> },
        ];

      default:
        return [];
    }
  };

  const menuItems = getMenuItems(activeRole);

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col justify-between shrink-0 border-r border-slate-800">
      <div className="p-4 space-y-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            {activeRole} Navigation
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-orange-600 text-white font-semibold shadow-xs'
                      : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        isActive ? 'bg-orange-700 text-white' : 'bg-slate-800 text-orange-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/80 rounded-lg p-3 text-xs">
          <p className="font-semibold text-slate-200">NextGen PRO Platform</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Cohort 2: Generative AI & Automation
          </p>
        </div>
      </div>
    </aside>
  );
};
