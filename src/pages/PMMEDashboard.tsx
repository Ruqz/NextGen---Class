import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Download,
  Filter,
  RefreshCw,
  Settings2,
  Users,
  GraduationCap,
  Award,
  BookOpen,
  FileCheck,
  Star,
  Layers,
  Search,
  Sliders,
  ChevronRight,
  Info,
  Calendar,
  Sparkles,
  HelpCircle,
  Printer,
  FileSpreadsheet,
  FileJson,
  Check,
  Plus,
  Trash2,
  Edit3,
} from 'lucide-react';
import {
  MEIndicatorConfig,
  MEIndicatorCalculatedResult,
  MELearnerEvaluationRow,
  MECohortComparisonItem,
  MEDashboardMetrics,
  MEIndicatorCategory,
  MEIndicatorStatus,
  Programme,
  Cohort,
} from '../types';
import {
  subscribeToMEIndicators,
  fetchAndComputeMEDashboardMetrics,
  saveMEIndicator,
  deleteMEIndicator,
  resetDefaultMEIndicators,
  exportMESummaryCSV,
  exportLearnerLedgerCSV,
  exportMEEvaluationJSON,
  DEFAULT_ME_INDICATORS,
} from '../services/monitoringEvaluation';
import { subscribeToProgrammes, subscribeToCohorts } from '../services/programmes';

interface PMMEDashboardProps {
  initialTab?: 'scorecard' | 'studio' | 'ledger' | 'cohorts' | 'report';
  currentPath?: string;
}

export const PMMEDashboard: React.FC<PMMEDashboardProps> = ({ initialTab = 'scorecard', currentPath }) => {
  // State
  const [activeTab, setActiveTab] = useState<'scorecard' | 'studio' | 'ledger' | 'cohorts' | 'report'>(() => {
    if (currentPath) {
      if (currentPath.includes('/indicators')) return 'studio';
      if (currentPath.includes('/ledger')) return 'ledger';
      if (currentPath.includes('/outcomes')) return 'cohorts';
      if (currentPath.includes('/reports')) return 'report';
    }
    return initialTab;
  });

  useEffect(() => {
    if (currentPath) {
      if (currentPath.includes('/indicators')) setActiveTab('studio');
      else if (currentPath.includes('/ledger')) setActiveTab('ledger');
      else if (currentPath.includes('/outcomes')) setActiveTab('cohorts');
      else if (currentPath.includes('/reports')) setActiveTab('report');
      else if (currentPath === '/portal/pm/me' || currentPath === '/portal/me') setActiveTab('scorecard');
    }
  }, [currentPath]);
  const [indicatorConfigs, setIndicatorConfigs] = useState<MEIndicatorConfig[]>(DEFAULT_ME_INDICATORS);
  const [metrics, setMetrics] = useState<MEDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>('ALL');
  const [selectedCohortId, setSelectedCohortId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Editors
  const [drilldownIndicator, setDrilldownIndicator] = useState<MEIndicatorCalculatedResult | null>(null);
  const [editingIndicator, setEditingIndicator] = useState<MEIndicatorConfig | null>(null);
  const [showNewIndicatorModal, setShowNewIndicatorModal] = useState<boolean>(false);
  const [newIndicator, setNewIndicator] = useState<Partial<MEIndicatorConfig>>({
    code: '',
    name: '',
    category: 'ACADEMIC',
    description: '',
    targetBenchmark: 80,
    warningThreshold: 65,
    criticalThreshold: 45,
    unit: '%',
    weight: 10,
    higherIsBetter: true,
    isActive: true,
    formulaExplanation: '',
  });

  // Action status message
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // 1. Subscribe to programmes & cohorts for filter controls
  useEffect(() => {
    const unsubProg = subscribeToProgrammes((progs) => setProgrammes(progs));
    const unsubCohorts = subscribeToCohorts((allCohorts) => setCohorts(allCohorts));
    return () => {
      unsubProg();
      unsubCohorts();
    };
  }, []);

  // Filter available cohorts based on selected programme
  const availableCohorts = useMemo(() => {
    if (selectedProgrammeId === 'ALL') return cohorts;
    return cohorts.filter((c) => c.programmeId === selectedProgrammeId);
  }, [cohorts, selectedProgrammeId]);

  // 2. Subscribe to configurable indicator settings
  useEffect(() => {
    const unsub = subscribeToMEIndicators((configs) => {
      setIndicatorConfigs(configs);
    });
    return () => unsub();
  }, []);

  // 3. Compute real-time M&E Metrics whenever filters or configs update
  const loadMetrics = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetchAndComputeMEDashboardMetrics(
        selectedProgrammeId,
        selectedCohortId,
        indicatorConfigs
      );
      setMetrics(res);
    } catch (err) {
      console.error('Failed to load M&E metrics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [selectedProgrammeId, selectedCohortId, indicatorConfigs]);

  // Selected Scope Names
  const currentProgrammeName = useMemo(() => {
    if (selectedProgrammeId === 'ALL') return 'All Programmes';
    const found = programmes.find((p) => p.id === selectedProgrammeId);
    return found ? found.name : selectedProgrammeId;
  }, [programmes, selectedProgrammeId]);

  const currentCohortName = useMemo(() => {
    if (selectedCohortId === 'ALL') return 'All Cohorts';
    const found = cohorts.find((c) => c.id === selectedCohortId);
    return found ? found.name : selectedCohortId;
  }, [cohorts, selectedCohortId]);

  // Filtered Indicators for Scorecard
  const displayedIndicators = useMemo(() => {
    if (!metrics) return [];
    let list = metrics.indicators;
    if (selectedCategory !== 'ALL') {
      list = list.filter((ind) => ind.config.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (ind) =>
          ind.config.name.toLowerCase().includes(q) ||
          ind.config.code.toLowerCase().includes(q) ||
          ind.config.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [metrics, selectedCategory, searchQuery]);

  // Filtered Learner Rows for Matrix
  const [learnerTierFilter, setLearnerTierFilter] = useState<string>('ALL');
  const [learnerSearch, setLearnerSearch] = useState<string>('');

  const displayedLearnerRows = useMemo(() => {
    if (!metrics) return [];
    let list = metrics.learnerRows;
    if (learnerTierFilter !== 'ALL') {
      list = list.filter((r) => r.performanceTier === learnerTierFilter);
    }
    if (learnerSearch.trim()) {
      const q = learnerSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.learnerName.toLowerCase().includes(q) ||
          r.learnerEmail.toLowerCase().includes(q) ||
          r.learnerId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [metrics, learnerTierFilter, learnerSearch]);

  // Status Badge Helper
  const getStatusBadge = (status: MEIndicatorStatus) => {
    switch (status) {
      case 'EXCEEDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Exceeding Target
          </span>
        );
      case 'ON_TRACK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Check className="w-3.5 h-3.5" /> On Target
          </span>
        );
      case 'AT_RISK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Warning / At Risk
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Critical Action Required
          </span>
        );
    }
  };

  const getCategoryBadge = (category: MEIndicatorCategory) => {
    const map: Record<MEIndicatorCategory, { label: string; bg: string; text: string }> = {
      ENGAGEMENT: { label: 'Engagement', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700' },
      ACADEMIC: { label: 'Academic', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
      OUTCOMES: { label: 'Outcomes', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
      FEEDBACK: { label: 'Feedback', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
      PROJECTS: { label: 'Projects', bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
    };
    const c = map[category] || { label: category, bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  // Indicator Icon Selector
  const getIndicatorIcon = (code: string) => {
    switch (code) {
      case 'participation':
        return <Activity className="w-5 h-5 text-indigo-600" />;
      case 'attendance':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'progression':
        return <TrendingUp className="w-5 h-5 text-purple-600" />;
      case 'assignment_completion':
        return <FileCheck className="w-5 h-5 text-emerald-600" />;
      case 'assessment_performance':
        return <Award className="w-5 h-5 text-cyan-600" />;
      case 'completion':
        return <CheckCircle2 className="w-5 h-5 text-teal-600" />;
      case 'graduation':
        return <GraduationCap className="w-5 h-5 text-emerald-700" />;
      case 'certification':
        return <Award className="w-5 h-5 text-amber-600" />;
      case 'learner_satisfaction':
        return <Star className="w-5 h-5 text-amber-500" />;
      case 'instructor_rating':
        return <Star className="w-5 h-5 text-orange-500" />;
      case 'projects_completed':
        return <BookOpen className="w-5 h-5 text-sky-600" />;
      default:
        return <BarChart3 className="w-5 h-5 text-gray-600" />;
    }
  };

  // Handlers for Indicator Studio
  const handleSaveEditedIndicator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIndicator) return;
    try {
      await saveMEIndicator(editingIndicator);
      setEditingIndicator(null);
      showToast('Indicator benchmark updated successfully!');
      loadMetrics();
    } catch (err) {
      showToast('Failed to update indicator.', 'error');
    }
  };

  const handleCreateCustomIndicator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIndicator.name || !newIndicator.code) {
      showToast('Please provide an indicator name and unique code.', 'error');
      return;
    }
    try {
      await saveMEIndicator({
        ...(newIndicator as any),
        code: newIndicator.code.toLowerCase().replace(/\s+/g, '_'),
      });
      setShowNewIndicatorModal(false);
      setNewIndicator({
        code: '',
        name: '',
        category: 'ACADEMIC',
        description: '',
        targetBenchmark: 80,
        warningThreshold: 65,
        criticalThreshold: 45,
        unit: '%',
        weight: 10,
        higherIsBetter: true,
        isActive: true,
        formulaExplanation: '',
      });
      showToast('New M&E Indicator created successfully!');
      loadMetrics();
    } catch (err) {
      showToast('Failed to create indicator.', 'error');
    }
  };

  const handleDeleteIndicator = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom indicator?')) return;
    try {
      await deleteMEIndicator(id);
      showToast('Indicator deleted.');
      loadMetrics();
    } catch (err) {
      showToast('Failed to delete indicator.', 'error');
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset all indicators back to default institutional benchmarks?')) return;
    try {
      await resetDefaultMEIndicators();
      showToast('M&E Indicators reset to standard benchmarks.');
      loadMetrics();
    } catch (err) {
      showToast('Failed to reset benchmarks.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 text-slate-800">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 border transition-all text-sm font-medium ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    Monitoring & Evaluation (M&E)
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                      Module 21
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500">
                    Real-time institutional performance metrics, configurable benchmarks & cohort evaluation
                  </p>
                </div>
              </div>
            </div>

            {/* Actions & Export */}
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => loadMetrics(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer disabled:opacity-50"
                title="Re-calculate metrics from Firestore"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Computing...' : 'Recalculate'}
              </button>

              {/* Data Export Dropdown */}
              <div className="relative group">
                <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer">
                  <Download className="w-3.5 h-3.5" />
                  Export Data
                </button>
                <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-40 hidden group-hover:block transition-all">
                  <button
                    onClick={() => metrics && exportMESummaryCSV(metrics, currentProgrammeName, currentCohortName)}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Export Indicators Summary (CSV)
                  </button>
                  <button
                    onClick={() =>
                      metrics && exportLearnerLedgerCSV(metrics.learnerRows, currentProgrammeName, currentCohortName)
                    }
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    Export Learner Ledger (CSV)
                  </button>
                  <button
                    onClick={() => metrics && exportMEEvaluationJSON(metrics, currentProgrammeName, currentCohortName)}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"
                  >
                    <FileJson className="w-4 h-4 text-amber-600" />
                    Export Complete Bundle (JSON)
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={() => {
                      setActiveTab('report');
                      setTimeout(() => window.print(), 500);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4 text-purple-600" />
                    Print Official Audit Report
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Scope Filters: Programme & Cohort Selection */}
          <div className="pt-2 pb-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Scope Filter:
              </div>

              {/* Programme Dropdown */}
              <div className="flex items-center gap-1">
                <label className="text-slate-500 font-medium">Programme:</label>
                <select
                  value={selectedProgrammeId}
                  onChange={(e) => {
                    setSelectedProgrammeId(e.target.value);
                    setSelectedCohortId('ALL');
                  }}
                  className="bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                >
                  <option value="ALL">All Programmes</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cohort Dropdown */}
              <div className="flex items-center gap-1">
                <label className="text-slate-500 font-medium">Cohort:</label>
                <select
                  value={selectedCohortId}
                  onChange={(e) => setSelectedCohortId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                >
                  <option value="ALL">All Cohorts</option>
                  {availableCohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scope Summary Badge */}
            <div className="flex items-center gap-2 text-slate-500">
              <span>Evaluating:</span>
              <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {currentProgrammeName} &bull; {currentCohortName}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-1">
            <button
              onClick={() => setActiveTab('scorecard')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'scorecard'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              11 Core Indicators Scorecard
            </button>

            <button
              onClick={() => setActiveTab('studio')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'studio'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Sliders className="w-4 h-4" />
              Configurable Indicators Studio
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'ledger'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Users className="w-4 h-4" />
              Learner Evaluation Ledger
            </button>

            <button
              onClick={() => setActiveTab('cohorts')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'cohorts'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              Cohort Comparison Matrix
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'report'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Printer className="w-4 h-4" />
              Audit Report & Executive View
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Executive KPI Overview Cards */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Health Score Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Overall M&E Health Index
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    metrics.overallHealthScore >= 80
                      ? 'bg-emerald-100 text-emerald-800'
                      : metrics.overallHealthScore >= 65
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {metrics.overallHealthScore >= 80
                    ? 'Exemplary'
                    : metrics.overallHealthScore >= 65
                    ? 'On Target'
                    : 'Needs Focus'}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">{metrics.overallHealthScore}%</span>
                <span className="text-xs text-slate-500">composite score</span>
              </div>
              <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    metrics.overallHealthScore >= 80
                      ? 'bg-emerald-500'
                      : metrics.overallHealthScore >= 65
                      ? 'bg-blue-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, metrics.overallHealthScore))}%` }}
                ></div>
              </div>
            </div>

            {/* Total Cohorts & Learners Evaluated */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Evaluation Scope
                </span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">{metrics.totalLearnersEvaluated}</span>
                <span className="text-xs text-slate-500">enrolled learners</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">{metrics.totalCohortsEvaluated}</span> cohorts across{' '}
                <span className="font-semibold text-slate-700">{metrics.totalProgrammesEvaluated}</span> programme(s)
              </div>
            </div>

            {/* Outcomes: Completion & Graduation */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Outcome Deliverables
                </span>
                <GraduationCap className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-slate-900">
                <div>
                  <div className="text-2xl font-bold">
                    {metrics.indicators.find((i) => i.config.code === 'completion')?.displayValue || '0%'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Completion Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {metrics.indicators.find((i) => i.config.code === 'graduation')?.displayValue || '0%'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Graduation Rate</div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                Verified against milestone completions & capstone approvals
              </div>
            </div>

            {/* Learner Feedback & Facilitation */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Satisfaction & Pedagogy
                </span>
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-slate-900">
                <div>
                  <div className="text-2xl font-bold">
                    {metrics.indicators.find((i) => i.config.code === 'learner_satisfaction')?.actualValue ?? 85}%
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">CSAT Satisfaction</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {metrics.indicators.find((i) => i.config.code === 'instructor_rating')?.actualValue ?? 88}%
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Instructor Rating</div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">Derived from learner module evaluation surveys</div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 1: 11 CORE INDICATORS SCORECARD
            ========================================================================= */}
        {activeTab === 'scorecard' && (
          <div className="space-y-6">
            {/* Category Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'All Indicators' },
                  { id: 'ENGAGEMENT', label: 'Engagement' },
                  { id: 'ACADEMIC', label: 'Academic' },
                  { id: 'OUTCOMES', label: 'Outcomes' },
                  { id: 'FEEDBACK', label: 'Feedback' },
                  { id: 'PROJECTS', label: 'Projects' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search indicators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Indicator Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedIndicators.map((ind, indIdx) => {
                const variancePositive = ind.variance >= 0;
                return (
                  <div
                    key={`${ind.config.id}-${indIdx}`}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                            {getIndicatorIcon(ind.config.code)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">{ind.config.name}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {getCategoryBadge(ind.config.category)}
                              <span className="text-[11px] text-slate-400 font-medium">Weight: {ind.config.weight}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                        {ind.config.description}
                      </p>

                      {/* Value vs Benchmark */}
                      <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 mb-4">
                        <div className="flex items-baseline justify-between mb-1.5">
                          <div>
                            <span className="text-xs text-slate-500 font-medium">Actual Measured:</span>
                            <div className="text-2xl font-black text-slate-900">{ind.displayValue}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-500 font-medium">Target Benchmark:</span>
                            <div className="text-base font-bold text-slate-700">{ind.displayTarget}</div>
                          </div>
                        </div>

                        {/* Benchmark Bar with Target Pointer */}
                        <div className="mt-2">
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                ind.status === 'EXCEEDING'
                                  ? 'bg-emerald-500'
                                  : ind.status === 'ON_TRACK'
                                  ? 'bg-blue-500'
                                  : ind.status === 'AT_RISK'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, ind.actualValue))}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                            <span>0%</span>
                            <span>Target: {ind.config.targetBenchmark}%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      </div>

                      {/* Variance & Status */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 font-semibold">
                          <span className="text-slate-500 font-normal">Variance:</span>
                          <span
                            className={
                              variancePositive ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
                            }
                          >
                            {variancePositive ? `+${ind.variance}%` : `${ind.variance}%`}
                          </span>
                        </div>
                        <div>{getStatusBadge(ind.status)}</div>
                      </div>
                    </div>

                    {/* Footer & Inspect Details */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Evaluated on {ind.sampleSize} learner(s)
                      </span>
                      <button
                        onClick={() => setDrilldownIndicator(ind)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        Inspect Formula <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: CONFIGURABLE INDICATORS STUDIO
            ========================================================================= */}
        {activeTab === 'studio' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    Configurable M&E Indicators & Benchmark Targets
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customize target benchmarks, warning thresholds, calculation weights, and operational parameters.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetDefaults}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Reset to Defaults
                  </button>
                  <button
                    onClick={() => setShowNewIndicatorModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Custom Indicator
                  </button>
                </div>
              </div>

              {/* Indicators Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Indicator</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Target Benchmark</th>
                      <th className="py-3 px-3">Warning Level</th>
                      <th className="py-3 px-3">Critical Level</th>
                      <th className="py-3 px-3">Weight (%)</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {indicatorConfigs.map((cfg, cfgIdx) => (
                      <tr key={`${cfg.id}-${cfgIdx}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{cfg.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{cfg.code}</div>
                        </td>
                        <td className="py-3.5 px-3">{getCategoryBadge(cfg.category)}</td>
                        <td className="py-3.5 px-3 font-semibold text-emerald-700">
                          {cfg.targetBenchmark}
                          {cfg.unit}
                        </td>
                        <td className="py-3.5 px-3 font-medium text-amber-700">
                          {cfg.warningThreshold}
                          {cfg.unit}
                        </td>
                        <td className="py-3.5 px-3 font-medium text-rose-700">
                          {cfg.criticalThreshold}
                          {cfg.unit}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-700">{cfg.weight}%</td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              cfg.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {cfg.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingIndicator(cfg)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                              title="Edit Indicator Benchmarks"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {/* Allow deleting custom indicators */}
                            {!DEFAULT_ME_INDICATORS.some((d) => d.id === cfg.id) && (
                              <button
                                onClick={() => handleDeleteIndicator(cfg.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="Delete Custom Indicator"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: LEARNER EVALUATION MATRIX / LEDGER
            ========================================================================= */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Learner-by-Learner M&E Evaluation Ledger
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Multi-dimensional tracking across all 11 performance and engagement pillars
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      metrics && exportLearnerLedgerCSV(displayedLearnerRows, currentProgrammeName, currentCohortName)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Filtered Table (CSV)
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <label className="text-slate-500 font-medium">Performance Tier:</label>
                  <select
                    value={learnerTierFilter}
                    onChange={(e) => setLearnerTierFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                  >
                    <option value="ALL">All Tiers ({metrics?.learnerRows.length || 0})</option>
                    <option value="EXEMPLARY">Exemplary (&ge;85%)</option>
                    <option value="ON_TRACK">On Track (70-84%)</option>
                    <option value="NEEDS_SUPPORT">Needs Support (50-69%)</option>
                    <option value="CRITICAL">Critical Action (&lt;50%)</option>
                  </select>
                </div>

                <div className="relative min-w-[260px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by learner name, email, ID..."
                    value={learnerSearch}
                    onChange={(e) => setLearnerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-3">Learner</th>
                      <th className="py-3 px-3">Programme / Cohort</th>
                      <th className="py-3 px-3">Overall Index</th>
                      <th className="py-3 px-2 text-center">Partic.</th>
                      <th className="py-3 px-2 text-center">Attend.</th>
                      <th className="py-3 px-2 text-center">Progress</th>
                      <th className="py-3 px-2 text-center">Assign.</th>
                      <th className="py-3 px-2 text-center">Assess.</th>
                      <th className="py-3 px-2 text-center">Capstone</th>
                      <th className="py-3 px-2 text-center">Completed</th>
                      <th className="py-3 px-2 text-center">Graduated</th>
                      <th className="py-3 px-2 text-center">Certified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedLearnerRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-slate-400">
                          No learner evaluation records found for this scope.
                        </td>
                      </tr>
                    ) : (
                      displayedLearnerRows.map((row, rIdx) => (
                        <tr key={`${row.learnerId}-${row.enrolmentId || rIdx}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{row.learnerName}</div>
                            <div className="text-[11px] text-slate-400">{row.learnerEmail}</div>
                            <div className="text-[10px] font-mono text-indigo-600">{row.learnerId}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-slate-800 font-medium line-clamp-1">{row.programmeName}</div>
                            <div className="text-[11px] text-slate-400">{row.cohortName}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-900 text-sm">{row.overallMEIndex}%</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  row.performanceTier === 'EXEMPLARY'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : row.performanceTier === 'ON_TRACK'
                                    ? 'bg-blue-100 text-blue-800'
                                    : row.performanceTier === 'NEEDS_SUPPORT'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {row.performanceTier}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center font-medium">{row.participationRate}%</td>
                          <td className="py-3 px-2 text-center font-medium">{row.attendanceRate}%</td>
                          <td className="py-3 px-2 text-center font-semibold text-slate-800">{row.progressionScore}%</td>
                          <td className="py-3 px-2 text-center font-medium">{row.assignmentCompletionRate}%</td>
                          <td className="py-3 px-2 text-center font-medium">{row.assessmentAverageScore}%</td>
                          <td className="py-3 px-2 text-center">
                            {row.projectCompleted ? (
                              <span className="inline-flex items-center text-emerald-600 font-bold">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="text-slate-300">&mdash;</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {row.isCompleted ? (
                              <span className="text-emerald-600 font-bold">Yes</span>
                            ) : (
                              <span className="text-slate-400">No</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {row.isGraduated ? (
                              <span className="text-emerald-600 font-bold">Yes</span>
                            ) : (
                              <span className="text-slate-400">No</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {row.hasCertificate ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Issued
                              </span>
                            ) : (
                              <span className="text-slate-300">&mdash;</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: COHORT COMPARISON MATRIX
            ========================================================================= */}
        {activeTab === 'cohorts' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Cohort Comparative Performance Matrix
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Benchmark cross-cohort health scores, attendance, assignments, and graduation velocities
                  </p>
                </div>
              </div>

              {/* Cohorts Grid */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                {(metrics?.cohortsComparison || []).map((coh, cohIdx) => (
                  <div
                    key={`${coh.cohortId}-${cohIdx}`}
                    className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{coh.cohortName}</h3>
                          <div className="text-xs text-slate-500">{coh.programmeName}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-500">Cohort Health</span>
                          <div className="text-xl font-black text-indigo-600">{coh.healthScore}%</div>
                        </div>
                      </div>

                      {/* Cohort Key Indicator Grid */}
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                          <div className="text-slate-400 text-[10px] uppercase font-semibold">Attendance</div>
                          <div className="text-base font-bold text-slate-800">
                            {coh.indicators.attendance?.actual ?? 85}%
                          </div>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                          <div className="text-slate-400 text-[10px] uppercase font-semibold">Progress</div>
                          <div className="text-base font-bold text-slate-800">
                            {coh.indicators.progression?.actual ?? 80}%
                          </div>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                          <div className="text-slate-400 text-[10px] uppercase font-semibold">Assignments</div>
                          <div className="text-base font-bold text-slate-800">
                            {coh.indicators.assignment_completion?.actual ?? 85}%
                          </div>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                          <div className="text-slate-400 text-[10px] uppercase font-semibold">Assessments</div>
                          <div className="text-base font-bold text-slate-800">
                            {coh.indicators.assessment_performance?.actual ?? 75}%
                          </div>
                        </div>
                      </div>

                      {/* Enrollment & Outcomes Stats */}
                      <div className="mt-4 bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-400">Total Enrolled:</span>{' '}
                          <span className="font-bold text-slate-800">{coh.totalEnrolled}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Graduated:</span>{' '}
                          <span className="font-bold text-emerald-700">{coh.graduationCount}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Certificates:</span>{' '}
                          <span className="font-bold text-amber-700">{coh.certifiedCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: FORMAL PRINTABLE AUDIT REPORT
            ========================================================================= */}
        {activeTab === 'report' && metrics && (
          <div className="space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none">
            {/* Print Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                  NextGen Class Institutional Platform
                </div>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  Monitoring & Evaluation (M&E) Comprehensive Audit Report
                </h2>
                <div className="text-xs text-slate-500 mt-1">
                  Scope: <span className="font-semibold text-slate-700">{currentProgrammeName}</span> &bull;{' '}
                  <span className="font-semibold text-slate-700">{currentCohortName}</span> &bull; Generated:{' '}
                  {new Date(metrics.calculatedAt).toLocaleString()}
                </div>
              </div>
              <div className="print:hidden">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Document / Save PDF
                </button>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="py-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2">Executive Summary</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                This Monitoring and Evaluation audit report details institutional performance metrics across{' '}
                <span className="font-semibold">{metrics.totalLearnersEvaluated} evaluated learners</span> within{' '}
                <span className="font-semibold">{metrics.totalCohortsEvaluated} active cohort(s)</span>. The aggregate
                M&E health index stands at{' '}
                <span className="font-bold text-slate-900">{metrics.overallHealthScore}%</span>. Data is verified
                directly from attendance logs, progress engines, coursework submissions, proctored quizzes, and final
                capstone evaluations without external interpolation.
              </p>
            </div>

            {/* 11 Indicators Summary Table */}
            <div className="overflow-x-auto py-2">
              <table className="w-full text-left text-xs text-slate-600 border border-slate-200">
                <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Indicator Code & Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Actual Measured</th>
                    <th className="py-2.5 px-3 text-right">Target Benchmark</th>
                    <th className="py-2.5 px-3 text-right">Variance</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(metrics?.indicators || []).map((ind, indIdx) => (
                    <tr key={`${ind.config.id}-${indIdx}`}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {ind.config.name}
                        <div className="text-[10px] text-slate-400 font-normal">{ind.config.code}</div>
                      </td>
                      <td className="py-2.5 px-3">{ind.config.category}</td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">{ind.displayValue}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{ind.displayTarget}</td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          ind.variance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {ind.variance > 0 ? `+${ind.variance}%` : `${ind.variance}%`}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{ind.status}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{ind.config.weight}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Audit Sign-off Block */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-600">
              <div>
                <div className="font-semibold text-slate-900">Prepared By:</div>
                <div className="mt-4 border-b border-slate-300 w-48"></div>
                <div className="text-[11px] text-slate-400 mt-1">Programme Management & Evaluation Office</div>
              </div>
              <div>
                <div className="font-semibold text-slate-900">Verified & Approved By:</div>
                <div className="mt-4 border-b border-slate-300 w-48"></div>
                <div className="text-[11px] text-slate-400 mt-1">Institutional Academic Director</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          DRILL-DOWN MODAL: INDICATOR DETAILS & FORMULA INSPECTION
          ========================================================================= */}
      {drilldownIndicator && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                  {getIndicatorIcon(drilldownIndicator.config.code)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{drilldownIndicator.config.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getCategoryBadge(drilldownIndicator.config.category)}
                    <span className="text-xs text-slate-400 font-mono">{drilldownIndicator.config.code}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDrilldownIndicator(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs text-slate-600">
              {/* Formula & Rule Description */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-600" /> Calculation Methodology & Formula
                </div>
                <div className="font-mono text-indigo-900 bg-white p-2.5 rounded-lg border border-slate-200 text-xs mt-1">
                  {drilldownIndicator.config.formulaExplanation}
                </div>
                <p className="mt-2 text-slate-500 leading-relaxed">{drilldownIndicator.config.description}</p>
              </div>

              {/* Benchmark Parameters */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                  <div className="text-[10px] uppercase font-bold text-emerald-800">Target Benchmark</div>
                  <div className="text-lg font-black text-emerald-900 mt-0.5">
                    {drilldownIndicator.config.targetBenchmark}%
                  </div>
                </div>
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                  <div className="text-[10px] uppercase font-bold text-amber-800">Warning Threshold</div>
                  <div className="text-lg font-black text-amber-900 mt-0.5">
                    {drilldownIndicator.config.warningThreshold}%
                  </div>
                </div>
                <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                  <div className="text-[10px] uppercase font-bold text-rose-800">Critical Threshold</div>
                  <div className="text-lg font-black text-rose-900 mt-0.5">
                    {drilldownIndicator.config.criticalThreshold}%
                  </div>
                </div>
              </div>

              {/* Sample Breakdown */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 mb-2">Scope & Sample Distribution:</div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span>Evaluated Sample Size:</span>
                  <span className="font-bold text-slate-800">{drilldownIndicator.sampleSize} learners</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span>Learners Meeting Target:</span>
                  <span className="font-bold text-emerald-700">
                    {drilldownIndicator.learnersMeetingTargetCount ?? 0} learner(s)
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span>Learners Below Warning Threshold:</span>
                  <span className="font-bold text-rose-700">
                    {drilldownIndicator.learnersLaggingCount ?? 0} learner(s)
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDrilldownIndicator(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT INDICATOR BENCHMARK CONFIGURATION
          ========================================================================= */}
      {editingIndicator && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Configure Indicator: {editingIndicator.name}</h3>
                <div className="text-xs text-slate-400 font-mono mt-0.5">{editingIndicator.code}</div>
              </div>
              <button
                onClick={() => setEditingIndicator(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedIndicator} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Indicator Name</label>
                <input
                  type="text"
                  value={editingIndicator.name}
                  onChange={(e) => setEditingIndicator({ ...editingIndicator, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Target Benchmark ({editingIndicator.unit})</label>
                  <input
                    type="number"
                    value={editingIndicator.targetBenchmark}
                    onChange={(e) =>
                      setEditingIndicator({ ...editingIndicator, targetBenchmark: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-emerald-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Warning Level</label>
                  <input
                    type="number"
                    value={editingIndicator.warningThreshold}
                    onChange={(e) =>
                      setEditingIndicator({ ...editingIndicator, warningThreshold: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-amber-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Critical Level</label>
                  <input
                    type="number"
                    value={editingIndicator.criticalThreshold}
                    onChange={(e) =>
                      setEditingIndicator({ ...editingIndicator, criticalThreshold: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-rose-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Calculation Weight (%)</label>
                  <input
                    type="number"
                    value={editingIndicator.weight}
                    onChange={(e) => setEditingIndicator({ ...editingIndicator, weight: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                    min={0}
                    max={100}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={editingIndicator.category}
                    onChange={(e) =>
                      setEditingIndicator({ ...editingIndicator, category: e.target.value as MEIndicatorCategory })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ENGAGEMENT">Engagement</option>
                    <option value="ACADEMIC">Academic</option>
                    <option value="OUTCOMES">Outcomes</option>
                    <option value="FEEDBACK">Feedback</option>
                    <option value="PROJECTS">Projects</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Formula & Methodology Notes</label>
                <input
                  type="text"
                  value={editingIndicator.formulaExplanation}
                  onChange={(e) => setEditingIndicator({ ...editingIndicator, formulaExplanation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  value={editingIndicator.description}
                  onChange={(e) => setEditingIndicator({ ...editingIndicator, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingIndicator(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD NEW CUSTOM INDICATOR
          ========================================================================= */}
      {showNewIndicatorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add New M&E Indicator</h3>
                <div className="text-xs text-slate-400 mt-0.5">Define custom metric benchmarks and formulas</div>
              </div>
              <button
                onClick={() => setShowNewIndicatorModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomIndicator} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Indicator Name</label>
                <input
                  type="text"
                  placeholder="e.g. Peer Review Participation Rate"
                  value={newIndicator.name}
                  onChange={(e) =>
                    setNewIndicator({
                      ...newIndicator,
                      name: e.target.value,
                      code: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Unique Indicator Code</label>
                <input
                  type="text"
                  placeholder="e.g. peer_review_rate"
                  value={newIndicator.code}
                  onChange={(e) => setNewIndicator({ ...newIndicator, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Target Benchmark (%)</label>
                  <input
                    type="number"
                    value={newIndicator.targetBenchmark}
                    onChange={(e) => setNewIndicator({ ...newIndicator, targetBenchmark: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-emerald-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Warning Level</label>
                  <input
                    type="number"
                    value={newIndicator.warningThreshold}
                    onChange={(e) => setNewIndicator({ ...newIndicator, warningThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-amber-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Critical Level</label>
                  <input
                    type="number"
                    value={newIndicator.criticalThreshold}
                    onChange={(e) => setNewIndicator({ ...newIndicator, criticalThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-rose-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Calculation Weight (%)</label>
                  <input
                    type="number"
                    value={newIndicator.weight}
                    onChange={(e) => setNewIndicator({ ...newIndicator, weight: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                    min={0}
                    max={100}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={newIndicator.category}
                    onChange={(e) =>
                      setNewIndicator({ ...newIndicator, category: e.target.value as MEIndicatorCategory })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ENGAGEMENT">Engagement</option>
                    <option value="ACADEMIC">Academic</option>
                    <option value="OUTCOMES">Outcomes</option>
                    <option value="FEEDBACK">Feedback</option>
                    <option value="PROJECTS">Projects</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Formula & Calculation Method</label>
                <input
                  type="text"
                  placeholder="e.g. (Reviewed Submissions / Total Required) * 100"
                  value={newIndicator.formulaExplanation}
                  onChange={(e) => setNewIndicator({ ...newIndicator, formulaExplanation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  value={newIndicator.description}
                  onChange={(e) => setNewIndicator({ ...newIndicator, description: e.target.value })}
                  placeholder="Explain why this indicator is tracked and what standard it measures..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewIndicatorModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Create Indicator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
