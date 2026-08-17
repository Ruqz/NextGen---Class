import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Users,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Award,
  BarChart3,
  TrendingUp,
  Sparkles,
  Sliders,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Clock,
  Building2,
  Layers,
  Check,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  BrainCircuit,
  Lightbulb,
} from 'lucide-react';
import {
  ReportType,
  LearnerSegmentFilter,
  ReportDatePreset,
  ReportFilterParams,
  GeneratedReportData,
  Programme,
  Cohort,
  AIReportSynthesisResult,
} from '../types';
import {
  generateReport,
  fetchRawReportDataset,
  exportReportToCSV,
  exportReportToDoc,
  RawReportDataset,
} from '../services/reporting';
import { generateAIReportSynthesis } from '../services/ai';
import { subscribeToProgrammes, subscribeToCohorts } from '../services/programmes';

interface ReportOptionItem {
  type: ReportType;
  title: string;
  shortDesc: string;
  icon: React.ReactNode;
  category: 'Strategic' | 'Academic' | 'Operational' | 'Impact';
}

const REPORT_OPTIONS: ReportOptionItem[] = [
  {
    type: 'COHORT',
    title: 'Cohort Report',
    shortDesc: 'Batch velocity, retention rates, attendance & completion across cohort cycles.',
    icon: <GraduationCap className="w-5 h-5 text-indigo-600" />,
    category: 'Strategic',
  },
  {
    type: 'PROGRAMME',
    title: 'Programme Report',
    shortDesc: 'Curriculum tracks, delivery modes, multi-cohort aggregate reach & health.',
    icon: <BookOpen className="w-5 h-5 text-blue-600" />,
    category: 'Strategic',
  },
  {
    type: 'LEARNER',
    title: 'Learner Report',
    shortDesc: 'Individual candidate roster, progress scores, assessment averages & risk tiers.',
    icon: <Users className="w-5 h-5 text-emerald-600" />,
    category: 'Academic',
  },
  {
    type: 'ATTENDANCE',
    title: 'Attendance Report',
    shortDesc: 'Class session logs, punctuality distribution, absences & compliance.',
    icon: <Calendar className="w-5 h-5 text-amber-600" />,
    category: 'Operational',
  },
  {
    type: 'ASSESSMENT',
    title: 'Assessment Report',
    shortDesc: 'Exam attempts, pass rates, score distributions & subject mastery.',
    icon: <CheckCircle2 className="w-5 h-5 text-teal-600" />,
    category: 'Academic',
  },
  {
    type: 'ASSIGNMENT',
    title: 'Assignment Report',
    shortDesc: 'Coursework submissions, facilitator grading turnaround & average scores.',
    icon: <FileText className="w-5 h-5 text-violet-600" />,
    category: 'Academic',
  },
  {
    type: 'COMPLETION',
    title: 'Completion Report',
    shortDesc: 'Graduation audits, coursework fulfillment and time-to-completion metrics.',
    icon: <TrendingUp className="w-5 h-5 text-green-600" />,
    category: 'Operational',
  },
  {
    type: 'CERTIFICATION',
    title: 'Certification Report',
    shortDesc: 'Verifiable credentials registry, certificate serial numbers & alumni records.',
    icon: <Award className="w-5 h-5 text-amber-500" />,
    category: 'Operational',
  },
  {
    type: 'ME',
    title: 'M&E Report',
    shortDesc: '11 Core M&E Indicators vs benchmark targets, variance & health index.',
    icon: <BarChart3 className="w-5 h-5 text-rose-600" />,
    category: 'Impact',
  },
  {
    type: 'IMPACT_DONOR',
    title: 'Impact/Donor Report',
    shortDesc: 'Beneficiary reach, gender equity, youth empowerment & workforce transition.',
    icon: <Sparkles className="w-5 h-5 text-purple-600" />,
    category: 'Impact',
  },
];

interface PMReportsDashboardProps {
  initialReportType?: ReportType;
}

export const PMReportsDashboard: React.FC<PMReportsDashboardProps> = ({
  initialReportType = 'COHORT',
}) => {
  const { userProfile, activeRole } = useAuth();

  // State
  const [selectedReportType, setSelectedReportType] = useState<ReportType>(initialReportType);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cachedDataset, setCachedDataset] = useState<RawReportDataset | null>(null);

  // Filters
  const [programmeFilter, setProgrammeFilter] = useState<string>('ALL');
  const [cohortFilter, setCohortFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<ReportDatePreset>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [learnerSegment, setLearnerSegment] = useState<LearnerSegmentFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Generated Report State
  const [reportData, setReportData] = useState<GeneratedReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState<boolean>(false);

  // Module 23 AI Narrative State
  const [aiSynthesis, setAiSynthesis] = useState<AIReportSynthesisResult | null>(null);
  const [isGeneratingAISynthesis, setIsGeneratingAISynthesis] = useState<boolean>(false);
  const [synthesisAudience, setSynthesisAudience] = useState<'leadership' | 'donors' | 'm_and_e' | 'facilitators'>('leadership');
  const [aiSynthesisError, setAiSynthesisError] = useState<string | null>(null);

  // Pagination for large reports
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Subscribe to Programmes & Cohorts for Dropdowns
  useEffect(() => {
    const unsubProg = subscribeToProgrammes(setProgrammes);
    const unsubCoh = subscribeToCohorts(setCohorts);
    return () => {
      unsubProg();
      unsubCoh();
    };
  }, []);

  // Filter cohorts available for currently selected programme
  const availableCohorts = useMemo(() => {
    if (programmeFilter === 'ALL') return cohorts;
    return cohorts.filter((c) => c.programmeId === programmeFilter);
  }, [cohorts, programmeFilter]);

  // Load report data
  const loadReport = async (fresh: boolean = false) => {
    setIsLoading(true);
    try {
      let dataset = cachedDataset;
      if (fresh || !dataset) {
        dataset = await fetchRawReportDataset();
        setCachedDataset(dataset);
      }

      // Calculate date filters based on preset
      let sDate = startDate;
      let eDate = endDate;
      const now = new Date();

      if (datePreset === 'THIS_MONTH') {
        sDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        eDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      } else if (datePreset === 'LAST_30_DAYS') {
        sDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        eDate = now.toISOString().slice(0, 10);
      } else if (datePreset === 'THIS_QUARTER') {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        sDate = new Date(now.getFullYear(), qMonth, 1).toISOString().slice(0, 10);
        eDate = new Date(now.getFullYear(), qMonth + 3, 0).toISOString().slice(0, 10);
      } else if (datePreset === 'THIS_YEAR') {
        sDate = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
        eDate = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
      }

      const filters: ReportFilterParams = {
        programmeId: programmeFilter,
        cohortId: cohortFilter,
        datePreset,
        startDate: datePreset === 'ALL' ? undefined : sDate,
        endDate: datePreset === 'ALL' ? undefined : eDate,
        learnerSegment,
        searchKeyword: searchQuery,
      };

      const result = await generateReport(selectedReportType, filters, dataset);
      setReportData(result);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger report generation on filter or report type change
  useEffect(() => {
    loadReport();
  }, [selectedReportType, programmeFilter, cohortFilter, datePreset, startDate, endDate, learnerSegment]);

  // Handle filtered rows by search query
  const filteredRows = useMemo(() => {
    if (!reportData) return [];
    if (!searchQuery.trim()) return reportData.rows;
    const q = searchQuery.toLowerCase();
    return reportData.rows.filter((row) => {
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [reportData, searchQuery]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!reportData) return;
    setIsExporting(true);
    try {
      exportReportToCSV(reportData);
    } finally {
      setIsExporting(false);
    }
  };

  // DOC Export Handler
  const handleExportDoc = () => {
    if (!reportData) return;
    setIsExporting(true);
    try {
      exportReportToDoc(reportData);
    } finally {
      setIsExporting(false);
    }
  };

  // Module 23 AI Narrative Generator
  const handleGenerateAISynthesis = async () => {
    if (!reportData) return;
    setIsGeneratingAISynthesis(true);
    setAiSynthesisError(null);
    try {
      const summaryMetrics: Record<string, any> = {
        totalRows: reportData.rows.length,
        kpis: reportData.kpis,
        filters: reportData.filtersApplied,
      };

      const result = await generateAIReportSynthesis({
        reportType: reportData.type,
        reportTitle: reportData.title,
        filterContext: reportData.filtersApplied,
        kpis: reportData.kpis,
        summaryMetrics,
        audience: synthesisAudience,
        userUid: userProfile?.uid || 'pm-user',
        userName: userProfile?.displayName || 'Programme Manager',
        userRole: activeRole,
      });

      setAiSynthesis(result);
    } catch (err: any) {
      console.error('AI synthesis failed:', err);
      setAiSynthesisError(err?.message || 'Failed to synthesize AI narrative');
    } finally {
      setIsGeneratingAISynthesis(false);
    }
  };

  const currentReportMeta = REPORT_OPTIONS.find((r) => r.type === selectedReportType) || REPORT_OPTIONS[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 print:bg-white print:p-0 print:pb-0">
      {/* Top Banner / Breadcrumb (Hidden in print) */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Module 22 — Comprehensive Reporting & Analytics</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                Institutional Reports Center
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate, filter, and export live Firestore audit records across 10 official reporting schemas.
              </p>
            </div>

            {/* Export Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => loadReport(true)}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title="Reload fresh records from Firestore"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleGenerateAISynthesis}
                disabled={isLoading || !reportData || isGeneratingAISynthesis}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                title="Generate AI Executive Briefing & Strategic Synthesis from live metrics"
              >
                <BrainCircuit className={`w-3.5 h-3.5 text-orange-600 ${isGeneratingAISynthesis ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAISynthesis ? 'Synthesizing...' : '✨ AI Executive Brief'}</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={isLoading || !reportData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleExportDoc}
                disabled={isLoading || !reportData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Export DOC</span>
              </button>

              <button
                onClick={handlePrint}
                disabled={isLoading || !reportData}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Export PDF / Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 print:p-0 print:m-0 print:w-full print:max-w-none">
        {/* REPORT TYPE SELECTOR CAROUSEL / GRID (Hidden in print) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs print:hidden">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Select Report Schema (10 Available)
            </span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              {currentReportMeta.category} Classification
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {REPORT_OPTIONS.map((opt) => {
              const isSelected = selectedReportType === opt.type;
              return (
                <button
                  key={opt.type}
                  onClick={() => setSelectedReportType(opt.type)}
                  className={`flex flex-col items-start text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-500 shadow-xs ring-1 ring-indigo-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white shadow-2xs' : 'bg-slate-100'}`}>
                      {opt.icon}
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    )}
                  </div>
                  <span className={`text-xs font-bold ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                    {opt.title}
                  </span>
                  <span className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    {opt.shortDesc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* COMPREHENSIVE FILTER TOOLBAR (Hidden in print) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Live Report Scope Filters</h3>
                <p className="text-xs text-slate-500">
                  Filter by Programme, Cohort, Date Period, and Learner Segments
                </p>
              </div>
            </div>

            {/* Quick Segment Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Segment:</span>
              {[
                { id: 'ALL', label: 'All Learners' },
                { id: 'ACTIVE', label: 'Active' },
                { id: 'COMPLETED', label: 'Completed' },
                { id: 'AT_RISK', label: 'At-Risk (<70%)' },
                { id: 'HIGH_PERFORMER', label: 'High Performers' },
                { id: 'FEMALE', label: 'Female' },
                { id: 'YOUTH', label: 'Youth (<25)' },
                { id: 'JOB_SEEKER', label: 'Job Seekers' },
              ].map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => setLearnerSegment(seg.id as LearnerSegmentFilter)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    learnerSegment === seg.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {seg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            {/* Programme Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Programme Track
              </label>
              <div className="relative">
                <select
                  value={programmeFilter}
                  onChange={(e) => {
                    setProgrammeFilter(e.target.value);
                    setCohortFilter('ALL');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-medium rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Programmes</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cohort Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Cohort Batch
              </label>
              <div className="relative">
                <select
                  value={cohortFilter}
                  onChange={(e) => setCohortFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-medium rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Cohorts</option>
                  {availableCohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code || c.id.slice(0, 5)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Preset */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Date Horizon
              </label>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as ReportDatePreset)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-medium rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Time History</option>
                <option value="THIS_MONTH">Current Month</option>
                <option value="LAST_30_DAYS">Past 30 Days</option>
                <option value="THIS_QUARTER">Current Quarter</option>
                <option value="THIS_YEAR">Current Calendar Year</option>
                <option value="CUSTOM">Custom Date Window</option>
              </select>
            </div>

            {/* Search within Report */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Filter Records
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search candidate, cohort, status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg pl-8 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Custom Date Pickers when CUSTOM is chosen */}
          {datePreset === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-3 pt-2 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100">
              <span className="text-xs font-bold text-indigo-900">Custom Date Range:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 text-slate-900"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 text-slate-900"
                />
              </div>
            </div>
          )}
        </div>

        {/* REPORT CANVAS / DOCUMENT CONTAINER */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-4">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-sm font-bold text-slate-800">Generating Official {currentReportMeta.title}...</div>
            <p className="text-xs text-slate-500">Querying and synthesizing live Firestore dataset collections.</p>
          </div>
        ) : !reportData ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            No report data could be compiled for the selected scope.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6 print:border-none print:shadow-none print:p-0">
            {/* REPORT DOCUMENT HEADER */}
            <div className="border-b border-slate-200 pb-6 space-y-3">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wider">
                      Official Institutional Report
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      REF-{reportData.id.slice(0, 14)}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                    {reportData.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                    {reportData.subtitle}
                  </p>
                </div>

                <div className="text-left md:text-right text-xs text-slate-500 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-700">Generated: </span>
                    {new Date(reportData.generatedAt).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Audit Status: </span>
                    <span className="text-emerald-600 font-bold">Synchronized (Firestore)</span>
                  </div>
                </div>
              </div>

              {/* Applied Scope Meta Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-500 font-medium">Applied Scope:</span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 font-semibold text-slate-800">
                    📚 Programme: {reportData.filtersApplied.programmeName}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 font-semibold text-slate-800">
                    🎓 Cohort: {reportData.filtersApplied.cohortName}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 font-semibold text-slate-800">
                    📅 Horizon: {reportData.filtersApplied.dateRangeLabel}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-indigo-50 font-semibold text-indigo-800">
                    👥 Segment: {reportData.filtersApplied.segmentLabel}
                  </span>
                </div>

                {!aiSynthesis && (
                  <button
                    onClick={handleGenerateAISynthesis}
                    disabled={isGeneratingAISynthesis}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg cursor-pointer transition-all disabled:opacity-50 print:hidden"
                  >
                    <BrainCircuit className={`w-3.5 h-3.5 ${isGeneratingAISynthesis ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingAISynthesis ? 'Synthesizing...' : 'Generate AI Executive Synthesis'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* MODULE 23: AI SYNTHESIZED EXECUTIVE NARRATIVE BRIEFING */}
            {aiSynthesis && (
              <div className="bg-gradient-to-br from-orange-50/70 via-amber-50/40 to-white rounded-2xl border border-orange-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-orange-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900">AI-Synthesized Executive Narrative Briefing</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 uppercase tracking-wider">
                          Gemini 3.7 Flash
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Audience: <strong className="capitalize">{aiSynthesis.audience}</strong> • Generated {new Date(aiSynthesis.generatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 print:hidden">
                    <select
                      value={synthesisAudience}
                      onChange={(e) => setSynthesisAudience(e.target.value as any)}
                      className="text-xs bg-white border border-orange-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium cursor-pointer"
                    >
                      <option value="leadership">Leadership Lens</option>
                      <option value="donors">Donor & Funder Lens</option>
                      <option value="m_and_e">M&E Technical Lens</option>
                      <option value="facilitators">Facilitator Lens</option>
                    </select>

                    <button
                      onClick={handleGenerateAISynthesis}
                      disabled={isGeneratingAISynthesis}
                      className="px-2.5 py-1 text-xs font-semibold text-orange-700 bg-white border border-orange-200 rounded-lg hover:bg-orange-50 cursor-pointer disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-800 leading-relaxed bg-white/80 p-3.5 rounded-xl border border-orange-100">
                  <p className="font-semibold text-slate-900 mb-1">Executive Summary:</p>
                  <p>{aiSynthesis.executiveSummary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Positive Trends */}
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 space-y-1.5">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      Key Positive Trends
                    </div>
                    <ul className="space-y-1 text-slate-700 text-[11px]">
                      {(aiSynthesis.positiveTrends || []).map((trend, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{trend}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Critical Risks */}
                  <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3 space-y-1.5">
                    <div className="font-bold text-rose-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      Risk & Retention Alerts
                    </div>
                    <ul className="space-y-1 text-slate-700 text-[11px]">
                      {(aiSynthesis.riskAlerts || []).map((risk, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actionable Recommendations */}
                  <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-3 space-y-1.5">
                    <div className="font-bold text-indigo-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                      Strategic Next Steps
                    </div>
                    <ul className="space-y-1 text-slate-700 text-[11px]">
                      {(aiSynthesis.recommendations || []).map((rec, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* EXECUTIVE KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(reportData.kpis || []).map((kpi, kIdx) => {
                let statusColor = 'border-slate-200 bg-slate-50/60 text-slate-900';
                if (kpi.status === 'success') statusColor = 'border-emerald-200 bg-emerald-50/40 text-emerald-950';
                else if (kpi.status === 'warning') statusColor = 'border-amber-200 bg-amber-50/40 text-amber-950';
                else if (kpi.status === 'danger') statusColor = 'border-rose-200 bg-rose-50/40 text-rose-950';
                else if (kpi.status === 'info') statusColor = 'border-blue-200 bg-blue-50/40 text-blue-950';

                return (
                  <div
                    key={`${kpi.label}-${kIdx}`}
                    className={`rounded-xl border p-4 flex flex-col justify-between ${statusColor}`}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {kpi.label}
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold my-1.5 tracking-tight">
                      {kpi.value}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {kpi.subtext || 'Verified ledger metric'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISUAL BREAKDOWNS (if available) */}
            {reportData.visualBreakdowns && reportData.visualBreakdowns.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {reportData.visualBreakdowns.map((vb, vbIdx) => (
                  <div
                    key={`${vb.title}-${vbIdx}`}
                    className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3"
                  >
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {vb.title}
                    </div>
                    <div className="space-y-2">
                      {vb.items.map((item, itmIdx) => (
                        <div key={`${item.label}-${itmIdx}`} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-700">{item.label}</span>
                            <span className="font-bold text-slate-900">
                              {item.value} {item.total ? `(${item.value}%)` : ''}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${item.total ? Math.min(100, item.value) : (item.value / (reportData.totalRecordsCount || 1)) * 100}%`,
                                backgroundColor: item.color || '#4F46E5',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SUMMARY INSIGHTS BOX */}
            {reportData.summaryInsights && reportData.summaryInsights.length > 0 && (
              <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    Executive Summary & Operational Observations
                  </h4>
                </div>
                <ul className="space-y-1.5 text-xs text-indigo-900">
                  {reportData.summaryInsights.map((insight, inIdx) => (
                    <li key={inIdx} className="flex items-start gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* DETAILED DATA TABLE */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-sm font-bold text-slate-900">
                  Detailed Audit Ledger ({filteredRows.length} {filteredRows.length === 1 ? 'Record' : 'Records'})
                </div>
                <div className="text-xs text-slate-500">
                  Showing {filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} entries
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      {(reportData.columns || []).map((col) => (
                        <th
                          key={col.key}
                          className={`py-3 px-3.5 text-${col.align || 'left'} whitespace-nowrap`}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={(reportData.columns || []).length}
                          className="py-8 text-center text-slate-400 font-medium"
                        >
                          No matching records found in this view.
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row, rIdx) => (
                        <tr
                          key={`row-${rIdx}`}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {(reportData.columns || []).map((col) => {
                            const val = row[col.key];

                            if (col.format === 'badge') {
                              let badgeColor = 'bg-slate-100 text-slate-700';
                              const strVal = String(val || '').toUpperCase();
                              if (['ACTIVE', 'COMPLETED', 'PASSED', 'EXEMPLARY', 'ISSUED', 'VERIFIED', 'ACHIEVED', 'EXCEEDED', 'ON_TRACK'].includes(strVal)) {
                                badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                              } else if (['AT_RISK', 'PENDING', 'LATE', 'SUBMITTED'].includes(strVal)) {
                                badgeColor = 'bg-amber-50 text-amber-700 border border-amber-200';
                              } else if (['FAILED', 'CRITICAL', 'ABSENT', 'REVOKED', 'DROPPED'].includes(strVal)) {
                                badgeColor = 'bg-rose-50 text-rose-700 border border-rose-200';
                              }

                              return (
                                <td key={col.key} className={`py-3 px-3.5 text-${col.align || 'left'}`}>
                                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${badgeColor}`}>
                                    {String(val || '—')}
                                  </span>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={col.key}
                                className={`py-3 px-3.5 text-${col.align || 'left'} text-slate-800 font-medium`}
                              >
                                {val !== undefined && val !== null && String(val) !== '' ? String(val) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls (Hidden in print) */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 print:hidden">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 font-medium"
                    >
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-slate-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PRINT FOOTER (Visible only in print mode) */}
            <div className="hidden print:block pt-8 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between">
              <div>NextGen Class Platform — Official Institutional Report</div>
              <div>Confidential Audit Document • Generated {new Date(reportData.generatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
