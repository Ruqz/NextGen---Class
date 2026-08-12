import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Shield, Sparkles } from 'lucide-react';

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

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans text-slate-900 antialiased">
      <Header currentPath={currentPath} onNavigate={onNavigate} />
      <div className="flex flex-1">
        <Sidebar currentPath={currentPath} onNavigate={onNavigate} />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="role" roleName={activeRole} />
                <span className="text-xs text-slate-500 font-medium">Portal Area</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {title || `${activeRole} Portal`}
              </h1>
              {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
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

          {/* Children View */}
          {children}
        </main>
      </div>
    </div>
  );
};
