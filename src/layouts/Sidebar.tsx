import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  FileCheck,
  Award,
  Users,
  BarChart3,
  ClipboardList,
  GraduationCap,
  BellRing,
  HelpCircle,
  FileText,
  UserCheck,
  Sliders,
  Layers,
  FolderOpen,
  UserPlus,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export interface NavMenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

export interface NavSection {
  title?: string;
  items: NavMenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate }) => {
  const { activeRole, userProfile } = useAuth();

  // Normalize role to canonical groups: APPLICANT, LEARNER, FACILITATOR, PROGRAMME_MANAGER
  const normalizedRole = (): 'APPLICANT' | 'LEARNER' | 'FACILITATOR' | 'PROGRAMME_MANAGER' => {
    const r = (activeRole || userProfile?.role || 'Applicant').toUpperCase();
    if (r.includes('APPLICANT')) return 'APPLICANT';
    if (r.includes('LEARNER')) return 'LEARNER';
    if (r.includes('FACILITATOR')) return 'FACILITATOR';
    return 'PROGRAMME_MANAGER';
  };

  const role = normalizedRole();

  const getMenuSections = (): NavSection[] => {
    switch (role) {
      case 'APPLICANT':
        return [
          {
            title: 'APPLICANT PORTAL',
            items: [
              { label: 'Status Dashboard', path: '/portal/applicant/status', icon: <LayoutDashboard className="w-4 h-4" /> },
              { label: 'My Application', path: '/portal/applicant/application', icon: <FileText className="w-4 h-4" /> },
              { label: 'Assessment Test', path: '/portal/applicant/assessment', icon: <ClipboardList className="w-4 h-4" />, badge: 'Required' },
              { label: 'Study Resources', path: '/portal/applicant/resources', icon: <BookOpen className="w-4 h-4" /> },
              { label: 'Admission Decision', path: '/portal/applicant/decision', icon: <Award className="w-4 h-4" /> },
              { label: 'Applicant Profile', path: '/portal/applicant/profile', icon: <Users className="w-4 h-4" /> },
            ],
          },
        ];

      case 'LEARNER':
        return [
          {
            title: 'LEARNING HUB',
            items: [
              { label: 'Learner Dashboard', path: '/portal/learner/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
              { label: 'My Classes & Timetable', path: '/portal/learner/classes', icon: <Calendar className="w-4 h-4" /> },
              { label: 'Course Resources', path: '/portal/learner/resources', icon: <BookOpen className="w-4 h-4" /> },
              { label: 'Assignments & Capstone', path: '/portal/learner/assignments', icon: <ClipboardList className="w-4 h-4" /> },
              { label: 'Attendance Record', path: '/portal/learner/attendance', icon: <UserCheck className="w-4 h-4" /> },
              { label: 'Learning Progress', path: '/portal/learner/progress', icon: <BarChart3 className="w-4 h-4" /> },
              { label: 'Feedback & Ratings', path: '/portal/learner/feedback', icon: <HelpCircle className="w-4 h-4" /> },
              { label: 'Official Certificate', path: '/portal/learner/certificate', icon: <Award className="w-4 h-4" /> },
              { label: 'Learner Profile', path: '/portal/learner/profile', icon: <Users className="w-4 h-4" /> },
            ],
          },
        ];

      case 'FACILITATOR':
        return [
          {
            title: 'FACILITATOR HUB',
            items: [
              { label: 'Overview & Timetable', path: '/portal/facilitator/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
              { label: 'Live Masterclasses', path: '/portal/facilitator/classes', icon: <Calendar className="w-4 h-4" /> },
              { label: 'Attendance Tracker', path: '/portal/facilitator/attendance', icon: <UserCheck className="w-4 h-4" /> },
              { label: 'Learner Directory', path: '/portal/facilitator/learners', icon: <Users className="w-4 h-4" /> },
              { label: 'Assignments & Grading', path: '/portal/facilitator/assignments', icon: <CheckCircle2 className="w-4 h-4" /> },
              { label: 'Learner Progress', path: '/portal/facilitator/progress', icon: <GraduationCap className="w-4 h-4" /> },
              { label: 'At-Risk Interventions', path: '/portal/facilitator/at-risk', icon: <AlertCircle className="w-4 h-4" /> },
              { label: 'Capstone Projects', path: '/portal/facilitator/projects', icon: <Award className="w-4 h-4" /> },
              { label: 'Feedback & Reviews', path: '/portal/facilitator/feedback', icon: <HelpCircle className="w-4 h-4" /> },
            ],
          },
        ];

      case 'PROGRAMME_MANAGER':
        return [
          {
            title: 'OVERVIEW & TRACKS',
            items: [
              { label: 'Control Center & Timetable', path: '/portal/pm/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
              { label: 'Programmes & Cohorts', path: '/portal/pm/programmes', icon: <Layers className="w-4 h-4" /> },
            ],
          },
          {
            title: 'ADMISSIONS & INTAKE',
            items: [
              { label: 'Application Form Builder', path: '/portal/pm/form-builder', icon: <SlidersHorizontal className="w-4 h-4" />, badge: 'Builder' },
              { label: 'Applications Intake', path: '/portal/pm/applications', icon: <FileText className="w-4 h-4" /> },
              { label: 'Assessments & Bank', path: '/portal/pm/assessments', icon: <ClipboardList className="w-4 h-4" /> },
              { label: 'Admissions & Decisions', path: '/portal/pm/admissions', icon: <FileCheck className="w-4 h-4" /> },
            ],
          },
          {
            title: 'ACADEMIC & LEARNING',
            items: [
              { label: 'Curriculum & Modules', path: '/portal/pm/curriculum', icon: <BookOpen className="w-4 h-4" /> },
              { label: 'Learners & Attendance', path: '/portal/pm/learners', icon: <Users className="w-4 h-4" /> },
              { label: 'Progress & Milestones', path: '/portal/pm/progress', icon: <GraduationCap className="w-4 h-4" /> },
              { label: 'Assignments & Grading', path: '/portal/pm/assignments', icon: <CheckCircle2 className="w-4 h-4" /> },
              { label: 'Final Projects / Capstone', path: '/portal/pm/projects', icon: <Award className="w-4 h-4" /> },
              { label: 'At-Risk & Interventions', path: '/portal/pm/at-risk', icon: <AlertCircle className="w-4 h-4" /> },
            ],
          },
          {
            title: 'EVALUATION & OPERATIONS',
            items: [
              { label: 'Feedback & Surveys', path: '/portal/pm/feedback', icon: <HelpCircle className="w-4 h-4" /> },
              { label: 'M&E Indicators & KPIs', path: '/portal/pm/me', icon: <ShieldCheck className="w-4 h-4" /> },
              { label: 'Reports & Analytics', path: '/portal/pm/reporting', icon: <BarChart3 className="w-4 h-4" /> },
              { label: 'AI Intelligence Center', path: '/portal/pm/ai', icon: <Sparkles className="w-4 h-4" />, badge: 'AI' },
              { label: 'Notification Center', path: '/portal/pm/notifications', icon: <BellRing className="w-4 h-4" /> },
            ],
          },
        ];

      default:
        return [];
    }
  };

  const sections = getMenuSections();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col justify-between shrink-0 border-r border-slate-800">
      <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-8rem)] custom-scrollbar">
        {(sections || []).map((sec, secIdx) => (
          <div key={sec.title || secIdx} className="space-y-1">
            {sec.title && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
                {sec.title}
              </p>
            )}
            <nav className="space-y-0.5">
              {(sec.items || []).map((item, idx) => {
                // Match active state either exactly or prefix
                const isActive =
                  currentPath === item.path ||
                  (item.path !== '/' &&
                    !['/portal/pm/dashboard', '/portal/learner/dashboard', '/portal/facilitator/dashboard'].includes(item.path) &&
                    currentPath.startsWith(item.path));

                return (
                  <button
                    key={`${item.label}-${item.path}-${idx}`}
                    onClick={() => onNavigate(item.path)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? 'bg-orange-600 text-white font-semibold shadow-xs'
                        : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                          isActive ? 'bg-orange-700 text-white' : 'bg-slate-800 text-orange-400 border border-orange-500/30'
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
        ))}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/90 shrink-0">
        <div className="bg-slate-800/80 rounded-lg p-3 text-xs border border-slate-700/50">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-200">NextGen Class</p>
            <span className="text-[10px] text-orange-400 font-mono">v1.0</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {role === 'PROGRAMME_MANAGER'
              ? 'Programme Manager Hub'
              : role === 'FACILITATOR'
              ? 'Facilitator Console'
              : role === 'LEARNER'
              ? 'Cohort 2: Gen AI Track'
              : 'Applicant Track'}
          </p>
        </div>
      </div>
    </aside>
  );
};
