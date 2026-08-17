import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  NotificationEventType,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationTemplate,
  NotificationLog,
  SendNotificationPayload,
  Programme,
  Cohort,
  Enrolment,
} from '../types';
import {
  subscribeToNotificationLogs,
  subscribeToNotificationTemplates,
  saveNotificationTemplate,
  resetDefaultNotificationTemplates,
  deleteNotificationLog,
  simulateDeliveryEvent,
  notificationService,
  interpolateTemplate,
} from '../services/notifications';
import { getProgrammes, getCohorts } from '../services/programmes';
import { subscribeToAllEnrolments } from '../services/learners';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import {
  Mail,
  MessageSquare,
  Bell,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Eye,
  Trash2,
  Edit3,
  Sliders,
  Sparkles,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Users,
  Award,
  Calendar,
  ClipboardList,
  HelpCircle,
  FileText,
} from 'lucide-react';

export const PMNotificationDashboard: React.FC = () => {
  const { userProfile } = useAuth();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'logs' | 'templates' | 'broadcast' | 'config'>('logs');

  // Real-time data states
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters for logs
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal / Drawer States
  const [viewingLog, setViewingLog] = useState<NotificationLog | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [templatePreviewVars, setTemplatePreviewVars] = useState<Record<string, string>>({});
  const [templateActiveView, setTemplateActiveView] = useState<'preview' | 'html' | 'text' | 'whatsapp'>('preview');

  // Broadcast / Dispatch Form State
  const [broadcastEvent, setBroadcastEvent] = useState<NotificationEventType>('class_reminder');
  const [broadcastChannel, setBroadcastChannel] = useState<NotificationChannel>('EMAIL');
  const [broadcastTargetType, setBroadcastTargetType] = useState<'single' | 'cohort' | 'all_learners'>('single');
  const [targetCohortId, setTargetCohortId] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({});
  const [isSendingBroadcast, setIsSendingBroadcast] = useState<boolean>(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  // Provider Settings State
  const [emailSenderName, setEmailSenderName] = useState<string>(() => notificationService.getEmailProvider().getConfig().senderName || 'NextGen Class Platform');
  const [emailSenderAddress, setEmailSenderAddress] = useState<string>(() => notificationService.getEmailProvider().getConfig().senderEmail || 'admissions@nextgenclass.org');
  const [emailReplyTo, setEmailReplyTo] = useState<string>(() => notificationService.getEmailProvider().getConfig().replyTo || 'support@nextgenclass.org');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState<string>(() => notificationService.getWhatsAppProvider().getConfig().phoneNumberId || '');
  const [whatsappAccountId, setWhatsappAccountId] = useState<string>(() => notificationService.getWhatsAppProvider().getConfig().businessAccountId || '');
  const [whatsappToken, setWhatsappToken] = useState<string>(() => notificationService.getWhatsAppProvider().getConfig().apiToken || '');
  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(() => notificationService.getWhatsAppProvider().isEnabled);
  const [configSavedNotice, setConfigSavedNotice] = useState<boolean>(false);
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState<boolean>(false);
  const [whatsAppTestResult, setWhatsAppTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);


  useEffect(() => {
    let unsubLogs: () => void;
    let unsubTemplates: () => void;
    let unsubEnrolments: () => void;

    const loadData = async () => {
      setLoading(true);
      try {
        const [progsData, cohortsData] = await Promise.all([
          getProgrammes(),
          getCohorts(),
        ]);
        setProgrammes(progsData);
        setCohorts(cohortsData);
        if (cohortsData.length > 0) {
          setTargetCohortId(cohortsData[0].id);
        }

        unsubLogs = subscribeToNotificationLogs((logsList) => {
          setLogs(logsList);
        });

        unsubTemplates = subscribeToNotificationTemplates((tmplList) => {
          setTemplates(tmplList);
        });

        unsubEnrolments = subscribeToAllEnrolments((enrList) => {
          setEnrolments(enrList);
        });
      } catch (err) {
        console.error('Error loading notification dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (unsubLogs) unsubLogs();
      if (unsubTemplates) unsubTemplates();
      if (unsubEnrolments) unsubEnrolments();
    };
  }, []);

  // Sync template preview variables when opening template editor
  useEffect(() => {
    if (editingTemplate) {
      const vars: Record<string, string> = {
        recipientName: 'Alex Morgan',
        programmeName: 'Generative AI & Automation',
        cohortName: 'Cohort 2026-A (Alpha)',
        applicationId: 'APP-2026-8812',
        submissionDate: new Date().toLocaleDateString(),
        startDate: 'October 12, 2026',
        deadline: 'Friday, 11:59 PM',
        token: 'INV-ALPHA-892K',
        assessmentTitle: 'Technical Readiness & Aptitude Test',
        durationMinutes: '45',
        passThreshold: '75',
        learnerId: 'LNR-2026-904',
        classTitle: 'Agentic AI Architecture & Function Calling',
        classTime: 'Tomorrow at 4:00 PM WAT',
        instructorName: 'Dr. Adeyemi Adeleke',
        meetingUrl: 'https://meet.nextgenclass.org/live/cohort-a',
        assignmentTitle: 'Module 3: Autonomous Agent Lab Submission',
        dueDate: 'Sunday, 11:59 PM',
        maxPoints: '100',
        moduleTitle: 'Module 4: RAG Pipeline Optimization',
        verificationCode: 'NGC-CERT-9948-2026',
        issueDate: new Date().toLocaleDateString(),
        gradeHonors: 'Distinction (Top 5%)',
        certificateUrl: `${window.location.origin}/portal/learner/certificate`,
        actionUrl: `${window.location.origin}/portal/learner/dashboard`,
      };
      setTemplatePreviewVars(vars);
    }
  }, [editingTemplate]);

  // Set default variables for broadcast form when event changes
  useEffect(() => {
    const defaults: Record<string, string> = {
      recipientName: recipientName || 'Valued Learner',
      programmeName: 'Generative AI & Automation',
      cohortName: cohorts.find((c) => c.id === targetCohortId)?.name || 'Cohort 2026-A',
      applicationId: `APP-${Date.now().toString().slice(-4)}`,
      submissionDate: new Date().toLocaleDateString(),
      startDate: 'Next Monday, 9:00 AM',
      deadline: 'In 3 Days',
      token: `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      assessmentTitle: 'Cohort Pre-Admission Quiz',
      durationMinutes: '45',
      passThreshold: '70',
      learnerId: `LNR-2026-${Math.floor(100 + Math.random() * 900)}`,
      classTitle: 'Live Workshop: Real-Time Stream Processing',
      classTime: 'Tomorrow, 5:00 PM GMT+1',
      instructorName: userProfile?.displayName || 'Lead Instructor',
      meetingUrl: 'https://meet.nextgenclass.org/live/session',
      assignmentTitle: 'Project Phase 1: Architecture Draft',
      dueDate: 'This Sunday at Midnight',
      maxPoints: '100',
      moduleTitle: 'Module 2: Advanced TypeScript & State Engines',
      verificationCode: `NGC-V-${Date.now().toString().slice(-6)}`,
      issueDate: new Date().toLocaleDateString(),
      gradeHonors: 'Passed with Distinction',
      certificateUrl: `${window.location.origin}/portal/learner/certificate`,
      actionUrl: `${window.location.origin}/portal/learner/dashboard`,
    };
    setCustomVariables(defaults);
  }, [broadcastEvent, targetCohortId, cohorts, recipientName, userProfile]);

  // Filtered Logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchTerm.trim() ||
      log.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.recipientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.recipientPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.providerMessageId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesChannel = selectedChannel === 'ALL' || log.channel === selectedChannel;
    const matchesEvent = selectedEvent === 'ALL' || log.event === selectedEvent;
    const matchesStatus = selectedStatus === 'ALL' || log.status === selectedStatus;

    return matchesSearch && matchesChannel && matchesEvent && matchesStatus;
  });

  // Metrics computation
  const totalCount = logs.length;
  const deliveredCount = logs.filter((l) => l.status === 'DELIVERED' || l.status === 'OPENED').length;
  const failedCount = logs.filter((l) => l.status === 'FAILED').length;
  const openedCount = logs.filter((l) => l.status === 'OPENED').length;
  const deliveryRate = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 100;
  const emailCount = logs.filter((l) => l.channel === 'EMAIL').length;
  const whatsappCount = logs.filter((l) => l.channel === 'WHATSAPP').length;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResendLog = async (logId: string) => {
    try {
      const res = await notificationService.resendNotification(logId);
      if (res.success) {
        alert('Notification re-sent successfully!');
      } else {
        alert(`Resend failed: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (confirm('Are you sure you want to delete this notification delivery log?')) {
      await deleteNotificationLog(logId);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      await saveNotificationTemplate(editingTemplate);
      setEditingTemplate(null);
      alert('Template updated successfully!');
    } catch (err: any) {
      alert(`Failed to save template: ${err.message}`);
    }
  };

  const handleResetTemplates = async () => {
    if (confirm('Reset all 11 notification templates to system default copy & layout?')) {
      await resetDefaultNotificationTemplates();
      alert('Templates reset to system defaults!');
    }
  };

  const handleSaveConfig = () => {
    notificationService.getEmailProvider().updateConfig({
      senderName: emailSenderName,
      senderEmail: emailSenderAddress,
      replyTo: emailReplyTo,
    });
    notificationService.getWhatsAppProvider().updateConfig({
      phoneNumberId: whatsappPhoneId,
      businessAccountId: whatsappAccountId,
      apiToken: whatsappToken,
      isEnabled: whatsappEnabled,
    });
    setConfigSavedNotice(true);
    setTimeout(() => setConfigSavedNotice(false), 3000);
  };

  const handleTestWhatsAppConnection = async () => {
    // Save current values first
    notificationService.getWhatsAppProvider().updateConfig({
      phoneNumberId: whatsappPhoneId,
      businessAccountId: whatsappAccountId,
      apiToken: whatsappToken,
      isEnabled: whatsappEnabled,
    });

    setIsTestingWhatsApp(true);
    setWhatsAppTestResult(null);
    try {
      const res = await notificationService.getWhatsAppProvider().testConnection();
      setWhatsAppTestResult(res);
    } catch (err: any) {
      setWhatsAppTestResult({
        success: false,
        message: err?.message || 'Connection test failed',
      });
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  // Execute manual broadcast or single send
  const handleExecuteBroadcast = async () => {
    setIsSendingBroadcast(true);
    setBroadcastSuccess(null);
    setBroadcastError(null);

    try {
      if (broadcastTargetType === 'single') {
        if (!recipientEmail && broadcastChannel === 'EMAIL') {
          throw new Error('Please enter a recipient email address.');
        }
        if (!recipientPhone && broadcastChannel === 'WHATSAPP') {
          throw new Error('Please enter a recipient mobile number for WhatsApp dispatch.');
        }

        const res = await notificationService.sendNotification({
          event: broadcastEvent,
          channel: broadcastChannel,
          recipientName: recipientName || 'Learner',
          recipientEmail: recipientEmail || 'learner@nextgenclass.org',
          recipientPhone: recipientPhone,
          variables: customVariables,
        });

        if (res.success) {
          setBroadcastSuccess(`Notification dispatched successfully via ${res.providerName}! [Log ID: ${res.logId}]`);
          setRecipientName('');
          setRecipientEmail('');
          setRecipientPhone('');
        } else {
          setBroadcastError(res.error || 'Failed to dispatch notification.');
        }
      } else {
        // Bulk / Cohort targets
        let targetLearners: Array<{ name: string; email: string; phone?: string }> = [];

        if (broadcastTargetType === 'cohort') {
          const cohortEnrolments = enrolments.filter((e) => e.cohortId === targetCohortId);
          if (cohortEnrolments.length === 0) {
            // Seed a fallback list if no active enrolments in state
            targetLearners = [
              { name: 'Alex Morgan', email: 'alex.m@example.com', phone: '+2348031234567' },
              { name: 'David Okonjo', email: 'david.o@example.com', phone: '+2348029876543' },
              { name: 'Chiamaka Nnadi', email: 'chiamaka.n@example.com', phone: '+2348035551234' },
            ];
          } else {
            targetLearners = cohortEnrolments.map((e) => ({
              name: e.userName || 'Learner',
              email: e.userEmail || 'learner@nextgenclass.org',
            }));
          }
        } else {
          // All learners
          targetLearners = enrolments.length > 0
            ? enrolments.map((e) => ({ name: e.userName || 'Learner', email: e.userEmail || 'learner@nextgenclass.org' }))
            : [
                { name: 'Alex Morgan', email: 'alex.m@example.com' },
                { name: 'David Okonjo', email: 'david.o@example.com' },
                { name: 'Chiamaka Nnadi', email: 'chiamaka.n@example.com' },
              ];
        }

        let sentCount = 0;
        for (const learner of targetLearners) {
          await notificationService.sendNotification({
            event: broadcastEvent,
            channel: broadcastChannel,
            recipientName: learner.name,
            recipientEmail: learner.email,
            recipientPhone: learner.phone,
            variables: {
              ...customVariables,
              recipientName: learner.name,
            },
          });
          sentCount++;
        }

        setBroadcastSuccess(`Successfully broadcasted ${sentCount} notifications across ${broadcastChannel}!`);
      }
    } catch (err: any) {
      setBroadcastError(err.message || 'Dispatch failed.');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const getEventBadge = (event: NotificationEventType) => {
    switch (event) {
      case 'application_received':
        return <Badge variant="neutral" className="bg-orange-50 text-orange-700 border-orange-200">Application Received</Badge>;
      case 'qualified':
        return <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200">Qualified</Badge>;
      case 'assessment_invitation':
        return <Badge variant="primary" className="bg-blue-50 text-blue-700 border-blue-200">Assessment Invite</Badge>;
      case 'assessment_reminder':
        return <Badge variant="warning" className="bg-amber-50 text-amber-700 border-amber-200">Assessment Reminder</Badge>;
      case 'acceptance':
        return <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">Acceptance Offer</Badge>;
      case 'rejection':
        return <Badge variant="danger" className="bg-rose-50 text-rose-700 border-rose-200">Rejection Notice</Badge>;
      case 'enrolment':
        return <Badge variant="primary" className="bg-sky-50 text-sky-700 border-sky-200">Enrolment Welcome</Badge>;
      case 'class_reminder':
        return <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">Class Reminder</Badge>;
      case 'assignment_reminder':
        return <Badge variant="warning" className="bg-amber-50 text-amber-800 border-amber-300">Assignment Reminder</Badge>;
      case 'feedback_reminder':
        return <Badge variant="neutral" className="bg-indigo-50 text-indigo-700 border-indigo-200">Feedback Reminder</Badge>;
      case 'certificate_issued':
        return <Badge variant="warning" className="bg-yellow-50 text-yellow-800 border-yellow-300">Certificate Issued</Badge>;
      default:
        return <Badge variant="neutral">{event}</Badge>;
    }
  };

  const getChannelBadge = (channel: NotificationChannel) => {
    switch (channel) {
      case 'EMAIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Mail className="w-3 h-3" /> Email
          </span>
        );
      case 'WHATSAPP':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Smartphone className="w-3 h-3" /> WhatsApp
          </span>
        );
      case 'IN_APP':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Bell className="w-3 h-3" /> In-App
          </span>
        );
      default:
        return <Badge variant="neutral">{channel}</Badge>;
    }
  };

  const getStatusBadge = (status: NotificationDeliveryStatus) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200">Delivered</Badge>;
      case 'SENT':
        return <Badge variant="primary" className="bg-blue-50 text-blue-700 border-blue-200">Sent</Badge>;
      case 'OPENED':
        return <Badge variant="success" className="bg-teal-100 text-teal-800 border-teal-300 font-semibold">Opened</Badge>;
      case 'QUEUED':
        return <Badge variant="warning" className="bg-amber-50 text-amber-700 border-amber-200">Queued</Badge>;
      case 'FAILED':
        return <Badge variant="danger" className="bg-rose-50 text-rose-700 border-rose-200">Failed</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Spinner size="lg" label="Loading notification service & audit logs..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500 text-white uppercase tracking-wider">
                Module 20
              </span>
              <span className="text-slate-300 text-xs font-medium">Multi-Channel Service Architecture</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notification Service & Logs</h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Centralized notification infrastructure supporting 11 lifecycle events, reusable email & WhatsApp templates, delivery auditing, and extensible messaging providers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('broadcast')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <Send className="w-4 h-4 mr-2" />
              Send / Trigger Alert
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('templates')}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Manage Templates
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-700/60">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/40">
            <div className="text-xs text-slate-400 font-medium">Total Dispatched</div>
            <div className="text-2xl font-bold text-white mt-1">{totalCount}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>All recorded events</span>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/40">
            <div className="text-xs text-slate-400 font-medium">Delivery Success Rate</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{deliveryRate}%</div>
            <div className="text-[11px] text-emerald-300/80 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {deliveredCount} delivered / opened
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/40">
            <div className="text-xs text-slate-400 font-medium">Active Channels</div>
            <div className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Email: {emailCount}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">WhatsApp: {whatsappCount}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Multi-channel routing</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/40">
            <div className="text-xs text-slate-400 font-medium">Supported Events</div>
            <div className="text-2xl font-bold text-orange-400 mt-1">11 Events</div>
            <div className="text-[11px] text-slate-400 mt-1">Automated lifecycle hooks</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 overflow-x-auto pb-px">
        <div className="flex space-x-2 sm:space-x-4">
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Delivery Logs & Audit ({logs.length})
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'templates'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            Reusable Templates ({templates.length})
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'broadcast'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Send className="w-4 h-4" />
            Trigger & Broadcast
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'config'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Channel & Provider Architecture
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DELIVERY LOGS & AUDIT TRAIL */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* Filters Row */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-80 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search recipient, subject, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="ALL">All Channels</option>
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="IN_APP">In-App</option>
              </select>

              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="ALL">All 11 Events</option>
                <option value="application_received">Application Received</option>
                <option value="qualified">Qualified</option>
                <option value="assessment_invitation">Assessment Invite</option>
                <option value="assessment_reminder">Assessment Reminder</option>
                <option value="acceptance">Acceptance Offer</option>
                <option value="rejection">Rejection Notice</option>
                <option value="enrolment">Enrolment Welcome</option>
                <option value="class_reminder">Class Reminder</option>
                <option value="assignment_reminder">Assignment Reminder</option>
                <option value="feedback_reminder">Feedback Reminder</option>
                <option value="certificate_issued">Certificate Issued</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="DELIVERED">Delivered</option>
                <option value="OPENED">Opened</option>
                <option value="SENT">Sent</option>
                <option value="QUEUED">Queued</option>
                <option value="FAILED">Failed</option>
              </select>

              {(searchTerm || selectedChannel !== 'ALL' || selectedEvent !== 'ALL' || selectedStatus !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedChannel('ALL');
                    setSelectedEvent('ALL');
                    setSelectedStatus('ALL');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Logs Table Card */}
          <Card className="overflow-hidden border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Event & Lifecycle Trigger</th>
                    <th className="py-3.5 px-4">Recipient</th>
                    <th className="py-3.5 px-4">Channel</th>
                    <th className="py-3.5 px-4">Subject / Message</th>
                    <th className="py-3.5 px-4">Delivery Status</th>
                    <th className="py-3.5 px-4">Time & Provider</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Bell className="w-8 h-8 text-slate-300" />
                          <p className="text-sm font-medium">No notification delivery logs found matching the filter.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab('broadcast')}
                            className="mt-2 text-xs"
                          >
                            Send a Test Notification
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            {getEventBadge(log.event)}
                            <div className="text-[11px] font-mono text-slate-400 truncate max-w-[140px]">
                              {log.id}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top">
                          <div className="font-semibold text-slate-900">{log.recipientName || 'Learner'}</div>
                          <div className="text-xs text-slate-500">{log.recipientEmail}</div>
                          {log.recipientPhone && (
                            <div className="text-[11px] text-slate-400">{log.recipientPhone}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          {getChannelBadge(log.channel)}
                        </td>

                        <td className="py-3.5 px-4 align-top max-w-xs">
                          <div className="font-medium text-slate-800 truncate" title={log.subject}>
                            {log.subject || '—'}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {log.body}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="space-y-1">
                            {getStatusBadge(log.status)}
                            {log.error && (
                              <div className="text-[11px] text-rose-600 max-w-[120px] truncate" title={log.error}>
                                {log.error}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="text-xs text-slate-600">
                            {log.sentAt ? new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[110px]" title={log.providerName}>
                            {log.providerName}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingLog(log)}
                              className="h-8 px-2.5 text-xs text-slate-700 hover:bg-slate-100"
                              title="Inspect Notification Payload & Preview"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendLog(log.id)}
                              className="h-8 px-2 text-xs text-slate-600 hover:text-orange-600"
                              title="Resend notification"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLog(log.id)}
                              className="h-8 px-2 text-xs text-slate-400 hover:text-rose-600"
                              title="Delete log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REUSABLE TEMPLATES MANAGER (ALL 11 EVENTS) */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">Configured Reusable Templates</h2>
              <p className="text-xs text-slate-500">
                11 standard lifecycle event templates with dynamic variable interpolation for Email and WhatsApp.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetTemplates}
                className="text-xs text-slate-600 hover:text-rose-600"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reset System Defaults
              </Button>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((tmpl) => (
              <Card
                key={tmpl.id}
                className="flex flex-col justify-between border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {getEventBadge(tmpl.event)}
                    {getChannelBadge(tmpl.channel)}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{tmpl.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tmpl.description}</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 text-xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Email Subject:
                    </div>
                    <div className="font-medium text-slate-800 line-clamp-1" title={tmpl.subject}>
                      {tmpl.subject}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Interpolated Variables:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tmpl.variables.slice(0, 4).map((v) => (
                        <span key={v} className="text-[10px] font-mono bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200/60">
                          {`{{${v}}}`}
                        </span>
                      ))}
                      {tmpl.variables.length > 4 && (
                        <span className="text-[10px] font-mono text-slate-400 px-1 py-0.5">
                          +{tmpl.variables.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Updated {new Date(tmpl.updatedAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setEditingTemplate(tmpl)}
                    className="text-xs bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                    Customize & Preview
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TRIGGER & BROADCAST CENTRE */}
      {/* ========================================================================= */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Dispatch Configuration Form */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900">Trigger Notification Alert</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select an event trigger, configure recipient targeting, and dispatch instantly with live status tracking.
                </p>
              </div>

              {broadcastSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>{broadcastSuccess}</div>
                </div>
              )}

              {broadcastError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <div>{broadcastError}</div>
                </div>
              )}

              {/* Event Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  1. Lifecycle Event Trigger (1 of 11)
                </label>
                <select
                  value={broadcastEvent}
                  onChange={(e) => setBroadcastEvent(e.target.value as NotificationEventType)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="class_reminder">Class Reminder (Live session alert & meeting link)</option>
                  <option value="assignment_reminder">Assignment Reminder (Upcoming coursework due date)</option>
                  <option value="feedback_reminder">Feedback Reminder (Module / Instructor survey)</option>
                  <option value="application_received">Application Received (Submission confirmation)</option>
                  <option value="qualified">Qualified (Eligibility screening cleared)</option>
                  <option value="assessment_invitation">Assessment Invitation (Pre-admission test token)</option>
                  <option value="assessment_reminder">Assessment Reminder (Pre-admission test deadline)</option>
                  <option value="acceptance">Acceptance Offer (Official admission offer letter)</option>
                  <option value="rejection">Rejection Notice (Admissions committee decision)</option>
                  <option value="enrolment">Enrolment Welcome (Cohort enrolment confirmed)</option>
                  <option value="certificate_issued">Certificate Issued (Graduation credential release)</option>
                </select>
              </div>

              {/* Channel Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  2. Dispatch Channel
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBroadcastChannel('EMAIL')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                      broadcastChannel === 'EMAIL'
                        ? 'border-orange-500 bg-orange-50 text-orange-800 ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-orange-600" />
                    <span>Email Gateway</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBroadcastChannel('WHATSAPP')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                      broadcastChannel === 'WHATSAPP'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp API</span>
                  </button>
                </div>
              </div>

              {/* Targeting Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  3. Target Audience
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={broadcastTargetType === 'single'}
                      onChange={() => setBroadcastTargetType('single')}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    Individual Candidate / Learner
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={broadcastTargetType === 'cohort'}
                      onChange={() => setBroadcastTargetType('cohort')}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    Cohort Batch ({cohorts.length} available)
                  </label>
                </div>
              </div>

              {/* Target Details Form */}
              {broadcastTargetType === 'single' ? (
                <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Recipient Name</label>
                      <Input
                        placeholder="e.g. Alex Morgan"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Recipient Email</label>
                      <Input
                        type="email"
                        placeholder="alex.morgan@example.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Recipient Mobile Phone (for WhatsApp)
                    </label>
                    <Input
                      type="tel"
                      placeholder="+234 803 123 4567"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <label className="block text-xs font-medium text-slate-600">Select Target Cohort</label>
                  <select
                    value={targetCohortId}
                    onChange={(e) => setTargetCohortId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:ring-orange-500"
                  >
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code || c.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic Variables Customizer */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  4. Template Variables Payload
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(customVariables).slice(0, 6).map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="text-[11px] font-mono text-slate-500">{`{{${k}}}`}</span>
                      <Input
                        value={v}
                        onChange={(e) =>
                          setCustomVariables((prev) => ({ ...prev, [k]: e.target.value }))
                        }
                        className="text-xs py-1.5 h-8 mt-0.5"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  variant="primary"
                  onClick={handleExecuteBroadcast}
                  disabled={isSendingBroadcast}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 font-semibold"
                >
                  {isSendingBroadcast ? (
                    <>
                      <Spinner size="sm" className="mr-2 text-white" />
                      Dispatching Alert...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Dispatch Notification
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* Live Preview Panel */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-orange-600" />
                Live Message Preview
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Channel: {broadcastChannel}
              </span>
            </div>

            <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div className="text-xs font-mono text-slate-400">
                  {broadcastChannel === 'EMAIL' ? 'HTML / Multipart Email' : 'WhatsApp HSM'}
                </div>
              </div>

              {broadcastChannel === 'EMAIL' ? (
                <div className="bg-white text-slate-800 rounded-xl p-4 text-xs font-sans space-y-3 max-h-[500px] overflow-y-auto">
                  <div className="border-b border-slate-100 pb-2">
                    <div className="text-slate-500">From: <strong className="text-slate-800">NextGen Class Admissions &lt;admissions@nextgenclass.org&gt;</strong></div>
                    <div className="text-slate-500">To: <strong className="text-slate-800">{recipientName || 'Alex Morgan'} &lt;{recipientEmail || 'alex.m@example.com'}&gt;</strong></div>
                    <div className="text-slate-500 mt-1">Subject: <strong className="text-orange-700">
                      {interpolateTemplate(
                        templates.find((t) => t.event === broadcastEvent)?.subject || 'Notification',
                        customVariables
                      )}
                    </strong></div>
                  </div>

                  <div
                    className="prose prose-sm max-w-none pt-2"
                    dangerouslySetInnerHTML={{
                      __html: interpolateTemplate(
                        templates.find((t) => t.event === broadcastEvent)?.bodyHtml || '<p>Preview</p>',
                        customVariables
                      ),
                    }}
                  />
                </div>
              ) : (
                <div className="bg-[#0b141a] p-4 rounded-xl">
                  <div className="max-w-[280px] bg-[#005c4b] text-white p-3 rounded-2xl rounded-tl-none shadow text-xs whitespace-pre-wrap leading-relaxed">
                    {interpolateTemplate(
                      templates.find((t) => t.event === broadcastEvent)?.whatsAppText ||
                        templates.find((t) => t.event === broadcastEvent)?.bodyText ||
                        'WhatsApp Message Body',
                      customVariables
                    )}
                    <div className="text-[10px] text-emerald-200 text-right mt-1.5 flex items-center justify-end gap-1">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <Check className="w-3 h-3 text-sky-300" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CHANNEL & PROVIDER ARCHITECTURE */}
      {/* ========================================================================= */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {configSavedNotice && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Provider gateway configurations saved successfully!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Provider Card */}
            <Card className="p-6 border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Email Gateway Provider</h3>
                    <p className="text-xs text-slate-500">Initial Primary Channel (Active)</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                  Active
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Sender Brand Name</label>
                  <Input
                    value={emailSenderName}
                    onChange={(e) => setEmailSenderName(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Sender Email Address (From:)</label>
                  <Input
                    value={emailSenderAddress}
                    onChange={(e) => setEmailSenderAddress(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Reply-To Address</label>
                  <Input
                    value={emailReplyTo}
                    onChange={(e) => setEmailReplyTo(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
                  <div className="font-semibold text-slate-700">Capabilities:</div>
                  <div>• Multipart HTML + text fallback rendering</div>
                  <div>• Automatic delivery state tracking (Delivered, Opened, Bounced)</div>
                  <div>• One-click retry on failure</div>
                </div>
              </div>
            </Card>

            {/* WhatsApp Provider Card (Extensible & Strictly Validated) */}
            <Card className="p-6 border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">WhatsApp Business API</h3>
                    <p className="text-xs text-slate-500">Meta Cloud Gateway Provider</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {notificationService.getWhatsAppProvider().isConfigured() && whatsappEnabled ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Configured & Active
                    </span>
                  ) : !whatsappEnabled ? (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                      Disabled
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Unconfigured
                    </span>
                  )}
                  <label className="relative inline-flex items-center cursor-pointer ml-1">
                    <input
                      type="checkbox"
                      checked={whatsappEnabled}
                      onChange={(e) => setWhatsappEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Status Alert Banner */}
              {!notificationService.getWhatsAppProvider().isConfigured() ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    Credentials Not Configured
                  </div>
                  <p className="text-[11px] text-amber-800">
                    If WhatsApp credentials (Phone Number ID & Meta Access Token) are not configured, delivery will <strong>NOT be faked</strong>. Dispatch attempts will record a failed status until real credentials are provided.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    Meta Cloud API Ready
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Real messages will be routed directly to recipient mobile numbers via Meta WhatsApp Cloud API.
                  </p>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">WhatsApp Phone Number ID</label>
                  <Input
                    placeholder="e.g. 104829104859102"
                    value={whatsappPhoneId}
                    onChange={(e) => setWhatsappPhoneId(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Business Account ID (WABA ID)</label>
                  <Input
                    placeholder="e.g. 192847192837192"
                    value={whatsappAccountId}
                    onChange={(e) => setWhatsappAccountId(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Meta System User Access Token</label>
                  <Input
                    type="password"
                    placeholder="e.g. EAAG..."
                    value={whatsappToken}
                    onChange={(e) => setWhatsappToken(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                {whatsAppTestResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                      whatsAppTestResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {whatsAppTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="text-[11px] leading-relaxed">
                      <strong>{whatsAppTestResult.success ? 'Meta API Connection Succeeded' : 'Meta API Connection Failed'}:</strong> {whatsAppTestResult.message}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestWhatsAppConnection}
                    disabled={isTestingWhatsApp}
                    className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    {isTestingWhatsApp ? (
                      <>
                        <Spinner size="sm" className="mr-1 text-emerald-700" />
                        Verifying with Meta API...
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-3.5 h-3.5 mr-1" />
                        Test WhatsApp API Connection
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800">WhatsApp Notification Capabilities:</div>
                  <div>• Supports Application, Assessment, Admission, Class & Assignment Reminders, Feedback & Certificates</div>
                  <div>• International E.164 Phone Normalization (+234, +1, +44)</div>
                  <div>• Direct WhatsApp markdown formatting (*bold*, _italic_)</div>
                  <div>• Explicit failure logging when unconfigured</div>
                </div>
              </div>
            </Card>

          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleSaveConfig}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Save Provider Configurations
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW LOG DETAILS & MESSAGE INSPECTOR */}
      {/* ========================================================================= */}
      {viewingLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Notification Delivery Inspector</h3>
                  <p className="text-xs text-slate-500 font-mono">{viewingLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingLog(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-400 font-medium">Lifecycle Event</div>
                  <div className="font-semibold text-slate-800 mt-0.5">{getEventBadge(viewingLog.event)}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Channel</div>
                  <div className="mt-0.5">{getChannelBadge(viewingLog.channel)}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Status</div>
                  <div className="mt-0.5">{getStatusBadge(viewingLog.status)}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Provider Ref</div>
                  <div className="font-mono text-slate-700 truncate mt-0.5" title={viewingLog.providerMessageId}>
                    {viewingLog.providerMessageId || '—'}
                  </div>
                </div>
              </div>

              {/* Recipient Details */}
              <div className="space-y-1">
                <div className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Recipient Information</div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                  <div><strong>Name:</strong> {viewingLog.recipientName}</div>
                  <div><strong>Email:</strong> {viewingLog.recipientEmail}</div>
                  {viewingLog.recipientPhone && <div><strong>Phone:</strong> {viewingLog.recipientPhone}</div>}
                  <div><strong>Subject:</strong> <span className="text-orange-700 font-medium">{viewingLog.subject}</span></div>
                </div>
              </div>

              {/* Message Content Tabs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Rendered Content</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => simulateDeliveryEvent(viewingLog.id, 'OPENED')}
                      className="text-[11px] px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded hover:bg-teal-100"
                    >
                      Simulate Recipient Opened
                    </button>
                  </div>
                </div>

                {viewingLog.bodyHtml ? (
                  <div
                    className="border border-slate-200 rounded-xl p-4 bg-white max-h-64 overflow-y-auto prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: viewingLog.bodyHtml }}
                  />
                ) : (
                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {viewingLog.body}
                  </pre>
                )}
              </div>

              {/* Payload Variables */}
              <div className="space-y-1">
                <div className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Template Variables Passed</div>
                <pre className="p-3 bg-slate-100 text-slate-800 rounded-lg font-mono text-[11px] overflow-x-auto">
                  {JSON.stringify(viewingLog.variables, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResendLog(viewingLog.id)}
                className="text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Resend Notification
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setViewingLog(null)}
                className="text-xs bg-slate-800 hover:bg-slate-900 text-white"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CUSTOMIZE TEMPLATE & PREVIEW */}
      {/* ========================================================================= */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Customize Template: {editingTemplate.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getEventBadge(editingTemplate.event)}
                    {getChannelBadge(editingTemplate.channel)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEditingTemplate(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Subject Input */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                  Email Subject Line
                </label>
                <Input
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  className="text-xs"
                />
              </div>

              {/* Variables Legend */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-600 uppercase">Available Variables (Click to Insert):</div>
                <div className="flex flex-wrap gap-1.5">
                  {(editingTemplate.variables || []).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setEditingTemplate({
                          ...editingTemplate,
                          bodyHtml: editingTemplate.bodyHtml + ` {{${v}}}`,
                          bodyText: editingTemplate.bodyText + ` {{${v}}}`,
                        });
                      }}
                      className="px-2 py-0.5 rounded bg-white text-orange-700 border border-orange-200 hover:bg-orange-50 font-mono text-[10px]"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* View Switcher */}
              <div className="flex gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setTemplateActiveView('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    templateActiveView === 'preview' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Visual Live Preview
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateActiveView('html')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    templateActiveView === 'html' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  HTML Markup Editor
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateActiveView('text')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    templateActiveView === 'text' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Plain Text Fallback
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateActiveView('whatsapp')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    templateActiveView === 'whatsapp' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  WhatsApp Text
                </button>
              </div>

              {/* View Content */}
              {templateActiveView === 'preview' && (
                <div
                  className="border border-slate-200 rounded-xl p-6 bg-white max-h-80 overflow-y-auto shadow-inner"
                  dangerouslySetInnerHTML={{
                    __html: interpolateTemplate(editingTemplate.bodyHtml, templatePreviewVars),
                  }}
                />
              )}

              {templateActiveView === 'html' && (
                <textarea
                  rows={12}
                  value={editingTemplate.bodyHtml}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, bodyHtml: e.target.value })}
                  className="w-full font-mono text-xs p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 focus:ring-2 focus:ring-orange-500"
                />
              )}

              {templateActiveView === 'text' && (
                <textarea
                  rows={10}
                  value={editingTemplate.bodyText}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, bodyText: e.target.value })}
                  className="w-full font-mono text-xs p-3 bg-slate-50 text-slate-800 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500"
                />
              )}

              {templateActiveView === 'whatsapp' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500">
                    Use WhatsApp markdown: <code>*bold*</code>, <code>_italics_</code>, <code>~strikethrough~</code>
                  </p>
                  <textarea
                    rows={8}
                    value={editingTemplate.whatsAppText || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, whatsAppText: e.target.value })}
                    className="w-full font-mono text-xs p-3 bg-[#0b141a] text-white rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingTemplate(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveTemplate}
                className="text-xs bg-orange-600 hover:bg-orange-700 text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Save & Apply Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
