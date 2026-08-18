import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Layers,
  LayoutDashboard,
  FileText,
  ClipboardList,
  BookOpen,
  CheckCircle2,
  Award,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface ApplicantLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  title?: string;
  subtitle?: string;
}

export const ApplicantLayout: React.FC<ApplicantLayoutProps> = ({
  children,
  currentPath,
  onNavigate,
  title,
  subtitle,
}) => {
  const { userProfile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'DASHBOARD', path: '/applicant/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'APPLY TO A PROGRAM', path: '/applicant/application', icon: <FileText className="w-4 h-4" /> },
    { label: 'ASSESSMENT', path: '/applicant/assessment', icon: <ClipboardList className="w-4 h-4" />, badge: 'Required' },
    { label: 'ASSESSMENT RESOURCES', path: '/applicant/assessment-resources', icon: <BookOpen className="w-4 h-4" /> },
    { label: 'ASSESSMENT RESULT', path: '/applicant/assessment-result', icon: <CheckCircle2 className="w-4 h-4" /> },
    { label: 'ADMISSION STATUS', path: '/applicant/admission-status', icon: <Award className="w-4 h-4" /> },
    { label: 'PROFILE', path: '/applicant/profile', icon: <User className="w-4 h-4" /> },
  ];

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans text-slate-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNav('/applicant/dashboard')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <Layers className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-slate-900 tracking-tight leading-none">
                    NextGen <span className="text-orange-600">Class</span>
                  </span>
                  <Badge variant="warning" className="text-[9px] uppercase font-black px-1.5 py-0.5">
                    APPLICANT PORTAL
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  Admissions & Programme Application
                </p>
              </div>
            </div>

            {/* User Controls */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                  {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-semibold text-slate-900 leading-tight">
                    {userProfile?.displayName || 'Applicant'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate max-w-[130px]">
                    {userProfile?.email}
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
          <div className="p-4 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">
              APPLICANT NAVIGATION
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = currentPath === item.path || (item.path !== '/applicant/dashboard' && currentPath.startsWith(item.path));
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
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
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        isActive ? 'bg-orange-700 text-white' : 'bg-slate-800 text-orange-400 border border-orange-500/30'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900/90 text-xs text-slate-400">
            <p className="font-semibold text-slate-200">Applicant Lifecycle</p>
            <p className="text-[11px] mt-1 text-slate-500">
              Application → Review → Assessment → Decision
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative flex-1 max-w-xs w-full bg-slate-900 text-slate-300 z-10 flex flex-col h-full shadow-2xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold uppercase text-orange-400">Applicant Portal</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1 flex-1 overflow-y-auto">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-xl transition-all ${
                      currentPath === item.path ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  </button>
                ))}
              </nav>
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
                <Badge variant="warning" className="text-[10px]">APPLICANT</Badge>
                <span className="text-xs text-slate-500 font-medium">Admissions Track</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {title || 'Applicant Workspace'}
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
