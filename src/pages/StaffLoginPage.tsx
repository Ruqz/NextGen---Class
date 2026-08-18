import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MASTER_STAFF_CREDENTIALS, MASTER_FACILITATOR_CREDENTIALS } from '../services/auth';

interface StaffLoginPageProps {
  onNavigate?: (path: string) => void;
}

export const StaffLoginPage: React.FC<StaffLoginPageProps> = ({ onNavigate }) => {
  const { login, getPostLoginPath } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your staff email address and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const profile = await login(email.trim(), password);
      const postLoginUrl = getPostLoginPath(profile);
      navigateTo(postLoginUrl || '/staff/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your staff credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: 'pm' | 'facilitator') => {
    if (role === 'pm') {
      setEmail(MASTER_STAFF_CREDENTIALS.email);
      setPassword(MASTER_STAFF_CREDENTIALS.password);
    } else {
      setEmail(MASTER_FACILITATOR_CREDENTIALS.email);
      setPassword(MASTER_FACILITATOR_CREDENTIALS.password);
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background ambient accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-indigo-900/20 via-blue-900/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-slate-900/40 blur-3xl" />
      </div>

      {/* Top Bar */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateTo('/')}
          id="btn-return-learner"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Learner Portal</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono tracking-wider uppercase text-slate-400">
            Secure Staff Gateway
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 mb-4 shadow-inner">
                <Shield className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Staff Authentication
              </h1>
              <p className="text-sm text-slate-400 mt-1.5">
                Authorized Programme Managers & Facilitators
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                id="staff-login-error"
                className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
                <div className="flex-1 text-xs leading-relaxed">{error}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleStaffLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Staff Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="input-staff-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@nextgenclass.org"
                    required
                    className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="input-staff-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-staff-authenticate"
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Authenticate Staff Access</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick credentials helper for test environments */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Authorized Role Quick-Fill</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-quick-fill-pm"
                  onClick={() => handleQuickFill('pm')}
                  className="px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-left text-xs transition-colors group cursor-pointer"
                >
                  <p className="font-medium text-slate-200 group-hover:text-indigo-300">Program Manager</p>
                  <p className="text-[10px] text-slate-400 truncate">{MASTER_STAFF_CREDENTIALS.email}</p>
                </button>
                <button
                  type="button"
                  id="btn-quick-fill-facilitator"
                  onClick={() => handleQuickFill('facilitator')}
                  className="px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-left text-xs transition-colors group cursor-pointer"
                >
                  <p className="font-medium text-slate-200 group-hover:text-indigo-300">Facilitator</p>
                  <p className="text-[10px] text-slate-400 truncate">{MASTER_FACILITATOR_CREDENTIALS.email}</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-400 border-t border-slate-900">
        <p>NextGen Class Enterprise Portal &copy; {new Date().getFullYear()} NextGen Learning</p>
      </footer>
    </div>
  );
};
