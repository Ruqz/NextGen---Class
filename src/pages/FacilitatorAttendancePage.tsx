import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ClassSession,
  subscribeToClasses,
} from '../services/learnerPortal';
import {
  subscribeToAllEnrolments,
  subscribeToLearnerProfiles,
} from '../services/learners';
import {
  saveBulkAttendanceRecords,
  updateAttendanceRecord,
  subscribeToAttendanceRecords,
  subscribeToAttendanceThresholdConfig,
  calculateAttendancePercentage,
} from '../services/attendance';
import {
  Enrolment,
  LearnerProfile,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceThresholdConfig,
} from '../types';
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
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Edit2,
  Save,
  Search,
  Filter,
  Users,
  CheckCheck,
  History,
  FileSpreadsheet,
  AlertCircle,
  BarChart2,
  Sparkles,
} from 'lucide-react';

interface FacilitatorAttendancePageProps {
  onNavigate?: (path: string) => void;
}

export const FacilitatorAttendancePage: React.FC<FacilitatorAttendancePageProps> = ({
  onNavigate,
}) => {
  const { userProfile } = useAuth();

  // State
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [learners, setLearners] = useState<LearnerProfile[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [thresholdConfig, setThresholdConfig] = useState<AttendanceThresholdConfig>({
    warningThresholdPercentage: 80,
    criticalThresholdPercentage: 75,
    lateWeightPercentage: 50,
    updatedAt: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Search & Filter in Roster
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Draft Roster Status Mapping: learnerId -> { status, notes }
  const [rosterDraft, setRosterDraft] = useState<
    Record<string, { status: AttendanceStatus; notes: string }>
  >({});

  // Correction Modal State
  const [correctionTarget, setCorrectionTarget] = useState<AttendanceRecord | null>(null);
  const [correctionNewStatus, setCorrectionNewStatus] = useState<AttendanceStatus>('PRESENT');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  // Active Tab: Roster vs History
  const [activeTab, setActiveTab] = useState<'roster' | 'history'>('roster');

  useEffect(() => {
    setLoading(true);

    const unsubClasses = subscribeToClasses('', (cList) => {
      setClasses(cList);
      if (cList.length > 0 && !selectedClassId) {
        setSelectedClassId(cList[0].id);
      }
    });

    const unsubEnrolments = subscribeToAllEnrolments((eList) => {
      setEnrolments(eList);
    });

    const unsubLearners = subscribeToLearnerProfiles((lList) => {
      setLearners(lList);
      setLoading(false);
    });

    const unsubAttendance = subscribeToAttendanceRecords(undefined, (records) => {
      setAttendanceRecords(records);
    });

    const unsubConfig = subscribeToAttendanceThresholdConfig((cfg) => {
      setThresholdConfig(cfg);
    });

    return () => {
      unsubClasses();
      unsubEnrolments();
      unsubLearners();
      unsubAttendance();
      unsubConfig();
    };
  }, []);

  // When selectedClassId changes, populate draft roster with existing saved attendance records or default to PRESENT
  const currentClass = classes.find((c) => c.id === selectedClassId);

  // Active cohort learners for selected class
  const cohortEnrolments = enrolments.filter((e) => {
    if (!currentClass) return true;
    return e.cohortId === currentClass.cohortId || e.programmeId === currentClass.programmeId;
  });

  // Unique learners list for this class cohort
  const cohortLearners: Array<{
    learnerId: string;
    userId: string;
    name: string;
    email: string;
    cohortName: string;
    programmeName: string;
  }> = (cohortEnrolments.length > 0 ? cohortEnrolments : enrolments).map((e) => {
    const lProf = learners.find((l) => l.learnerId === e.learnerId || l.userId === e.userId || l.email === e.userEmail);
    return {
      learnerId: e.learnerId || lProf?.learnerId || e.userId,
      userId: e.userId,
      name: e.userName || lProf?.displayName || 'Enrolled Learner',
      email: e.userEmail || lProf?.email || '',
      cohortName: e.cohortName || 'Cohort 2',
      programmeName: e.programmeName || 'Generative AI',
    };
  });

  // Remove duplicates if any
  const uniqueRosterLearners: Array<{
    learnerId: string;
    userId: string;
    name: string;
    email: string;
    cohortName: string;
    programmeName: string;
  }> = Array.from(
    new Map(cohortLearners.map((item) => [item.learnerId, item])).values()
  );

  useEffect(() => {
    if (!selectedClassId) return;

    // Filter existing saved records for this class
    const existingClassRecords = attendanceRecords.filter((r) => r.classSessionId === selectedClassId);

    const initialDraft: Record<string, { status: AttendanceStatus; notes: string }> = {};

    uniqueRosterLearners.forEach((lrn) => {
      const match = existingClassRecords.find((r) => r.learnerId === lrn.learnerId || r.userId === lrn.userId);
      if (match) {
        initialDraft[lrn.learnerId] = {
          status: match.status,
          notes: match.notes || '',
        };
      } else {
        // Default to PRESENT
        initialDraft[lrn.learnerId] = {
          status: 'PRESENT',
          notes: '',
        };
      }
    });

    setRosterDraft(initialDraft);
  }, [selectedClassId, attendanceRecords, enrolments]);

  // Bulk Actions
  const handleMarkAll = (status: AttendanceStatus) => {
    setRosterDraft((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        updated[key] = { ...updated[key], status };
      });
      return updated;
    });
    setActionSuccess(`All learners marked as ${status}`);
  };

  const handleStatusChange = (learnerId: string, status: AttendanceStatus) => {
    setRosterDraft((prev) => ({
      ...prev,
      [learnerId]: { ...prev[learnerId], status },
    }));
  };

  const handleNotesChange = (learnerId: string, notes: string) => {
    setRosterDraft((prev) => ({
      ...prev,
      [learnerId]: { ...prev[learnerId], notes },
    }));
  };

  // Save Roster
  const handleSaveRoster = async () => {
    if (!currentClass) {
      setActionError('Please select a valid class session.');
      return;
    }

    setIsSaving(true);
    setActionError(null);
    setActionSuccess(null);

    const now = new Date().toISOString();
    const markedBy = userProfile?.email || 'Facilitator';
    const markedByName = userProfile?.displayName || 'Facilitator';

    const recordsToSave = uniqueRosterLearners.map((lrn) => {
      const draft = rosterDraft[lrn.learnerId] || { status: 'PRESENT', notes: '' };
      return {
        classSessionId: currentClass.id,
        classSessionTitle: currentClass.title,
        classSessionDate: currentClass.scheduledAt
          ? currentClass.scheduledAt.split('T')[0]
          : currentClass.date || new Date().toISOString().split('T')[0],
        programmeId: currentClass.programmeId,
        programmeName: currentClass.programmeName || lrn.programmeName,
        cohortId: currentClass.cohortId,
        cohortName: currentClass.cohortName || lrn.cohortName,
        learnerId: lrn.learnerId,
        userId: lrn.userId,
        learnerName: lrn.name,
        learnerEmail: lrn.email,
        status: draft.status,
        notes: draft.notes,
        markedBy,
        markedByName,
        markedAt: now,
        updatedAt: now,
      };
    });

    try {
      await saveBulkAttendanceRecords(recordsToSave);
      setActionSuccess(`Attendance roster for "${currentClass.title}" saved successfully!`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save attendance records.');
    } finally {
      setIsSaving(false);
    }
  };

  // Individual Correction Handler
  const openCorrectionModal = (rec: AttendanceRecord) => {
    setCorrectionTarget(rec);
    setCorrectionNewStatus(rec.status);
    setCorrectionReason('');
    setActionError(null);
  };

  const handleApplyCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget) return;

    if (!correctionReason.trim()) {
      setActionError('Correction reason is required for audit compliance.');
      return;
    }

    setIsSubmittingCorrection(true);
    setActionError(null);

    try {
      await updateAttendanceRecord(
        correctionTarget.id,
        correctionNewStatus,
        correctionReason,
        userProfile?.email || 'Facilitator'
      );
      setActionSuccess(`Attendance for ${correctionTarget.learnerName} updated to ${correctionNewStatus}.`);
      setCorrectionTarget(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update attendance correction.');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Computed Statistics for Selected Roster
  const totalRosterCount = uniqueRosterLearners.length;
  const draftValues = Object.values(rosterDraft) as Array<{ status: AttendanceStatus; notes: string }>;
  const presentCount = draftValues.filter((d) => d.status === 'PRESENT').length;
  const lateCount = draftValues.filter((d) => d.status === 'LATE').length;
  const absentCount = draftValues.filter((d) => d.status === 'ABSENT').length;
  const excusedCount = draftValues.filter((d) => d.status === 'EXCUSED').length;

  const currentRosterPct = calculateAttendancePercentage(
    presentCount,
    lateCount,
    totalRosterCount || 1,
    thresholdConfig.lateWeightPercentage
  );

  // Filtered Roster Learners
  const filteredRosterLearners = uniqueRosterLearners.filter((lrn) => {
    const q = searchQuery.toLowerCase();
    const draft = rosterDraft[lrn.learnerId] || { status: 'PRESENT' };
    const matchesQuery =
      lrn.name.toLowerCase().includes(q) ||
      lrn.email.toLowerCase().includes(q) ||
      lrn.learnerId.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || draft.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  // Calculate overall historical attendance % for a learner across all saved records
  const getLearnerHistoricalPct = (learnerId: string) => {
    const lRecords = attendanceRecords.filter((r) => r.learnerId === learnerId || r.userId === learnerId);
    if (lRecords.length === 0) return 100;
    const p = lRecords.filter((r) => r.status === 'PRESENT').length;
    const l = lRecords.filter((r) => r.status === 'LATE').length;
    return calculateAttendancePercentage(p, l, lRecords.length, thresholdConfig.lateWeightPercentage);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" /> Facilitator Attendance Workspace
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Class Attendance Roster & Marking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Mark live class attendance, manage bulk statuses, apply individual corrections, and view cohort participation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('roster')}
            className={`font-semibold ${activeTab === 'roster' ? 'border-orange-500 text-orange-700 bg-orange-50' : ''}`}
          >
            <UserCheck className="w-4 h-4 mr-1.5" /> Marking Roster
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('history')}
            className={`font-semibold ${activeTab === 'history' ? 'border-orange-500 text-orange-700 bg-orange-50' : ''}`}
          >
            <History className="w-4 h-4 mr-1.5" /> Class History ({attendanceRecords.length})
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

      {/* Class Session Selector & Overview */}
      <Card className="p-5 bg-white border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="w-full sm:w-80">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Class Session / Masterclass
            </label>
            <Select
              options={
                classes.length > 0
                  ? classes.map((c) => ({
                      value: c.id,
                      label: `${c.title} (${c.date || c.scheduledAt?.split('T')[0] || 'TBD'})`,
                    }))
                  : [{ value: '', label: 'No classes available' }]
              }
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            />
          </div>

          {currentClass && (
            <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 w-full sm:w-auto">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Programme & Cohort</span>
                <span className="font-bold text-slate-900">{currentClass.programmeName || 'Gen AI'} • {currentClass.cohortName || 'Cohort 2'}</span>
              </div>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Scheduled Time</span>
                <span className="font-bold text-slate-900">{currentClass.startTime || '10:00'} - {currentClass.endTime || '12:00'}</span>
              </div>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Status</span>
                <Badge variant={currentClass.status === 'LIVE' ? 'emerald' : 'orange'} size="sm">
                  {currentClass.status}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Live Attendance Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Enrolled Roster</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{totalRosterCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
            <p className="text-[10px] font-bold text-emerald-700 uppercase">Present</p>
            <p className="text-xl font-bold text-emerald-900 mt-0.5">{presentCount}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
            <p className="text-[10px] font-bold text-amber-700 uppercase">Late</p>
            <p className="text-xl font-bold text-amber-900 mt-0.5">{lateCount}</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
            <p className="text-[10px] font-bold text-rose-700 uppercase">Absent</p>
            <p className="text-xl font-bold text-rose-900 mt-0.5">{absentCount}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold text-blue-700 uppercase">Excused</p>
            <p className="text-xl font-bold text-blue-900 mt-0.5">{excusedCount}</p>
          </div>
        </div>
      </Card>

      {/* VIEW TAB 1: MARKING ROSTER */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Roster Controls & Bulk Action Toolbar */}
          <Card className="p-4 bg-white border-slate-200 space-y-3">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
                <div className="w-full sm:w-64">
                  <Input
                    placeholder="Search learner name, ID, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="w-4 h-4" />}
                  />
                </div>
                <div className="w-full sm:w-44">
                  <Select
                    options={[
                      { value: 'ALL', label: 'All Statuses' },
                      { value: 'PRESENT', label: 'Present Only' },
                      { value: 'LATE', label: 'Late Only' },
                      { value: 'ABSENT', label: 'Absent Only' },
                      { value: 'EXCUSED', label: 'Excused Only' },
                    ]}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  />
                </div>
              </div>

              {/* Bulk Attendance Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                <span className="text-xs font-bold text-slate-500 mr-1 hidden sm:inline">Bulk Mark:</span>
                <button
                  type="button"
                  onClick={() => handleMarkAll('PRESENT')}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold hover:bg-emerald-200 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll('ABSENT')}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-100 text-rose-800 text-xs font-bold hover:bg-rose-200 transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 inline mr-1" /> All Absent
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll('LATE')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold hover:bg-amber-200 transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> All Late
                </button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveRoster}
                  disabled={isSaving || filteredRosterLearners.length === 0}
                  className="font-bold shadow-xs ml-2"
                >
                  {isSaving ? <Spinner size="sm" /> : <><Save className="w-4 h-4 mr-1.5" /> Save Roster</>}
                </Button>
              </div>
            </div>
          </Card>

          {/* Learner Roster Table */}
          {loading ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
              <Spinner size="lg" label="Loading cohort attendance roster..." />
            </div>
          ) : filteredRosterLearners.length === 0 ? (
            <Card className="p-8 text-center bg-white border-slate-200">
              <EmptyState
                title="No learners found in roster"
                description="Check search filters or ensure active learners are enrolled in this cohort."
              />
            </Card>
          ) : (
            <Card className="bg-white border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5 sm:p-4">Learner Details</th>
                      <th className="p-3.5 sm:p-4">Overall History %</th>
                      <th className="p-3.5 sm:p-4 text-center">Attendance Status Selection</th>
                      <th className="p-3.5 sm:p-4">Session Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRosterLearners.map((lrn) => {
                      const currentDraft = rosterDraft[lrn.learnerId] || { status: 'PRESENT', notes: '' };
                      const histPct = getLearnerHistoricalPct(lrn.learnerId);

                      return (
                        <tr key={lrn.learnerId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 sm:p-4">
                            <div className="font-bold text-slate-900 text-sm">{lrn.name}</div>
                            <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5">
                              <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                {lrn.learnerId}
                              </span>
                              <span>{lrn.email}</span>
                            </div>
                          </td>

                          <td className="p-3.5 sm:p-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold px-2 py-0.5 rounded text-xs ${
                                  histPct < thresholdConfig.criticalThresholdPercentage
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : histPct < thresholdConfig.warningThresholdPercentage
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {histPct}%
                              </span>
                              {histPct < thresholdConfig.warningThresholdPercentage && (
                                <span className="text-[10px] text-amber-700 font-bold uppercase flex items-center gap-0.5">
                                  <AlertTriangle className="w-3 h-3" /> Risk
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5 sm:p-4 text-center">
                            <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl gap-1 border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(lrn.learnerId, 'PRESENT')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  currentDraft.status === 'PRESENT'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> PRESENT
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStatusChange(lrn.learnerId, 'LATE')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  currentDraft.status === 'LATE'
                                    ? 'bg-amber-500 text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> LATE
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStatusChange(lrn.learnerId, 'ABSENT')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  currentDraft.status === 'ABSENT'
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <XCircle className="w-3.5 h-3.5 inline mr-1" /> ABSENT
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStatusChange(lrn.learnerId, 'EXCUSED')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  currentDraft.status === 'EXCUSED'
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <HelpCircle className="w-3.5 h-3.5 inline mr-1" /> EXCUSED
                              </button>
                            </div>
                          </td>

                          <td className="p-3.5 sm:p-4 min-w-[180px]">
                            <Input
                              placeholder="Reason / notes..."
                              value={currentDraft.notes}
                              onChange={(e) => handleNotesChange(lrn.learnerId, e.target.value)}
                              className="text-xs"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* VIEW TAB 2: CLASS HISTORY & CORRECTIONS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <Card className="p-5 bg-white border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Saved Attendance Records Log</h3>
            <p className="text-xs text-slate-500 mb-4">
              Audit log of marked attendance sessions across all cohorts with individual correction history.
            </p>

            {attendanceRecords.length === 0 ? (
              <EmptyState title="No attendance records saved yet" description="Mark and save attendance rosters to view historical records." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Class Session</th>
                      <th className="p-3">Learner</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Marked By</th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Correction Audit</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{rec.classSessionTitle}</div>
                          <div className="text-[11px] text-slate-500">{rec.programmeName} • {rec.cohortName}</div>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {rec.learnerName}
                          <span className="block text-[11px] text-slate-500 font-mono">{rec.learnerId}</span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              rec.status === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'LATE'
                                ? 'bg-amber-100 text-amber-800'
                                : rec.status === 'ABSENT'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">{rec.markedByName || rec.markedBy}</td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {new Date(rec.markedAt || rec.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3 text-[11px] text-slate-500">
                          {rec.correctedBy ? (
                            <div className="bg-amber-50 text-amber-900 p-2 rounded border border-amber-200">
                              <span className="font-bold">Corrected by:</span> {rec.correctedBy}
                              <span className="block text-[10px] italic">"{rec.correctionReason}"</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">No corrections</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCorrectionModal(rec)}
                            className="text-xs font-semibold"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" /> Correct
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Individual Correction Modal */}
      <Modal
        isOpen={!!correctionTarget}
        onClose={() => setCorrectionTarget(null)}
        title="Apply Individual Attendance Correction"
      >
        {correctionTarget && (
          <form onSubmit={handleApplyCorrection} className="space-y-4 pt-2">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">{correctionTarget.learnerName} ({correctionTarget.learnerId})</p>
              <p className="text-slate-500">Session: <span className="font-semibold">{correctionTarget.classSessionTitle}</span></p>
              <p className="text-slate-500">Current Status: <span className="font-bold uppercase text-orange-600">{correctionTarget.status}</span></p>
            </div>

            <Select
              label="Corrected Attendance Status"
              options={[
                { value: 'PRESENT', label: 'PRESENT' },
                { value: 'LATE', label: 'LATE' },
                { value: 'ABSENT', label: 'ABSENT' },
                { value: 'EXCUSED', label: 'EXCUSED' },
              ]}
              value={correctionNewStatus}
              onChange={(e) => setCorrectionNewStatus(e.target.value as AttendanceStatus)}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correction Audit Reason (Required)
              </label>
              <textarea
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="Detail reason for correction (e.g., Medical excuse verified, technical connectivity issue confirmed)..."
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                required
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCorrectionTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmittingCorrection}
                className="font-bold shadow-xs"
              >
                {isSubmittingCorrection ? <Spinner size="sm" /> : 'Save Attendance Correction'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
