import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Layers,
  LayoutDashboard,
  Calendar,
  BookOpen,
  ClipboardList,
  UserCheck,
  BarChart3,
  HelpCircle,
  Award,
  Users,
  LogOut,
  Menu,
  X,
  FileText,
  FileCheck,
  SlidersHorizontal,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  BellRing,
  FolderOpen,
  UserPlus,
} from 'lucide-react';

interface StaffLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  title?: string;
  subtitle?: string;
}

export interface StaffNavSection {
  title?: string;
  items: {
    label: string;
    path: string;
    icon: React.ReactNode;
    badge?: string;
  }[];
}

export const StaffLayout: React.FC<StaffLayoutProps> = ({
  children,
  currentPath,
  onNavigate,
  title,
  subtitle,
}) => {
  const { userProfile, activeRole, staffRole, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Normalize staff role: PROGRAMME_MANAGER vs FACILITATOR
  const isFacilitator =
    staffRole === 'FACILITATOR' ||
    (activeRole && activeRole.toLowerCase().includes('facilitator')) ||
    (userProfile?.role && userProfile.role.toLowerCase().includes('facilitator'));

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  const getMenuSections = (): StaffNavSection[] => {
    if (isFacilitator) {
      return [
        {
          title: 'FACILITATOR HUB',
          items: [
            { label: 'Dashboard', path: '/staff/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { label: 'My Classes', path: '/staff/classes', icon: <Calendar className="w-4 h-4" /> },
            { label: 'Attendance', path: '/staff/attendance', icon: <UserCheck className="w-4 h-4" /> },
            { label: 'Learners', path: '/staff/learners', icon: <Users className="w-4 h-4" /> },
            { label: 'Assignments & Capstone', path: '/staff/assignments', icon: <CheckCircle2 className="w-4 h-4" /> },
            { label: 'Progress', path: '/staff/progress', icon: <GraduationCap className="w-4 h-4" /> },
            { label: 'Resources', path: '/staff/resources', icon: <BookOpen className="w-4 h-4" /> },
            { label: 'Feedback', path: '/staff/feedback', icon: <HelpCircle className="w-4 h-4" /> },
          ],
        },
      ];
    }

    // PROGRAMME MANAGER (Full operational access)
    return [
      {
        title: 'OVERVIEW & TRACKS',
        items: [
          { label: 'Dashboard', path: '/staff/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Programmes', path: '/staff/programmes', icon: <Layers className="w-4 h-4" /> },
          { label: 'Cohorts', path: '/staff/cohorts', icon: <Calendar className="w-4 h-4" /> },
        ],
      },
      {
        title: 'ADMISSIONS & INTAKE',
        items: [
          { label: 'Applications', path: '/staff/applications', icon: <FileText className="w-4 h-4" /> },
          { label: 'Form Builder', path: '/staff/forms', icon: <SlidersHorizontal className="w-4 h-4" />, badge: 'Builder' },
          { label: 'Applicant Assessments', path: '/staff/assessments', icon: <ClipboardList className="w-4 h-4" /> },
          { label: 'Assessment Resources', path: '/staff/assessment-resources', icon: <BookOpen className="w-4 h-4" /> },
          { label: 'Admissions', path: '/staff/admissions', icon: <FileCheck className="w-4 h-4" /> },
        ],
      },
      {
        title: 'ACADEMIC & LEARNING',
        items: [
          { label: 'Curriculum', path: '/staff/curriculum', icon: <BookOpen className="w-4 h-4" /> },
          { label: 'Learners', path: '/staff/learners', icon: <Users className="w-4 h-4" /> },
          { label: 'Classes', path: '/staff/classes', icon: <Calendar className="w-4 h-4" /> },
          { label: 'Attendance', path: '/staff/attendance', icon: <UserCheck className="w-4 h-4" /> },
          { label: 'Assignments & Capstone', path: '/staff/assignments', icon: <CheckCircle2 className="w-4 h-4" /> },
          { label: 'Progress', path: '/staff/progress', icon: <GraduationCap className="w-4 h-4" /> },
          { label: 'At-Risk', path: '/staff/at-risk', icon: <AlertCircle className="w-4 h-4" /> },
        ],
      },
      {
        title: 'EVALUATION & OPERATIONS',
        items: [
          { label: 'Feedback', path: '/staff/feedback', icon: <HelpCircle className="w-4 h-4" /> },
          { label: 'Certificates', path: '/staff/certificates', icon: <Award className="w-4 h-4" /> },
          { label: 'Resources', path: '/staff/resources', icon: <FolderOpen className="w-4 h-4" /> },
          { label: 'Reports', path: '/staff/reports', icon: <BarChart3 className="w-4 h-4" /> },
          { label: 'M&E', path: '/staff/me', icon: <ShieldCheck className="w-4 h-4" /> },
          { label: 'AI Center', path: '/staff/ai', icon: <Sparkles className="w-4 h-4" />, badge: 'AI' },
          { label: 'Notifications', path: '/staff/notifications', icon: <BellRing className="w-4 h-4" /> },
          { label: 'Staff Management', path: '/staff/staff-management', icon: <UserPlus className="w-4 h-4" /> },
        ],
      },
    ];
  };

  const sections = getMenuSections();

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans text-slate-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNav('/staff/dashboard')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Layers className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-slate-900 tracking-tight leading-none">
                    NextGen <span className="text-blue-600">Class</span>
                  </span>
                  <Badge variant="info" className="text-[9px] uppercase font-black px-1.5 py-0.5">
                    STAFF PORTAL
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  {isFacilitator ? 'Delivery & Instruction Console' : 'Programme Operations & M&E Management'}
                </p>
              </div>
            </div>

            {/* User Controls */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'S'}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-semibold text-slate-900 leading-tight">
                    {userProfile?.displayName || 'Staff Member'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate max-w-[130px]">
                    {isFacilitator ? 'Facilitator' : 'Programme Manager'}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                aria-label="Sign Out"
                leftIcon={<LogOut className="w-4 h-4 text-slate-500" />}
                className="hidden sm:inline-flex"
              >
                Logout
              </Button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex-col justify-between shrink-0 border-r border-slate-800">
          <div className="p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-8rem)] custom-scrollbar">
            {sections.map((sec, sIdx) => (
              <div key={sec.title || sIdx} className="space-y-1">
                {sec.title && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
                    {sec.title}
                  </p>
                )}
                <nav className="space-y-0.5">
                  {sec.items.map((item) => {
                    const isActive =
                      currentPath === item.path ||
                      (item.path !== '/staff/dashboard' && currentPath.startsWith(item.path));

                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNav(item.path)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
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
                              isActive
                                ? 'bg-blue-700 text-white'
                                : 'bg-slate-800 text-blue-400 border border-blue-500/30'
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

          <div className="p-4 border-t border-slate-800 bg-slate-900/90 text-xs text-slate-400">
            <p className="font-semibold text-slate-200">
              {isFacilitator ? 'Facilitator Console' : 'Programme Manager Hub'}
            </p>
            <p className="text-[11px] mt-0.5 text-slate-500">
              {isFacilitator ? 'Delivery & Classroom Access' : 'Unified Admin, Admissions & M&E'}
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative flex-1 max-w-xs w-full bg-slate-900 text-slate-300 z-10 flex flex-col h-full shadow-2xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold uppercase text-blue-400">Staff Portal</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4 flex-1 overflow-y-auto">
                {sections.map((sec, sIdx) => (
                  <div key={sec.title || sIdx} className="space-y-1">
                    {sec.title && (
                      <p className="text-[10px] font-bold uppercase text-slate-400 px-2">{sec.title}</p>
                    )}
                    <nav className="space-y-0.5">
                      {sec.items.map((item) => (
                        <button
                          key={item.path}
                          onClick={() => handleNav(item.path)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all ${
                            currentPath === item.path ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {item.icon}
                            <span>{item.label}</span>
                          </div>
                        </button>
                      ))}
                    </nav>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={logout} className="w-full justify-center">
                Logout
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="info" className="text-[10px]">
                  {isFacilitator ? 'FACILITATOR' : 'PROGRAMME MANAGER'}
                </Badge>
                <span className="text-xs text-slate-500 font-medium">Staff Operations</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {title || (isFacilitator ? 'Facilitator Workspace' : 'Programme Operations')}
              </h1>
              {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1">{subtitle}</p>}
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
};
