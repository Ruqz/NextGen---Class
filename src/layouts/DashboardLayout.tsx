import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Menu, X } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  title?: string;
  subtitle?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  currentPath,
  onNavigate,
  title,
  subtitle,
}) => {
  const { activeRole, userProfile } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleNavigate = (path: string) => {
    setMobileNavOpen(false);
    onNavigate(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans text-slate-900 antialiased">
      <Header currentPath={currentPath} onNavigate={onNavigate} />
      
      <div className="flex flex-1 relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar currentPath={currentPath} onNavigate={onNavigate} />
        </div>

        {/* Mobile Sidebar Overlay Drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="relative flex-1 max-w-xs w-full bg-slate-900 text-slate-300 z-10 flex flex-col h-full shadow-2xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                  {activeRole} Workspace
                </span>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full min-w-0">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
            <div className="flex items-start gap-3">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="md:hidden mt-0.5 p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                title="Toggle Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="role" roleName={activeRole} />
                  <span className="text-xs text-slate-500 font-medium">Portal Area</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {title || `${activeRole} Portal`}
                </h1>
                {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1">{subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-3 sm:px-4 py-2 rounded-xl border border-slate-200 shadow-2xs w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-2.5">
                <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs sm:text-sm">
                  {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 leading-tight">
                    {userProfile?.displayName || 'Active Account'}
                  </p>
                  <p className="text-[11px] text-slate-500">{activeRole} Role Active</p>
                </div>
              </div>
            </div>
          </div>

          {/* Children View */}
          {children}
        </main>
      </div>
    </div>
  );
};
