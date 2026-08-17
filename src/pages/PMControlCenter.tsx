import React, { useState, useEffect } from 'react';
import {
  ClassSession,
  subscribeToClasses,
  createClassSession,
  updateClassSession,
  deleteClassSession,
} from '../services/learnerPortal';
import { getProgrammes, getCohorts } from '../services/programmes';
import { Programme, Cohort } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Calendar,
  Clock,
  Plus,
  Video,
  VideoOff,
  UserCheck,
  Edit2,
  Trash2,
  Search,
  BookOpen,
  Users,
  GraduationCap,
  Layers,
  FileText,
  Award,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  SlidersHorizontal,
  ClipboardList,
  ShieldCheck,
  BellRing,
  HelpCircle,
  FolderOpen,
  ArrowRight,
} from 'lucide-react';

interface PMControlCenterProps {
  initialTab?: 'overview' | 'schedule' | 'applications' | 'admissions' | 'curriculum' | 'assessments';
  onNavigate?: (path: string) => void;
}

export const PMControlCenter: React.FC<PMControlCenterProps> = ({
  initialTab = 'schedule',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters for Scheduler
  const [searchQuery, setSearchQuery] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State for Schedule Class
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('');
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [moduleName, setModuleName] = useState('Module 1: Generative AI Fundamentals');
  const [weekNumber, setWeekNumber] = useState(1);
  const [status, setStatus] = useState<'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED'>('UPCOMING');
  const [recordingUrl, setRecordingUrl] = useState('');

  useEffect(() => {
    setLoading(true);

    const unsubClasses = subscribeToClasses('', (data) => {
      setClasses(data);
      setLoading(false);
    });

    getProgrammes()
      .then((pData) => {
        setProgrammes(pData);
        if (pData.length > 0) setSelectedProgrammeId(pData[0].id);
      })
      .catch((err) => console.error('Error fetching programmes:', err));

    getCohorts()
      .then((cData) => {
        setCohorts(cData);
        if (cData.length > 0) setSelectedCohortId(cData[0].id);
      })
      .catch((err) => console.error('Error fetching cohorts:', err));

    return () => unsubClasses();
  }, []);

  const openNewScheduleModal = () => {
    setEditingClass(null);
    setTitle('');
    setDescription('');
    setInstructorName('Dr. Sarah Jenkins');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().split('T')[0]);
    setStartTime('10:00');
    setEndTime('12:00');
    setDurationMinutes(120);
    setMeetingUrl('https://meet.google.com/gen-ai-cohort2');
    setModuleName('Module 1: Generative AI Fundamentals');
    setWeekNumber(1);
    setStatus('UPCOMING');
    setRecordingUrl('');
    setIsScheduleModalOpen(true);
  };

  const openEditScheduleModal = (cls: ClassSession) => {
    setEditingClass(cls);
    setTitle(cls.title);
    setDescription(cls.description || '');
    setInstructorName(cls.instructorName || cls.facilitatorName || '');
    if (cls.scheduledAt) {
      setScheduledDate(cls.scheduledAt.split('T')[0]);
    }
    setStartTime(cls.startTime || '10:00');
    setEndTime(cls.endTime || '12:00');
    setDurationMinutes(cls.durationMinutes || 120);
    setMeetingUrl(cls.meetingUrl || cls.liveMeetingUrl || '');
    setSelectedProgrammeId(cls.programmeId);
    setSelectedCohortId(cls.cohortId);
    setModuleName(cls.moduleName || '');
    setWeekNumber(cls.weekNumber || 1);
    setStatus(cls.status);
    setRecordingUrl(cls.recordingUrl || '');
    setIsScheduleModalOpen(true);
  };

  const handleSaveClassSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledDate) {
      setActionError('Class title and scheduled date are required.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    const progObj = programmes.find((p) => p.id === selectedProgrammeId);
    const cohortObj = cohorts.find((c) => c.id === selectedCohortId);

    const scheduledAtISO = new Date(`${scheduledDate}T${startTime}:00`).toISOString();

    const payload = {
      programmeId: selectedProgrammeId || (programmes[0]?.id || 'gen-ai'),
      programmeName: progObj?.title || 'Generative AI & Automation',
      cohortId: selectedCohortId || (cohorts[0]?.id || 'cohort-02'),
      cohortName: cohortObj?.name || 'Cohort 2 - Fall 2026',
      title,
      description,
      instructorName,
      facilitatorName: instructorName,
      scheduledAt: scheduledAtISO,
      date: scheduledDate,
      startTime,
      endTime,
      durationMinutes: Number(durationMinutes),
      meetingUrl,
      liveMeetingUrl: meetingUrl,
      status,
      weekNumber: Number(weekNumber),
      moduleName,
      recordingUrl: recordingUrl || undefined,
      recordingStatus: recordingUrl ? ('PUBLISHED' as const) : ('NOT_AVAILABLE' as const),
    };

    try {
      if (editingClass) {
        await updateClassSession(editingClass.id, payload);
        setActionSuccess(`Class "${title}" successfully updated.`);
      } else {
        await createClassSession(payload);
        setActionSuccess(`New class "${title}" successfully scheduled!`);
      }
      setIsScheduleModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save class session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: string, classTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete class session "${classTitle}"?`)) return;
    try {
      await deleteClassSession(id);
      setActionSuccess(`Class "${classTitle}" deleted.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete class session');
    }
  };

  // Filtered Classes list
  const filteredClasses = classes.filter((cls) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      cls.title.toLowerCase().includes(q) ||
      (cls.instructorName || '').toLowerCase().includes(q) ||
      (cls.moduleName || '').toLowerCase().includes(q);
    const matchesProg = programmeFilter === 'ALL' || cls.programmeId === programmeFilter;
    const matchesStatus = statusFilter === 'ALL' || cls.status === statusFilter;
    return matchesQuery && matchesProg && matchesStatus;
  });

  const upcomingCount = classes.filter((c) => c.status === 'UPCOMING').length;
  const liveCount = classes.filter((c) => c.status === 'LIVE').length;
  const completedCount = classes.filter((c) => c.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Top Section Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" /> Programme Manager Control Hub
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Class Scheduler & Operations Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Schedule live masterclasses, set timetable slots, publish session recordings, and manage cohort delivery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <Button
            variant="primary"
            size="sm"
            onClick={openNewScheduleModal}
            className="w-full sm:w-auto font-bold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Schedule New Class
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <Alert type="success" onDismiss={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      {actionError && (
        <Alert type="error" onDismiss={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* Control Center Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-white text-orange-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 inline mr-1.5" /> Timetable Scheduler ({classes.length})
        </button>
        <button
          onClick={() => onNavigate ? onNavigate('/portal/pm/form-builder') : setActiveTab('form-builder')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 inline mr-1.5 text-orange-500" /> Form Builder
        </button>
        <button
          onClick={() => onNavigate ? onNavigate('/portal/pm/assessments') : setActiveTab('assessments')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <ClipboardList className="w-3.5 h-3.5 inline mr-1.5" /> Assessments & Bank
        </button>
        <button
          onClick={() => onNavigate ? onNavigate('/portal/pm/applications') : setActiveTab('applications')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <FileText className="w-3.5 h-3.5 inline mr-1.5" /> Applications Review
        </button>
        <button
          onClick={() => onNavigate ? onNavigate('/portal/pm/admissions') : setActiveTab('admissions')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <UserCheck className="w-3.5 h-3.5 inline mr-1.5" /> Admissions & Enrolment
        </button>
        <button
          onClick={() => onNavigate ? onNavigate('/portal/pm/curriculum') : setActiveTab('curriculum')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <Layers className="w-3.5 h-3.5 inline mr-1.5" /> Curriculum Builder
        </button>
        <button
          onClick={() => onNavigate ? onNavigate('/portal/pm/learners') : undefined}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <Users className="w-3.5 h-3.5 inline mr-1.5" /> Learners & Attendance
        </button>
        <button
          onClick={() => onNavigate ? onNavigate('/portal/pm/at-risk') : undefined}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <AlertCircle className="w-3.5 h-3.5 inline mr-1.5" /> At-Risk Engine
        </button>
        <button
          onClick={() => onNavigate ? onNavigate('/portal/pm/reporting') : undefined}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" /> Reports & Analytics
        </button>
        <button
          onClick={() => onNavigate ? onNavigate('/portal/pm/ai') : undefined}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-orange-600" /> AI Center
        </button>
      </div>

      {/* Feature Quick Launch Cards Directory */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-400" />
              Programme Operations Directory
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Instant 1-click access to every core management module, admissions engine, and academic tool.
            </p>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-orange-950/80 text-orange-400 rounded border border-orange-800/60 font-semibold self-start sm:self-auto">
            15 Integrated Modules
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Form Builder */}
          <button
            onClick={() => onNavigate && onNavigate('/portal/pm/form-builder')}
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 hover:border-orange-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="p-1.5 bg-orange-600/20 text-orange-400 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <span className="text-[9px] bg-orange-900/60 text-orange-300 px-1.5 py-0.5 rounded font-bold uppercase">Builder</span>
            </div>
            <p className="text-xs font-bold text-slate-200 group-hover:text-white">Form Builder</p>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Drag-drop fields & question bank</p>
          </button>

          {/* Assessments */}
          <button
            onClick={() => onNavigate && onNavigate('/portal/pm/assessments')}
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 hover:border-orange-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs font-bold text-slate-200 group-hover:text-white">Assessments & Bank</p>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Exams, bulk import & window toggle</p>
          </button>

          {/* Applications Review */}
          <button
            onClick={() => onNavigate && onNavigate('/portal/pm/applications')}
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 hover:border-orange-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="p-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs font-bold text-slate-200 group-hover:text-white">Applications Review</p>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Screening, verification & intake</p>
          </button>

          {/* Admissions & Decisions */}
          <button
            onClick={() => onNavigate && onNavigate('/portal/pm/admissions')}
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 hover:border-orange-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="p-1.5 bg-amber-600/20 text-amber-400 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs font-bold text-slate-200 group-hover:text-white">Admissions & Letters</p>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Offer letters, capacity & enrolment</p>
          </button>

          {/* Programmes & Cohorts */}
          <button
            onClick={() => onNavigate && onNavigate('/portal/pm/programmes')}
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 hover:border-orange-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="p-1.5 bg-purple-600/20 text-purple-400 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs font-bold text-slate-200 group-hover:text-white">Programmes & Cohorts</p>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Track management & batch cycles</p>
          </button>

          {/* Curriculum & Modules */}
          <button
            onClick={() => onNavigate && onNavigate('/portal/pm/curriculum')}
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 hover:border-orange-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs font-bold text-slate-200 group-hover:text-white">Curriculum Modules</p>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Lessons, outcomes & study assets</p>
          </button>

          {/* Learners & Attendance */}
          <button
            onClick={() => onNavigate && onNavigate('/portal/pm/learners')}
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 hover:border-orange-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="p-1.5 bg-teal-600/20 text-teal-400 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs font-bold text-slate-200 group-hover:text-white">Learners & Attendance</p>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Student roster & daily check-ins</p>
          </button>

          {/* Progress & Milestones */}
          <button
            onClick={() => onNavigate && onNavigate('/portal/pm/progress')}
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 hover:border-orange-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="p-1.5 bg-cyan-600/20 text-cyan-400 rounded-lg group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs font-bold text-slate-200 group-hover:text-white">Progress Engine</p>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Cohort milestone completion</p>
          </button>

          {/* At-Risk & Interventions */}
          <button
            onClick={() => onNavigate && onNavigate('/portal/pm/at-risk')}
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 hover:border-orange-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="p-1.5 bg-rose-600/20 text-rose-400 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs font-bold text-slate-200 group-hover:text-white">At-Risk Interventions</p>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Early warnings & recovery plans</p>
          </button>

          {/* AI Intelligence Center */}
          <button
            onClick={() => onNavigate && onNavigate('/portal/pm/ai')}
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 hover:border-orange-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="p-1.5 bg-fuchsia-600/20 text-fuchsia-400 rounded-lg group-hover:bg-fuchsia-600 group-hover:text-white transition-colors">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[9px] bg-fuchsia-900/60 text-fuchsia-300 px-1.5 py-0.5 rounded font-bold uppercase">AI</span>
            </div>
            <p className="text-xs font-bold text-slate-200 group-hover:text-white">AI Intelligence Hub</p>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Automated triage & AI assistant</p>
          </button>
        </div>
      </div>

      {/* Scheduler Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Scheduled</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{classes.length}</p>
        </Card>
        <Card className="p-4 bg-orange-50/60 border-orange-200/80">
          <p className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider">Upcoming Sessions</p>
          <p className="text-2xl font-bold text-orange-900 mt-1">{upcomingCount}</p>
        </Card>
        <Card className="p-4 bg-emerald-50/60 border-emerald-200/80">
          <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Live Active</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{liveCount}</p>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{completedCount}</p>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 bg-white border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search class title, instructor, module..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
          <Select
            options={[
              { value: 'ALL', label: 'All Programmes' },
              ...programmes.map((p) => ({ value: p.id, label: p.title })),
            ]}
            value={programmeFilter}
            onChange={(e) => setProgrammeFilter(e.target.value)}
          />
          <Select
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'UPCOMING', label: 'Upcoming Sessions' },
              { value: 'LIVE', label: 'Live Now' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* Scheduled Classes List */}
      {loading ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
          <Spinner size="lg" label="Syncing class schedules from Firestore..." />
        </div>
      ) : filteredClasses.length === 0 ? (
        <Card className="p-8 text-center bg-white border-slate-200">
          <EmptyState
            title="No class sessions scheduled"
            description="Get started by creating a new live class schedule for your cohort learners."
            actionLabel="Schedule First Class"
            onAction={openNewScheduleModal}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredClasses.map((cls) => {
            const dateStr = cls.scheduledAt
              ? new Date(cls.scheduledAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : cls.date || 'TBD';

            return (
              <Card
                key={cls.id}
                className="p-4 sm:p-5 bg-white border-slate-200 hover:border-orange-300 transition-all shadow-2xs"
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          cls.status === 'LIVE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                            : cls.status === 'UPCOMING'
                            ? 'bg-orange-100 text-orange-800 border border-orange-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {cls.status === 'LIVE' ? '🔴 LIVE NOW' : cls.status}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {cls.programmeName || 'Generative AI'}
                      </span>
                      {cls.moduleName && (
                        <span className="text-xs text-slate-500 font-medium">
                          • {cls.moduleName}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {cls.title}
                    </h3>

                    {cls.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {cls.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-orange-600" />
                        <span>{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                        <span>
                          {cls.startTime || '10:00'} - {cls.endTime || '12:00'} ({cls.durationMinutes || 120} mins)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <UserCheck className="w-3.5 h-3.5 text-orange-600" />
                        <span>Instructor: {cls.instructorName || cls.facilitatorName || 'Assigned Facilitator'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Links */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 w-full lg:w-auto justify-end">
                    {(cls.meetingUrl || cls.liveMeetingUrl) && (
                      <a
                        href={cls.meetingUrl || cls.liveMeetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold hover:bg-orange-100 transition-colors"
                      >
                        <Video className="w-3.5 h-3.5" /> Meeting Link
                      </a>
                    )}

                    {cls.recordingUrl && (
                      <a
                        href={cls.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Recording
                      </a>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditScheduleModal(cls)}
                      className="text-xs font-semibold"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClass(cls.id, cls.title)}
                      className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Schedule / Edit Class Session Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title={editingClass ? 'Edit Class Schedule' : 'Schedule Live Class Session'}
      >
        <form onSubmit={handleSaveClassSession} className="space-y-4 pt-2">
          <Input
            label="Class Title"
            placeholder="e.g., Masterclass 03: Advanced Prompting & LangChain Workflows"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class Description / Syllabus Topics
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              rows={3}
              placeholder="Detail session objectives, prerequisite readings, and lab assignments..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Target Programme"
              options={
                programmes.length > 0
                  ? programmes.map((p) => ({ value: p.id, label: p.title }))
                  : [{ value: 'gen-ai', label: 'Generative AI & Automation' }]
              }
              value={selectedProgrammeId}
              onChange={(e) => setSelectedProgrammeId(e.target.value)}
            />

            <Select
              label="Target Cohort"
              options={
                cohorts.length > 0
                  ? cohorts.map((c) => ({ value: c.id, label: c.name }))
                  : [{ value: 'cohort-02', label: 'Cohort 2 - Fall 2026' }]
              }
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Instructor / Facilitator Name"
              placeholder="e.g. Dr. Sarah Jenkins"
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
            />

            <Input
              label="Module Name"
              placeholder="e.g. Module 1: Architecture"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Scheduled Date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
            />

            <Input
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />

            <Input
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Live Meeting Link (Google Meet / Zoom)"
              placeholder="https://meet.google.com/abc-defg-hij"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
            />

            <Select
              label="Session Status"
              options={[
                { value: 'UPCOMING', label: 'Upcoming' },
                { value: 'LIVE', label: 'Live Now' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            />
          </div>

          <Input
            label="Class Recording Link (Optional / Post-Session)"
            placeholder="https://youtube.com/watch?v=... or Drive URL"
            value={recordingUrl}
            onChange={(e) => setRecordingUrl(e.target.value)}
          />

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsScheduleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="font-bold shadow-xs"
            >
              {isSubmitting ? (
                <Spinner size="sm" />
              ) : editingClass ? (
                'Save Schedule Updates'
              ) : (
                'Publish Class Session'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
