import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { lookupAdmissionByEmail, findLearnerByLearnerId } from '../services/learners';
import {
  Lock,
  ArrowRight,
  Shield,
  X,
  GraduationCap,
  Sparkles,
  Search,
  KeyRound,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onNavigate: (path: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onNavigate,
}) => {
  const {
    login,
    error,
    setError,
    loading,
    getPostLoginPath,
  } = useAuth();

  // Form Fields - strictly Learner ID & Password
  const [learnerId, setLearnerId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Learner ID Lookup & Status Check Modal
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    found: boolean;
    learnerId?: string;
    candidateName?: string;
    programmeName?: string;
    cohortName?: string;
    status?: string;
    isActivated?: boolean;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = learnerId.trim();
    if (!cleanId) {
      setError('Please enter your Learner ID.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      const profile = await login(cleanId, password);
      const targetPath = getPostLoginPath(profile);
      onNavigate(targetPath || '/learner/dashboard');
    } catch (err: any) {
      // Error handling is managed by AuthContext & verifyLearnerAccess
      console.warn('Authentication error:', err.message);
    }
  };

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupEmail.trim()) return;

    setLookupLoading(true);
    setLookupResult(null);

    try {
      const res = await lookupAdmissionByEmail(lookupEmail.trim());
      setLookupResult(res);
    } catch (err) {
      setLookupResult({ found: false });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCopyLearnerId = (idToCopy: string) => {
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleApplyLearnerId = (idToApply: string) => {
    setLearnerId(idToApply);
    setShowLookupModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-gradient-to-b from-indigo-900/25 via-blue-900/10 to-transparent blur-3xl opacity-80" />
        <div className="absolute bottom-0 right-0 w-[450px] h-[350px] bg-slate-900/50 blur-3xl" />
        <div className="absolute top-1/3 left-10 w-[300px] h-[300px] bg-indigo-950/30 blur-3xl" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Main Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-md relative">
            {/* Header / Brand */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 mb-5 shadow-inner">
                <GraduationCap className="w-7 h-7 text-indigo-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Welcome to NextGen Class
              </h1>
              <p className="mt-2 text-sm text-slate-400 font-normal">
                Your learning journey starts here.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div
                id="auth-error-alert"
                className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3 animate-in fade-in duration-200"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
                <div className="flex-1 text-xs leading-relaxed font-medium">
                  {error}
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="input-learner-id"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    Learner ID
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLookupModal(true);
                      setLookupResult(null);
                      setLookupEmail('');
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 font-medium"
                  >
                    <Search className="w-3 h-3" />
                    <span>Find My ID</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="input-learner-id"
                    type="text"
                    value={learnerId}
                    onChange={(e) => setLearnerId(e.target.value)}
                    placeholder="e.g. NGP-2026-00452"
                    required
                    className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-slate-500 font-mono transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="input-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="input-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-10 py-3.5 text-sm text-white placeholder-slate-500 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Enrollment...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Learner fill */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Demo Active Learner ID:</span>
              <button
                type="button"
                id="btn-quick-fill-learner"
                onClick={() => {
                  setLearnerId('NGP-2026-00452');
                  setPassword('NextGen2026!');
                  setError(null);
                }}
                className="text-xs font-mono text-indigo-400 hover:text-indigo-300 underline font-medium"
              >
                NGP-2026-00452
              </button>
            </div>

            {/* Not yet enrolled? Apply to a Program */}
            <div className="mt-6 pt-6 border-t border-slate-800 text-center">
              <p className="text-sm text-slate-400">
                Not yet enrolled?{' '}
                <button
                  type="button"
                  id="btn-apply-program"
                  onClick={() => onNavigate('/apply')}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors inline-flex items-center gap-1 hover:underline"
                >
                  <span>Apply to a Program</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Discreet Footer with Staff Access link */}
      <footer className="w-full py-6 px-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3 max-w-5xl mx-auto">
        <p>NextGen Class &copy; {new Date().getFullYear()} NextGen Learning Platform</p>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => {
              setShowLookupModal(true);
              setLookupResult(null);
            }}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            Learner ID Lookup
          </button>
          <span className="text-slate-600">|</span>
          <button
            type="button"
            id="link-staff-access"
            onClick={() => onNavigate('/staff/login')}
            className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 font-medium"
          >
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Staff Access</span>
          </button>
        </div>
      </footer>

      {/* FIND MY LEARNER ID MODAL */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowLookupModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Find Your Learner ID</h3>
                <p className="text-xs text-slate-400">Search by your registered application email</p>
              </div>
            </div>

            <form onSubmit={handleLookupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Application Email Address
                </label>
                <input
                  type="email"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  placeholder="e.g. amina.bello@learner.nextgenclass.org"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {lookupLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Check Admission & Learner ID</span>
                  </>
                )}
              </button>
            </form>

            {lookupResult && (
              <div className="mt-5 pt-5 border-t border-slate-800">
                {lookupResult.found && lookupResult.learnerId ? (
                  <div className="bg-slate-950 border border-indigo-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Candidate:</span>
                      <span className="text-xs font-semibold text-white">{lookupResult.candidateName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Program:</span>
                      <span className="text-xs text-slate-300 text-right">{lookupResult.programmeName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Status:</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          lookupResult.isActivated
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {lookupResult.status}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Assigned Learner ID</p>
                        <p className="text-base font-mono font-bold text-indigo-400">{lookupResult.learnerId}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyLearnerId(lookupResult.learnerId!)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
                          title="Copy Learner ID"
                        >
                          {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyLearnerId(lookupResult.learnerId!)}
                          className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                        >
                          Use to Login
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                    <p className="text-sm text-slate-300 font-medium">No Enrolled Learner Found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No active Learner ID is registered under <span className="text-slate-200">{lookupEmail}</span>. If you recently applied, your application may still be in review.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
