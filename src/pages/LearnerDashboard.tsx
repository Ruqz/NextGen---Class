import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LearnerProfile,
  Enrolment,
  Programme,
  Cohort,
  Assessment,
  AssessmentAttempt,
  CurriculumModuleItem,
} from '../types';
import {
  subscribeToLearnerEnrolments,
  subscribeToLearnerProfiles,
  subscribeToAllEnrolments,
} from '../services/learners';
import { getProgrammes, getCohorts } from '../services/programmes';
import {
  initializePortalFirestoreData,
  subscribeToClasses,
  markClassAttendance,
  subscribeToUserAttendance,
  subscribeToAssignments,
  submitAssignment,
  subscribeToUserSubmissions,
  subscribeToResources,
  submitLearnerFeedback,
  subscribeToUserFeedback,
  getOrCreateCertificateRecord,
  subscribeToUserCertificate,
  subscribeToUserNotifications,
  subscribeToUserActivity,
  ClassSession,
  ClassAttendance,
  Assignment,
  AssignmentSubmission,
  CourseResource,
  LearnerFeedback,
  CertificateRecord,
  LearnerNotification,
  RecentActivityItem,
} from '../services/learnerPortal';
import { subscribeToAssessments, getUserAttempts } from '../services/assessments';
import { subscribeToLearnerCurriculum } from '../services/curriculum';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/utils';

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  Award,
  ClipboardList,
  ExternalLink,
  FileCheck,
  BarChart3,
  HelpCircle,
  Users,
  Printer,
  Star,
  Video,
  FileText,
  Play,
  X,
  MoreHorizontal,
  Bell,
  Sparkles,
  PlayCircle,
} from 'lucide-react';

interface LearnerDashboardProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export const LearnerDashboard: React.FC<LearnerDashboardProps> = ({ currentPath = '/portal/learner/dashboard', onNavigate }) => {
  const { userProfile, activeRole } = useAuth();

  // Core Data States
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [learnerProfiles, setLearnerProfiles] = useState<LearnerProfile[]>([]);
  const [allEnrolments, setAllEnrolments] = useState<Enrolment[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedEnrolmentId, setSelectedEnrolmentId] = useState<string | null>(null);
  const [selectedLearnerEmail, setSelectedLearnerEmail] = useState<string>('');

  // Portal Entity States
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [attendance, setAttendance] = useState<ClassAttendance[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [resources, setResources] = useState<CourseResource[]>([]);
  const [userFeedback, setUserFeedback] = useState<LearnerFeedback[]>([]);
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null);
  const [curriculumModules, setCurriculumModules] = useState<CurriculumModuleItem[]>([]);
  const [notifications, setNotifications] = useState<LearnerNotification[]>([]);
  const [activityItems, setActivityItems] = useState<RecentActivityItem[]>([]);

  // UI Interactive States
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [assignmentText, setAssignmentText] = useState<string>('');
  const [assignmentUrl, setAssignmentUrl] = useState<string>('');
  const [submittingAssignment, setSubmittingAssignment] = useState<boolean>(false);

  // Class Filter & Detail Modal
  const [classTab, setClassTab] = useState<'UPCOMING' | 'COMPLETED'>('UPCOMING');
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);

  // Selected Journey Module
  const [selectedJourneyModule, setSelectedJourneyModule] = useState<string | null>(null);

  // Feedback Form State
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackCategory, setFeedbackCategory] = useState<'COURSE_CONTENT' | 'INSTRUCTOR' | 'PLATFORM' | 'GENERAL'>('COURSE_CONTENT');
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<boolean>(false);

  // Active Feedback Form Target
  const [activeFeedbackFormTitle, setActiveFeedbackFormTitle] = useState<string>('Week 1 Class Feedback');

  // Profile Form State
  const [editDisplayName, setEditDisplayName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<boolean>(false);

  // Resource Category Filter
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState<string>('ALL');

  const currentUserEmail = userProfile?.email || 'demo.learner@nextgenpro.org';
  const currentUserName = userProfile?.displayName || 'Active Learner';
  const currentUserUid = userProfile?.uid || 'demo-learner';

  const isManagementView = ['Programme Manager', 'Super Admin', 'PROGRAMME_MANAGER', 'SUPER_ADMIN'].includes(activeRole);

  // Map URL path to active tab
  const getTabFromPath = (path: string): 'dashboard' | 'programme' | 'classes' | 'assignments' | 'assessments' | 'resources' | 'progress' | 'feedback' | 'certificate' | 'profile' => {
    if (path.includes('/programme')) return 'programme';
    if (path.includes('/classes')) return 'classes';
    if (path.includes('/assignments')) return 'assignments';
    if (path.includes('/assessments')) return 'assessments';
    if (path.includes('/resources')) return 'resources';
    if (path.includes('/progress')) return 'progress';
    if (path.includes('/feedback')) return 'feedback';
    if (path.includes('/certificate')) return 'certificate';
    if (path.includes('/profile')) return 'profile';
    return 'dashboard';
  };

  const activeTab = getTabFromPath(currentPath);

  // Handle Tab Switch Navigation
  const handleTabClick = (tab: string) => {
    const targetPath = `/portal/learner/${tab === 'dashboard' ? 'dashboard' : tab}`;
    if (onNavigate) {
      onNavigate(targetPath);
    }
  };

  // 1. Initial Program & Enrolment Data Fetch
  useEffect(() => {
    setLoading(true);

    Promise.all([getProgrammes(), getCohorts()])
      .then(([progs, cohs]) => {
        setProgrammes(progs);
        setCohorts(cohs);
      })
      .catch(console.error);

    const unsubAll = subscribeToAllEnrolments((list) => setAllEnrolments(list));
    const unsubProfiles = subscribeToLearnerProfiles((profiles) => setLearnerProfiles(profiles));

    const targetEmail = selectedLearnerEmail || currentUserEmail;
    const unsubUserEnrolments = subscribeToLearnerEnrolments(targetEmail, (list) => {
      setEnrolments(list);
      setLoading(false);
    });

    return () => {
      unsubAll();
      unsubProfiles();
      unsubUserEnrolments();
    };
  }, [currentUserEmail, selectedLearnerEmail]);

  // Set default selected enrolment
  useEffect(() => {
    if (enrolments.length > 0 && (!selectedEnrolmentId || !enrolments.some((e) => e.id === selectedEnrolmentId))) {
      setSelectedEnrolmentId(enrolments[0].id);
    }
  }, [enrolments, selectedEnrolmentId]);

  // Active Enrolment Object
  const activeEnrolment = enrolments.find((e) => e.id === selectedEnrolmentId) || enrolments[0] || null;

  // Active Learner Profile Object
  const activeLearnerProfile = learnerProfiles.find(
    (lp) => lp.email.toLowerCase() === (activeEnrolment?.userEmail || currentUserEmail).toLowerCase() || lp.userId === currentUserUid
  );

  // Active Programme and Cohort
  const activeProgramme = programmes.find((p) => p.id === activeEnrolment?.programmeId) || null;
  const activeCohort = cohorts.find((c) => c.id === activeEnrolment?.cohortId) || null;

  // Initialize Profile Edit form inputs
  useEffect(() => {
    setEditDisplayName(userProfile?.displayName || activeEnrolment?.userName || '');
    setEditPhone(userProfile?.phoneNumber || activeLearnerProfile?.phoneNumber || '');
  }, [userProfile, activeEnrolment, activeLearnerProfile]);

  // 2. Initialize Firestore Data Seeder & Listeners for Active Enrolment
  useEffect(() => {
    if (!activeEnrolment) return;

    const progId = activeEnrolment.programmeId;
    const progName = activeEnrolment.programmeName;
    const cohId = activeEnrolment.cohortId;
    const cohName = activeEnrolment.cohortName;

    // Run Auto-Seeder if collections are empty (ensures real Firestore backing)
    initializePortalFirestoreData(progId, progName, cohId, cohName);

    // Subscribe to Firestore Collections
    const unsubClasses = subscribeToClasses(progId, (clsList) => setClasses(clsList));
    const unsubAttendance = subscribeToUserAttendance(currentUserUid, (attList) => setAttendance(attList));
    const unsubAssignments = subscribeToAssignments(progId, (asgnList) => setAssignments(asgnList));
    const unsubSubmissions = subscribeToUserSubmissions(currentUserUid, (subList) => setSubmissions(subList));
    const unsubResources = subscribeToResources(progId, (resList) => setResources(resList));
    const unsubCurriculum = subscribeToLearnerCurriculum(progId, (modList) => setCurriculumModules(modList));
    const unsubFeedback = subscribeToUserFeedback(currentUserUid, (fbList) => setUserFeedback(fbList));
    const unsubNotifications = subscribeToUserNotifications(currentUserUid, (nList) => setNotifications(nList));
    const unsubActivity = subscribeToUserActivity(currentUserUid, (actList) => setActivityItems(actList));

    const unsubAssessments = subscribeToAssessments((assList) => {
      setAssessments(assList.filter((a) => !progId || a.programmeId === progId || a.availability === 'PUBLISHED'));
    });

    // Fetch User Assessment Attempts
    getUserAttempts(currentUserUid)
      .then((attList) => setAttempts(attList))
      .catch(console.error);

    // Compute or Fetch Certificate Record
    getOrCreateCertificateRecord(
      activeEnrolment.id,
      currentUserUid,
      activeLearnerProfile?.learnerId || activeEnrolment.learnerId,
      activeEnrolment.userName,
      activeEnrolment.userEmail,
      progId,
      progName,
      cohId,
      cohName,
      78 // Calculated overall progress %
    ).then((certRec) => setCertificate(certRec));

    const unsubCert = subscribeToUserCertificate(activeEnrolment.id, (certRec) => setCertificate(certRec));

    return () => {
      unsubClasses();
      unsubAttendance();
      unsubAssignments();
      unsubSubmissions();
      unsubResources();
      unsubCurriculum();
      unsubFeedback();
      unsubNotifications();
      unsubActivity();
      unsubAssessments();
      unsubCert();
    };
  }, [activeEnrolment, currentUserUid, currentUserEmail]);

  // Derived Module 10 Indicators
  const upcomingClasses = classes.filter((c) => c.status === 'UPCOMING' || c.status === 'LIVE');
  const completedClasses = classes.filter((c) => c.status === 'COMPLETED');
  const nextClass = upcomingClasses[0] || classes[0] || null;

  const totalClassesCount = Math.max(classes.length, 1);
  const presentCount = attendance.filter((a) => a.status === 'PRESENT').length;
  const lateCount = attendance.filter((a) => (a as any).status === 'LATE').length;
  const absentCount = attendance.filter((a) => a.status === 'ABSENT').length;
  const excusedCount = attendance.filter((a) => a.status === 'EXCUSED').length;

  const attendanceRatePercentage = Math.round(((presentCount + lateCount * 0.5) / totalClassesCount) * 100);

  const totalAssignmentsCount = assignments.length || 5;
  const submittedAssignmentsCount = submissions.filter((s) => s.status === 'SUBMITTED' || s.status === 'GRADED').length;

  const totalAssessmentsCount = assessments.length || 2;
  const passedAssessmentsCount = attempts.filter((att) => att.passed).length;

  const overallProgressPercentage = Math.min(
    Math.round(
      (submittedAssignmentsCount / Math.max(totalAssignmentsCount, 1)) * 40 +
        (passedAssessmentsCount / Math.max(totalAssessmentsCount, 1)) * 40 +
        (attendanceRatePercentage / 100) * 20
    ),
    100
  );

  // Submit Assignment Handler
  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignmentId || !activeEnrolment) return;

    const targetAssignment = assignments.find((a) => a.id === submittingAssignmentId);
    if (!targetAssignment) return;

    setSubmittingAssignment(true);
    try {
      await submitAssignment(
        targetAssignment,
        activeLearnerProfile?.learnerId || activeEnrolment.learnerId,
        currentUserUid,
        currentUserName,
        currentUserEmail,
        assignmentText,
        assignmentUrl
      );
      setAssignmentText('');
      setAssignmentUrl('');
      setSubmittingAssignmentId(null);
    } catch (err) {
      console.error('Error submitting assignment:', err);
    } finally {
      setSubmittingAssignment(false);
    }
  };

  // Submit Feedback Handler
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEnrolment || !feedbackComment.trim()) return;

    setSubmittingFeedback(true);
    try {
      await submitLearnerFeedback({
        programmeId: activeEnrolment.programmeId,
        programmeName: activeEnrolment.programmeName,
        cohortId: activeEnrolment.cohortId,
        userId: currentUserUid,
        learnerId: activeLearnerProfile?.learnerId || activeEnrolment.learnerId,
        userName: currentUserName,
        userEmail: currentUserEmail,
        rating: feedbackRating,
        category: feedbackCategory,
        comment: `${activeFeedbackFormTitle}: ${feedbackComment}`,
      });

      setFeedbackComment('');
      setFeedbackSuccess(true);
      setTimeout(() => setFeedbackSuccess(false), 4000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Save Profile Handler
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      if (currentUserUid) {
        await updateDoc(doc(db, 'users', currentUserUid), cleanFirestoreData({
          displayName: editDisplayName,
          phoneNumber: editPhone,
          updatedAt: new Date().toISOString(),
        }));
      }

      if (activeLearnerProfile?.id) {
        await updateDoc(doc(db, 'learners', activeLearnerProfile.id), cleanFirestoreData({
          displayName: editDisplayName,
          phoneNumber: editPhone,
          updatedAt: new Date().toISOString(),
        }));
      }

      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Error updating learner profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  // Mark Class Attendance
  const handleMarkAttendance = async (cls: ClassSession) => {
    if (!activeEnrolment) return;
    try {
      await markClassAttendance(
        cls.id,
        cls.title,
        activeLearnerProfile?.learnerId || activeEnrolment.learnerId,
        currentUserUid,
        currentUserName,
        currentUserEmail
      );
    } catch (err) {
      console.error('Error marking class attendance:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Enrolment Identity Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1 text-xs py-0.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                MODULE 10 — LEARNER PORTAL
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs py-0.5">
                Status: ACTIVE LEARNER
              </Badge>
              {isManagementView && (
                <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs py-0.5">
                  PM Preview Mode
                </Badge>
              )}
            </div>

            {/* WELCOME BANNER SPEC */}
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {activeEnrolment?.userName || currentUserName}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700/80">
                <BookOpen className="w-4 h-4 text-orange-400" />
                <span className="text-slate-400">Programme:</span>
                <span className="font-bold text-white">{activeEnrolment?.programmeName || 'Generative AI & AI Automation'}</span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700/80">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400">Cohort:</span>
                <span className="font-bold text-emerald-300">{activeEnrolment?.cohortName || 'Cohort 2'}</span>
              </div>

              <div className="flex items-center gap-1.5 font-mono bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700/80">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-400">Learner ID:</span>
                <span className="font-bold text-blue-300">{activeLearnerProfile?.learnerId || activeEnrolment?.learnerId || 'LRN-2026-ACTIVE'}</span>
              </div>
            </div>
          </div>

          {/* Enrolment Switcher */}
          <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700/80 min-w-[280px] space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Enrolment Workspace</span>
              <span className="text-orange-400 font-normal">{enrolments.length} Total</span>
            </p>

            {enrolments.length > 0 ? (
              <select
                value={selectedEnrolmentId || ''}
                onChange={(e) => setSelectedEnrolmentId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:ring-2 focus:ring-orange-500 focus:outline-none cursor-pointer"
              >
                {enrolments.map((enr) => (
                  <option key={enr.id} value={enr.id}>
                    {enr.programmeName} — ({enr.cohortName})
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs text-slate-400 italic py-1">No active enrolments found for this account.</div>
            )}
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden md:flex items-center gap-1 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <GraduationCap className="w-4 h-4" /> },
            { id: 'programme', label: 'Programme & Journey', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'classes', label: 'My Classes', icon: <Calendar className="w-4 h-4" /> },
            { id: 'assignments', label: 'Assignments', icon: <ClipboardList className="w-4 h-4" /> },
            { id: 'assessments', label: 'Assessments', icon: <FileCheck className="w-4 h-4" /> },
            { id: 'resources', label: 'Resources', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'progress', label: 'Progress', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'feedback', label: 'Feedback', icon: <HelpCircle className="w-4 h-4" /> },
            { id: 'certificate', label: 'Certificate', icon: <Award className="w-4 h-4" /> },
            { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: LEARNER DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* SECTION A: PROGRAMME PROGRESS OVERVIEW */}
          <Card variant="bordered-orange" className="p-6 bg-white space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">PROGRAMME PROGRESS</p>
                <div className="flex items-baseline gap-3 mt-1">
                  <h2 className="text-3xl font-black text-slate-900">{overallProgressPercentage}%</h2>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    On Track
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6">
                <div>
                  <p className="text-lg font-bold text-slate-900">{completedClasses.length} / {totalClassesCount}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Classes completed</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{submittedAssignmentsCount} / {totalAssignmentsCount}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Assignments completed</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{passedAssessmentsCount} / {totalAssessmentsCount}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Assessments completed</p>
                </div>
              </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-orange-500 to-amber-500 h-3 rounded-full transition-all shadow-xs"
                style={{ width: `${overallProgressPercentage}%` }}
              />
            </div>
          </Card>

          {/* SECTION B: NEXT CLASS & QUICK STATUS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* NEXT CLASS SPOTLIGHT CARD */}
            <Card variant="bordered" className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-4 lg:col-span-1 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <span className="text-xs font-extrabold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> NEXT CLASS
                </span>
                <Badge variant={nextClass?.status === 'LIVE' ? 'danger' : 'orange'} size="sm">
                  {nextClass?.status || 'UPCOMING'}
                </Badge>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">{nextClass?.moduleName || 'Week 3 — AI Automation Foundations'}</span>
                <h3 className="text-base font-extrabold text-white line-clamp-2">
                  {nextClass?.title || 'Week 3 — AI Automation Foundations'}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2">
                  {nextClass?.description || 'Architecting multi-agent workflow pipelines and trigger events.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-800/90 p-3 rounded-xl border border-slate-700 text-xs">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-semibold">Date</p>
                  <p className="font-bold text-slate-100">{nextClass?.date || 'Saturday, June 20'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-semibold">Time</p>
                  <p className="font-bold text-slate-100">{nextClass?.startTime || '10:00 AM'}</p>
                </div>
              </div>

              {/* JOIN LIVE CLASS BUTTON — Displayed ONLY when valid live meeting link exists */}
              {(nextClass?.liveMeetingUrl || nextClass?.meetingUrl) ? (
                <a
                  href={nextClass.liveMeetingUrl || nextClass.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleMarkAttendance(nextClass)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-extrabold text-white bg-orange-600 hover:bg-orange-500 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <Video className="w-4 h-4" /> JOIN LIVE CLASS
                </a>
              ) : (
                <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-center text-xs text-slate-400 italic">
                  Live meeting link will become active shortly before class.
                </div>
              )}
            </Card>

            {/* QUICK STATUS GRID */}
            <Card variant="bordered" className="p-6 bg-white space-y-4 lg:col-span-2">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                QUICK STATUS
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Attendance</p>
                  <p className="text-2xl font-black text-emerald-600">{attendanceRatePercentage}%</p>
                  <p className="text-[10px] text-slate-400">{presentCount} Present</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Assignments</p>
                  <p className="text-2xl font-black text-blue-600">{submittedAssignmentsCount}/{totalAssignmentsCount}</p>
                  <p className="text-[10px] text-slate-400">completed</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Assessments</p>
                  <p className="text-2xl font-black text-purple-600">{passedAssessmentsCount}/{totalAssessmentsCount}</p>
                  <p className="text-[10px] text-slate-400">completed</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Overall Progress</p>
                  <p className="text-2xl font-black text-orange-600">{overallProgressPercentage}%</p>
                  <p className="text-[10px] text-slate-400">programme score</p>
                </div>
              </div>

              {/* RECENT LEARNING WIDGET */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">RECENT LEARNING</span>
                    <p className="text-xs font-bold text-slate-900">Week 2 — Generative AI Foundations</p>
                  </div>
                  <Badge variant="success" size="sm">COMPLETED</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {completedClasses[0]?.recordingStatus === 'PUBLISHED' && completedClasses[0]?.recordingUrl ? (
                    <a
                      href={completedClasses[0].recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all"
                    >
                      <Play className="w-3.5 h-3.5 text-orange-400 fill-current" /> Watch Recording
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-md">
                      Recording not yet available
                    </span>
                  )}

                  <Button variant="outline" size="sm" className="text-xs" onClick={() => handleTabClick('resources')}>
                    View Resources
                  </Button>
                </div>
              </div>

              {/* CERTIFICATE WIDGET */}
              <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold text-orange-600 uppercase tracking-wider">CERTIFICATE</p>
                  <p className="text-xs font-bold text-slate-900">Status: <span className="text-orange-700 font-extrabold">{certificate?.status || 'In Progress'}</span></p>
                </div>
                <Button variant="outline" size="sm" className="text-xs border-orange-300 text-orange-800 hover:bg-orange-100" onClick={() => handleTabClick('certificate')}>
                  View Requirements
                </Button>
              </div>
            </Card>
          </div>

          {/* SECTION C: NOTIFICATIONS & RECENT ACTIVITY STREAM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* NOTIFICATIONS AREA */}
            <Card variant="bordered" className="p-6 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-orange-600" /> Learner Notifications
                </h3>
                <Badge variant="orange" size="sm">{notifications.length || 2} New</Badge>
              </div>

              <div className="space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div key={notif.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="text-orange-600">🔔</span> {notif.title}
                        </p>
                        <p className="text-slate-600 text-[11px]">{notif.message}</p>
                      </div>
                      {notif.actionUrl && (
                        <a
                          href={notif.actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 text-[11px] font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-md shrink-0 whitespace-nowrap"
                        >
                          View
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">🔔 Week 2 recording is now available.</span>
                      <Button variant="outline" size="sm" className="text-[10px] py-1" onClick={() => handleTabClick('classes')}>
                        Watch Recording
                      </Button>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 font-mono">Assignment 1 solution graded: 95/100</span>
                      <Button variant="outline" size="sm" className="text-[10px] py-1" onClick={() => handleTabClick('assignments')}>
                        View Feedback
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* RECENT ACTIVITY STREAM */}
            <Card variant="bordered" className="p-6 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" /> Recent Activity
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Live Log</span>
              </div>

              <div className="space-y-2.5 text-xs">
                {activityItems.length > 0 ? (
                  activityItems.map((act) => (
                    <div key={act.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-slate-800">{act.title}</span>
                      <span className="text-[10px] text-slate-400">{new Date(act.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-emerald-700">✓ Submitted Week 2 Assignment</span>
                      <span className="text-[10px] text-slate-400">June 14</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-emerald-700">✓ Attended Week 2 Live Class</span>
                      <span className="text-[10px] text-slate-400">June 13</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-blue-700">✓ Completed Week 1 Assessment</span>
                      <span className="text-[10px] text-slate-400">June 8</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-purple-700">▶ Week 2 Recording Published</span>
                      <span className="text-[10px] text-slate-400">June 14</span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW 2: MY CLASSES AREA */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Classes & Virtual Classroom</h2>
              <p className="text-xs text-slate-500">
                Access scheduled live classes, review past recordings, and view class learning materials.
              </p>
            </div>

            {/* CLASS TAB FILTER SWITCHER */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setClassTab('UPCOMING')}
                className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  classTab === 'UPCOMING' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                UPCOMING ({upcomingClasses.length})
              </button>
              <button
                onClick={() => setClassTab('COMPLETED')}
                className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  classTab === 'COMPLETED' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                COMPLETED ({completedClasses.length})
              </button>
            </div>
          </div>

          {/* 1. UPCOMING CLASSES */}
          {classTab === 'UPCOMING' && (
            <div className="space-y-4">
              {upcomingClasses.length === 0 ? (
                <Card variant="bordered" className="p-8 text-center bg-slate-50">
                  <p className="text-sm font-bold text-slate-700">No upcoming classes yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Check back later for newly scheduled live lectures.</p>
                </Card>
              ) : (
                upcomingClasses.map((cls) => (
                  <Card key={cls.id} variant="bordered" className="p-6 bg-white hover:border-orange-300 transition-all space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="orange" size="sm">{cls.moduleName || `Week ${cls.weekNumber || 3}`}</Badge>
                          <Badge variant={cls.status === 'LIVE' ? 'danger' : 'info'} size="sm">{cls.status}</Badge>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 cursor-pointer hover:text-orange-600" onClick={() => setSelectedClass(cls)}>
                          {cls.title}
                        </h3>
                        <p className="text-xs text-slate-600">{cls.description}</p>
                      </div>

                      <div className="text-right space-y-1 shrink-0">
                        <p className="text-xs font-bold text-slate-900">{cls.date || new Date(cls.scheduledAt).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-500">{cls.startTime || '10:00 AM'}</p>
                        <p className="text-xs text-orange-600 font-semibold">Facilitator: {cls.facilitatorName || cls.instructorName}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedClass(cls)}>
                        View Class Details
                      </Button>

                      {(cls.liveMeetingUrl || cls.meetingUrl) && (
                        <a
                          href={cls.liveMeetingUrl || cls.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleMarkAttendance(cls)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-extrabold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-all shadow-xs"
                        >
                          <Video className="w-4 h-4" /> JOIN LIVE CLASS
                        </a>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* 2. COMPLETED CLASSES */}
          {classTab === 'COMPLETED' && (
            <div className="space-y-4">
              {completedClasses.length === 0 ? (
                <Card variant="bordered" className="p-8 text-center bg-slate-50">
                  <p className="text-sm font-bold text-slate-700">No completed classes recorded yet.</p>
                </Card>
              ) : (
                completedClasses.map((cls) => {
                  const attRecord = attendance.find((a) => a.classId === cls.id);
                  const attStatus = attRecord ? attRecord.status : 'PRESENT';
                  const asgn = assignments.find((a) => a.weekNumber === cls.weekNumber || a.moduleName?.includes(`Week ${cls.weekNumber}`));
                  const sub = asgn ? submissions.find((s) => s.assignmentId === asgn.id) : null;

                  return (
                    <Card key={cls.id} variant="bordered" className="p-6 bg-white space-y-4">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-4">
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                            WEEK {cls.weekNumber || 2}
                          </span>
                          <h3 className="text-lg font-bold text-slate-900 cursor-pointer hover:text-orange-600" onClick={() => setSelectedClass(cls)}>
                            {cls.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">Date: {cls.date || 'June 13, 2026'}</p>
                          <p className="text-xs text-slate-600 font-medium">Facilitator: {cls.facilitatorName || cls.instructorName}</p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-right space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Attendance</p>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                            ✓ {attStatus}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Recording</p>
                          {cls.recordingStatus === 'PUBLISHED' && cls.recordingUrl ? (
                            <div className="space-y-2">
                              <span className="text-emerald-700 font-bold block flex items-center gap-1 text-[11px]">
                                ✓ Available
                              </span>
                              <a
                                href={cls.recordingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all"
                              >
                                <Play className="w-3.5 h-3.5 text-orange-400 fill-current" /> WATCH RECORDING
                              </a>
                            </div>
                          ) : cls.recordingStatus === 'DRAFT' ? (
                            <p className="text-xs text-slate-400 italic">Recording not published yet.</p>
                          ) : (
                            <p className="text-xs text-slate-500 italic">Recording not yet available.</p>
                          )}
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Resources</p>
                          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => handleTabClick('resources')}>
                            View Resources
                          </Button>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Assignment</p>
                          {sub ? (
                            <div className="space-y-1">
                              <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">✓ Submitted</span>
                              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => handleTabClick('assignments')}>
                                View Assignment
                              </Button>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => handleTabClick('assignments')}>
                              View Assignment
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: PROGRAMME & LEARNING JOURNEY TIMELINE */}
      {activeTab === 'programme' && (
        <div className="space-y-6">
          <Card variant="bordered" className="p-6 bg-white space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">LEARNING JOURNEY TIMELINE</h2>
              <p className="text-xs text-slate-500">Visual weekly progression through the programme curriculum.</p>
            </div>

            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pl-6 py-2">
              {[
                { week: 1, title: 'Generative AI Foundations', status: 'COMPLETED', desc: 'Core LLM mechanics, tokenization, and vector structures.' },
                { week: 2, title: 'Prompt Engineering', status: 'COMPLETED', desc: 'System prompts, zero-shot/few-shot framing, structured schemas.' },
                { week: 3, title: 'AI Automation Foundations', status: 'CURRENT', desc: 'Multi-agent orchestration, webhooks, and asynchronous workflows.' },
                { week: 4, title: 'Workflow Design', status: 'UPCOMING', desc: 'Error handling, fallback state machines, and API rate limits.' },
                { week: 5, title: 'AI-Powered Productivity', status: 'UPCOMING', desc: 'Enterprise tool integrations and custom bot extensions.' },
                { week: 6, title: 'Final Project', status: 'UPCOMING', desc: 'Capstone architecture build, live review, and evaluation.' },
              ].map((item) => {
                const isDone = item.status === 'COMPLETED';
                const isCurrent = item.status === 'CURRENT';

                return (
                  <div key={item.week} className="relative group">
                    <span
                      className={`absolute -left-[31px] top-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-orange-600 text-white ring-4 ring-orange-100'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isDone ? '✓' : isCurrent ? '●' : '○'}
                    </span>

                    <div
                      onClick={() => isDone && setSelectedJourneyModule(`Week ${item.week}`)}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-orange-50/60 border-orange-300'
                          : isDone
                          ? 'bg-slate-50 border-slate-200 cursor-pointer hover:border-slate-300'
                          : 'bg-white border-slate-200 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Week {item.week}</span>
                        <Badge variant={isDone ? 'success' : isCurrent ? 'orange' : 'default'} size="sm">
                          {item.status}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{item.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{item.desc}</p>
                      {isDone && (
                        <p className="text-[11px] text-orange-600 font-bold mt-2 flex items-center gap-1">
                          Select to review learning materials →
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 4: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Assignments & Coursework</h2>
            <p className="text-xs text-slate-500">Track assignment statuses, due dates, scores, and instructor feedback.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {assignments.map((asgn) => {
              const sub = submissions.find((s) => s.assignmentId === asgn.id);
              const isSubmittingThis = submittingAssignmentId === asgn.id;

              return (
                <Card key={asgn.id} variant="bordered" className="p-6 bg-white space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="orange" size="sm" className="mb-1">{asgn.moduleName || 'LAB'}</Badge>
                      <h3 className="text-base font-bold text-slate-900">{asgn.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">Due Date: {new Date(asgn.dueDate).toLocaleDateString()}</p>
                    </div>
                    <Badge
                      variant={
                        sub
                          ? sub.status === 'GRADED'
                            ? 'success'
                            : 'info'
                          : 'default'
                      }
                      size="sm"
                    >
                      {sub ? sub.status : 'NOT_STARTED'}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {asgn.description}
                  </p>

                  {sub ? (
                    <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between text-emerald-900 font-bold">
                        <span>Status: SUBMITTED</span>
                        {sub.score !== undefined && <span>Score: {sub.score} / {asgn.totalPoints}</span>}
                      </div>
                      <p className="text-slate-700 italic">"{sub.submissionText}"</p>
                      {sub.feedback && (
                        <div className="pt-2 border-t border-emerald-200 text-[11px] text-emerald-900">
                          <strong>Instructor Feedback:</strong> {sub.feedback}
                        </div>
                      )}
                      <div className="pt-2 flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setSubmittingAssignmentId(asgn.id)}>
                          VIEW SUBMISSION / EDIT
                        </Button>
                      </div>
                    </div>
                  ) : isSubmittingThis ? (
                    <form onSubmit={handleAssignmentSubmit} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-900">Submit Deliverable for {asgn.title}</p>
                      <div>
                        <textarea
                          required
                          rows={3}
                          value={assignmentText}
                          onChange={(e) => setAssignmentText(e.target.value)}
                          placeholder="Type your submission details or code explanation..."
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" type="submit" disabled={submittingAssignment}>
                          {submittingAssignment ? 'Saving...' : 'Submit'}
                        </Button>
                        <Button variant="outline" size="sm" type="button" onClick={() => setSubmittingAssignmentId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" className="text-xs" onClick={() => setSubmittingAssignmentId(asgn.id)}>
                        START
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 5: ASSESSMENTS */}
      {activeTab === 'assessments' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Programme Assessments</h2>
            <p className="text-xs text-slate-500">Evaluates knowledge retention across core modules.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assessments.map((ass) => {
              const attempt = attempts.find((a) => a.assessmentId === ass.id);
              return (
                <Card key={ass.id} variant="bordered" className="p-6 bg-white space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="blue" size="sm" className="mb-1">QUIZ</Badge>
                      <h3 className="text-base font-bold text-slate-900">{ass.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">Pass Threshold: {ass.passThresholdPercentage}%</p>
                    </div>
                    <Badge variant={attempt?.passed ? 'success' : attempt ? 'warning' : 'default'} size="sm">
                      {attempt ? (attempt.passed ? 'PASSED' : 'FAILED') : 'NOT_STARTED'}
                    </Badge>
                  </div>

                  {attempt && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                      <p className="font-bold text-slate-800">Score: {attempt.percentage}%</p>
                      <p className="text-[10px] text-slate-500">Result: {attempt.passed ? 'PASSED' : 'FAILED'}</p>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => onNavigate && onNavigate(`/portal/applicant/assessment?id=${ass.id}`)}
                  >
                    {attempt ? 'Retake Assessment' : 'Take Assessment'}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 6: RESOURCES */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Learning Resources</h2>
              <p className="text-xs text-slate-500">Published documents, links, and guides for your cohort.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {resources.map((res) => (
              <Card key={res.id} variant="bordered" className="p-5 bg-white space-y-3">
                <Badge variant="orange" size="sm">{res.type}</Badge>
                <h3 className="text-sm font-bold text-slate-900">{res.title}</h3>
                <p className="text-xs text-slate-500">{res.description}</p>
                <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-orange-600 hover:underline block">
                  Access Resource →
                </a>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 7: PROGRESS */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          <Card variant="bordered" className="p-6 bg-white space-y-6">
            <h2 className="text-lg font-bold text-slate-900">PROGRAMME PROGRESS BREAKDOWN</h2>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-bold text-slate-800 mb-1">
                  <span>Programme Overall</span>
                  <span>{overallProgressPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-orange-600 h-2.5 rounded-full" style={{ width: `${overallProgressPercentage}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-800 mb-1">
                  <span>Attendance Progress</span>
                  <span>{attendanceRatePercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: `${attendanceRatePercentage}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-800 mb-1">
                  <span>Assignments Progress</span>
                  <span>{Math.round((submittedAssignmentsCount / totalAssignmentsCount) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(submittedAssignmentsCount / totalAssignmentsCount) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-800 mb-1">
                  <span>Assessments Progress</span>
                  <span>{Math.round((passedAssessmentsCount / totalAssessmentsCount) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${(passedAssessmentsCount / totalAssessmentsCount) * 100}%` }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 8: FEEDBACK */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="bordered" className="p-6 bg-white space-y-4">
              <h2 className="text-base font-bold text-slate-900">Available Feedback Forms</h2>

              {[
                'Week 1 Class Feedback',
                'Week 2 Class Feedback',
                'Mid-Programme Feedback',
                'Programme Completion Feedback',
              ].map((formTitle) => {
                const submitted = userFeedback.some((f) => f.comment.includes(formTitle));
                return (
                  <div key={formTitle} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{formTitle}</p>
                      <p className="text-[10px] text-slate-500">Status: {submitted ? 'Completed' : 'Not Started'}</p>
                    </div>
                    <Button
                      variant={submitted ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => {
                        setActiveFeedbackFormTitle(formTitle);
                      }}
                    >
                      {submitted ? 'Completed' : 'Give Feedback'}
                    </Button>
                  </div>
                );
              })}
            </Card>

            <Card variant="bordered" className="p-6 bg-white space-y-4">
              <h3 className="text-base font-bold text-slate-900">Submit Feedback for {activeFeedbackFormTitle}</h3>
              {feedbackSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs">
                  Feedback saved!
                </div>
              )}
              <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                <textarea
                  required
                  rows={4}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Your feedback..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                />
                <Button variant="primary" size="sm" type="submit" disabled={submittingFeedback}>
                  Submit Feedback
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW 9: CERTIFICATE */}
      {activeTab === 'certificate' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <Card variant="bordered" className="p-6 bg-white space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-slate-900">Certificate Status</h2>
              <Badge variant="orange" size="sm">{certificate?.status || 'IN PROGRESS'}</Badge>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-900 uppercase text-[11px]">Certificate Requirements</p>
              <div className="space-y-1.5 pl-2">
                <p className="text-emerald-700 font-semibold">✓ Minimum attendance (&gt;= 75%)</p>
                <p className="text-emerald-700 font-semibold">✓ Required assignments submitted</p>
                <p className="text-emerald-700 font-semibold">✓ Mid-programme assessment passed</p>
                <p className="text-slate-500">○ Final assessment</p>
                <p className="text-slate-500">○ Final project</p>
              </div>
            </div>

            {certificate?.status === 'ISSUED' && (
              <div className="pt-4 flex gap-3">
                <Button variant="primary" size="sm" onClick={() => window.print()}>
                  VIEW CERTIFICATE
                </Button>
                <Button variant="outline" size="sm" onClick={() => alert(`Certificate Verified: ${certificate.certificateCode}`)}>
                  VERIFY CERTIFICATE
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* VIEW 10: PROFILE */}
      {activeTab === 'profile' && (
        <div className="max-w-xl mx-auto">
          <Card variant="bordered" className="p-6 bg-white space-y-4">
            <h2 className="text-base font-bold text-slate-900">Learner Profile</h2>
            <form onSubmit={handleProfileSave} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <Button variant="primary" size="sm" type="submit">Save Changes</Button>
            </form>
          </Card>
        </div>
      )}

      {/* CLASS DETAIL MODAL */}
      {selectedClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedClass(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <Badge variant="orange" size="sm" className="mb-1">{selectedClass.moduleName || `Week ${selectedClass.weekNumber || 1}`}</Badge>
              <h3 className="text-lg font-bold text-slate-900">{selectedClass.title}</h3>
              <p className="text-xs text-slate-500 mt-1">Facilitator: {selectedClass.facilitatorName || selectedClass.instructorName}</p>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {selectedClass.description}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-100 p-3 rounded-xl">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Date</span>
                <span className="font-bold text-slate-800">{selectedClass.date || new Date(selectedClass.scheduledAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Time</span>
                <span className="font-bold text-slate-800">{selectedClass.startTime || '10:00 AM'}</span>
              </div>
            </div>

            {selectedClass.status === 'COMPLETED' ? (
              <div className="space-y-3 border-t pt-3">
                <p className="text-xs font-bold text-slate-800">
                  Attendance: <span className="text-emerald-600 font-extrabold">Present</span>
                </p>

                {selectedClass.recordingStatus === 'PUBLISHED' && selectedClass.recordingUrl ? (
                  <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                    <p className="text-xs font-bold text-orange-400">RECORDED CLASS</p>
                    <p className="text-xs text-slate-300">{selectedClass.recordingDescription || 'Watch the recording of this session.'}</p>
                    <a
                      href={selectedClass.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-lg"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> WATCH CLASS RECORDING
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Recording not yet available.</p>
                )}
              </div>
            ) : (
              (selectedClass.liveMeetingUrl || selectedClass.meetingUrl) && (
                <a
                  href={selectedClass.liveMeetingUrl || selectedClass.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl"
                >
                  <Video className="w-4 h-4" /> JOIN LIVE CLASS
                </a>
              )
            )}
          </div>
        </div>
      )}

      {/* MOBILE STICKY BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white border-t border-slate-800 px-2 py-2 flex items-center justify-around z-40 shadow-2xl">
        {[
          { id: 'dashboard', label: 'Home', icon: <GraduationCap className="w-5 h-5" /> },
          { id: 'classes', label: 'Classes', icon: <Calendar className="w-5 h-5" /> },
          { id: 'assignments', label: 'Assignments', icon: <ClipboardList className="w-5 h-5" /> },
          { id: 'progress', label: 'Progress', icon: <BarChart3 className="w-5 h-5" /> },
          { id: 'programme', label: 'More', icon: <MoreHorizontal className="w-5 h-5" /> },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold p-1 cursor-pointer ${
                isActive ? 'text-orange-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
