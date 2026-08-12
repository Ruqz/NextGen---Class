import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { UserRole } from '../types';
import {
  Layers,
  LogOut,
  User,
  Shield,
  Menu,
  X,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath = '/', onNavigate }) => {
  const { currentUser, userProfile, activeRole, logout, demoLoginAs, switchRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const handleNav = (path: string) => {
    if (onNavigate) onNavigate(path);
    setMobileMenuOpen(false);
  };

  const allRoles: UserRole[] = [
    'Applicant',
    'Learner',
    'Facilitator',
    'Programme Manager',
    'M&E Manager',
    'Super Admin',
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
      {/* Top Banner for Demo Role Switcher */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-semibold text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded text-[11px] border border-orange-800/50">
            <Sparkles className="w-3 h-3" /> DEMO MODE
          </span>
          <span className="hidden sm:inline">Simulate platform access with any user role:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-slate-400 text-[11px] font-medium mr-1">Switch Role:</span>
          {allRoles.map((r) => (
            <button
              key={r}
              onClick={() => {
                demoLoginAs(r);
                setRoleDropdownOpen(false);
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeRole === r
                  ? 'bg-orange-600 text-white font-semibold shadow-2xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNav('/')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Layers className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight leading-none">
                  NextGen <span className="text-orange-600">PRO</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Programme Management Platform
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => handleNav('/')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                currentPath === '/' ? 'text-orange-600 bg-orange-50' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Public Catalog
            </button>
            <button
              onClick={() => handleNav('/programmes/generative-ai-cohort-2')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                currentPath.includes('/programmes/') ? 'text-orange-600 bg-orange-50' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Gen AI Cohort 2
            </button>
            <button
              onClick={() => handleNav('/portal')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                currentPath.startsWith('/portal') ? 'text-orange-600 bg-orange-50' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Portal ({activeRole})
            </button>
          </nav>

          {/* User Controls & Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Badge variant="role" roleName={activeRole} className="shadow-2xs" />

            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-medium text-xs">
                    {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-semibold text-slate-900 leading-tight">
                      {userProfile?.displayName || 'Active User'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate max-w-[120px]">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  aria-label="Sign Out"
                  leftIcon={<LogOut className="w-4 h-4 text-slate-500" />}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNav('/auth?mode=login')}
                >
                  Sign In
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleNav('/auth?mode=register')}
                >
                  Apply Now
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <Badge variant="role" roleName={activeRole} size="sm" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white p-4 space-y-3 animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col space-y-1">
            <button
              onClick={() => handleNav('/')}
              className="text-left px-3 py-2 text-sm font-medium text-slate-800 rounded-lg hover:bg-slate-100"
            >
              Public Catalog
            </button>
            <button
              onClick={() => handleNav('/programmes/generative-ai-cohort-2')}
              className="text-left px-3 py-2 text-sm font-medium text-slate-800 rounded-lg hover:bg-slate-100"
            >
              Gen AI Cohort 2
            </button>
            <button
              onClick={() => handleNav('/portal')}
              className="text-left px-3 py-2 text-sm font-medium text-slate-800 rounded-lg hover:bg-slate-100"
            >
              Role Portal ({activeRole})
            </button>
          </nav>
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {currentUser ? (
              <Button variant="outline" size="sm" onClick={logout} className="w-full justify-center">
                Logout
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => handleNav('/auth?mode=login')}>
                  Sign In
                </Button>
                <Button variant="primary" size="sm" onClick={() => handleNav('/auth?mode=register')}>
                  Apply Now
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
