import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  NotificationEventType,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationTemplate,
  NotificationLog,
  SendNotificationPayload,
  NotificationDeliveryResult,
  NotificationProviderConfig,
} from '../../types';
import { DEFAULT_NOTIFICATION_TEMPLATES, interpolateTemplate } from './templates';
import {
  NotificationProvider,
  INotificationProvider,
  NotificationPayload,
  ProviderStatusInfo,
} from './providers/NotificationProvider';
import { EmailProvider, EmailNotificationProvider } from './providers/EmailProvider';
import { WhatsAppProvider, WhatsAppNotificationProvider } from './providers/WhatsAppProvider';
import { InAppNotificationProvider } from './providers/InAppProvider';

const TEMPLATES_COLLECTION = 'notificationTemplates';
const LOGS_COLLECTION = 'notificationLogs';
const PROVIDERS_COLLECTION = 'notificationProviders';

class NotificationServiceEngine {
  private providers: Map<NotificationChannel, NotificationProvider[]> = new Map();
  private emailProvider: EmailProvider;
  private whatsAppProvider: WhatsAppProvider;
  private inAppProvider: InAppNotificationProvider;
  private inMemoryTemplates: Map<string, NotificationTemplate> = new Map();
  private templatesLoaded = false;

  constructor() {
    this.emailProvider = new EmailProvider();
    this.whatsAppProvider = new WhatsAppProvider();
    this.inAppProvider = new InAppNotificationProvider();

    this.registerProvider(this.emailProvider);
    this.registerProvider(this.whatsAppProvider);
    this.registerProvider(this.inAppProvider);

    // Populate in-memory fallback templates
    this.initFallbackTemplates();
  }

  private initFallbackTemplates() {
    const now = new Date().toISOString();
    DEFAULT_NOTIFICATION_TEMPLATES.forEach((tmpl, idx) => {
      const id = `${tmpl.event}_${tmpl.channel.toLowerCase()}`;
      this.inMemoryTemplates.set(id, {
        id,
        ...tmpl,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  public registerProvider(provider: NotificationProvider) {
    const list = this.providers.get(provider.channel) || [];
    // Remove if existing with same id
    const filtered = list.filter((p) => p.id !== provider.id);
    filtered.push(provider);
    this.providers.set(provider.channel, filtered);
  }

  public getProvider(channel: NotificationChannel): NotificationProvider | undefined {
    const list = this.providers.get(channel);
    return list?.find((p) => p.isEnabled) || list?.[0];
  }

  public getEmailProvider(): EmailProvider {
    return this.emailProvider;
  }

  public getWhatsAppProvider(): WhatsAppProvider {
    return this.whatsAppProvider;
  }

  public getAllProviders(): NotificationProvider[] {
    const all: NotificationProvider[] = [];
    this.providers.forEach((provList) => all.push(...provList));
    return all;
  }

  public getProviderStatus(channel: NotificationChannel): ProviderStatusInfo | null {
    const provider = this.getProvider(channel);
    return provider ? provider.getStatus() : null;
  }

  public getProviderStatuses(): Record<NotificationChannel, ProviderStatusInfo | null> {
    return {
      EMAIL: this.getProviderStatus('EMAIL'),
      WHATSAPP: this.getProviderStatus('WHATSAPP'),
      IN_APP: this.getProviderStatus('IN_APP'),
      SMS: null,
    };
  }

  /**
   * Seed templates into Firestore if collection is empty
   */
  public async seedDefaultTemplatesIfEmpty(): Promise<void> {
    try {
      const snap = await getDocs(collection(db, TEMPLATES_COLLECTION));
      if (snap.empty) {
        const now = new Date().toISOString();
        const promises = DEFAULT_NOTIFICATION_TEMPLATES.map((tmpl) => {
          const docId = `${tmpl.event}_${tmpl.channel.toLowerCase()}`;
          return setDoc(doc(db, TEMPLATES_COLLECTION, docId), {
            ...tmpl,
            id: docId,
            createdAt: now,
            updatedAt: now,
          });
        });
        await Promise.all(promises);
        console.log('[NotificationService] Seeded default notification templates');
      }
    } catch (err) {
      console.warn('[NotificationService] Error seeding templates (will use in-memory fallback):', err);
    }
  }

  /**
   * Fetch active template by event and channel
   */
  public async getTemplate(
    event: NotificationEventType,
    channel: NotificationChannel = 'EMAIL'
  ): Promise<NotificationTemplate | undefined> {
    const key = `${event}_${channel.toLowerCase()}`;
    
    // Check Firestore
    try {
      const docRef = doc(db, TEMPLATES_COLLECTION, key);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as NotificationTemplate;
        return { ...data, id: snap.id };
      }
    } catch (err) {
      // Fallback
    }

    // Fallback to in-memory template
    return this.inMemoryTemplates.get(key) || this.inMemoryTemplates.get(`${event}_email`);
  }

  /**
   * Core send notification dispatch method
   */
  public async sendNotification(payload: SendNotificationPayload): Promise<NotificationDeliveryResult> {
    const channel = payload.channel || 'EMAIL';
    const provider = this.getProvider(channel);

    if (!provider) {
      return {
        success: false,
        logId: '',
        status: 'FAILED',
        providerName: 'None',
        error: `No active provider configured for channel: ${channel}`,
      };
    }

    // Lookup template
    const template = await this.getTemplate(payload.event, channel);
    const variables = payload.variables || {};

    const subject = payload.customSubject || (template ? interpolateTemplate(template.subject, variables) : `${payload.event} Notification`);
    const bodyText = payload.customBody || (template ? interpolateTemplate(template.bodyText, variables) : JSON.stringify(variables));
    const bodyHtml = payload.customBodyHtml || (template ? interpolateTemplate(template.bodyHtml, variables) : undefined);
    const whatsAppText = template?.whatsAppText ? interpolateTemplate(template.whatsAppText, variables) : undefined;

    const logId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const logRecord: NotificationLog = {
      id: logId,
      event: payload.event,
      channel,
      recipientId: payload.recipientId,
      recipientName: payload.recipientName,
      recipientEmail: payload.recipientEmail,
      recipientPhone: payload.recipientPhone,
      subject,
      body: bodyText,
      bodyHtml,
      variables,
      status: 'QUEUED',
      providerName: provider.name,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
      metadata: payload.metadata,
    };

    // Save initial queued log
    try {
      await setDoc(doc(db, LOGS_COLLECTION, logId), logRecord);
    } catch (err) {
      console.warn('[NotificationService] Could not persist queued log:', err);
    }

    // Dispatch via Provider
    const providerPayload: NotificationPayload = {
      recipientId: payload.recipientId,
      recipientName: payload.recipientName,
      recipientEmail: payload.recipientEmail,
      recipientPhone: payload.recipientPhone,
      subject,
      bodyText,
      bodyHtml,
      whatsAppText,
      variables,
      metadata: payload.metadata,
    };

    const result = await provider.send(providerPayload);

    // Update log with final delivery status
    const updatePayload: Partial<NotificationLog> = {
      status: result.status,
      providerMessageId: result.providerMessageId,
      error: result.error,
      sentAt: result.success ? now : undefined,
      deliveredAt: result.status === 'DELIVERED' ? now : undefined,
      updatedAt: new Date().toISOString(),
    };

    try {
      await updateDoc(doc(db, LOGS_COLLECTION, logId), updatePayload);
    } catch (err) {
      console.warn('[NotificationService] Could not update log status:', err);
    }

    return {
      success: result.success,
      logId,
      status: result.status,
      providerName: provider.name,
      messageId: result.providerMessageId,
      error: result.error,
    };
  }

  /**
   * Resend / Retry an existing notification log
   */
  public async resendNotification(logId: string): Promise<NotificationDeliveryResult> {
    try {
      const snap = await getDoc(doc(db, LOGS_COLLECTION, logId));
      if (!snap.exists()) {
        throw new Error('Notification record not found');
      }

      const log = snap.data() as NotificationLog;
      const provider = this.getProvider(log.channel);

      if (!provider) {
        throw new Error(`No active provider for channel: ${log.channel}`);
      }

      const providerPayload: NotificationPayload = {
        recipientId: log.recipientId,
        recipientName: log.recipientName,
        recipientEmail: log.recipientEmail,
        recipientPhone: log.recipientPhone,
        subject: log.subject,
        bodyText: log.body,
        bodyHtml: log.bodyHtml,
        variables: log.variables,
        metadata: log.metadata,
      };

      const result = await provider.send(providerPayload);
      const now = new Date().toISOString();

      await updateDoc(doc(db, LOGS_COLLECTION, logId), {
        status: result.status,
        providerMessageId: result.providerMessageId,
        error: result.error,
        retryCount: (log.retryCount || 0) + 1,
        sentAt: result.success ? now : log.sentAt,
        deliveredAt: result.status === 'DELIVERED' ? now : log.deliveredAt,
        updatedAt: now,
      });

      return {
        success: result.success,
        logId,
        status: result.status,
        providerName: provider.name,
        messageId: result.providerMessageId,
        error: result.error,
      };
    } catch (err: any) {
      return {
        success: false,
        logId,
        status: 'FAILED',
        providerName: 'Unknown',
        error: err?.message || 'Failed to resend notification',
      };
    }
  }
}

export const notificationService = new NotificationServiceEngine();

// Ensure default templates exist
notificationService.seedDefaultTemplatesIfEmpty();

// --- FIRESTORE SUBSCRIPTIONS & CRUD HELPERS ---

/**
 * Subscribe to all notification templates
 */
export const subscribeToNotificationTemplates = (
  callback: (templates: NotificationTemplate[]) => void
) => {
  const q = query(collection(db, TEMPLATES_COLLECTION), orderBy('name', 'asc'));

  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        // Return default memory templates if empty
        const list = DEFAULT_NOTIFICATION_TEMPLATES.map((t) => ({
          ...t,
          id: `${t.event}_${t.channel.toLowerCase()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })) as NotificationTemplate[];
        callback(list);
      } else {
        const templates = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as NotificationTemplate[];
        callback(templates);
      }
    },
    (err) => {
      console.warn('Error subscribing to notification templates:', err);
      // fallback
      const list = DEFAULT_NOTIFICATION_TEMPLATES.map((t) => ({
        ...t,
        id: `${t.event}_${t.channel.toLowerCase()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })) as NotificationTemplate[];
      callback(list);
    }
  );
};

/**
 * Save / Update a notification template
 */
export const saveNotificationTemplate = async (
  template: Partial<NotificationTemplate> & { id: string }
): Promise<void> => {
  const docRef = doc(db, TEMPLATES_COLLECTION, template.id);
  const now = new Date().toISOString();
  await setDoc(
    docRef,
    {
      ...template,
      updatedAt: now,
    },
    { merge: true }
  );
};

/**
 * Reset all templates to system defaults
 */
export const resetDefaultNotificationTemplates = async (): Promise<void> => {
  const now = new Date().toISOString();
  const promises = DEFAULT_NOTIFICATION_TEMPLATES.map((tmpl) => {
    const docId = `${tmpl.event}_${tmpl.channel.toLowerCase()}`;
    return setDoc(doc(db, TEMPLATES_COLLECTION, docId), {
      ...tmpl,
      id: docId,
      createdAt: now,
      updatedAt: now,
    });
  });
  await Promise.all(promises);
};

/**
 * Subscribe to Notification Delivery Logs
 */
export const subscribeToNotificationLogs = (
  callback: (logs: NotificationLog[]) => void,
  filterChannel?: NotificationChannel,
  filterEvent?: NotificationEventType
) => {
  const q = query(
    collection(db, LOGS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(150)
  );

  return onSnapshot(
    q,
    (snap) => {
      let logs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as NotificationLog[];

      if (filterChannel) {
        logs = logs.filter((l) => l.channel === filterChannel);
      }
      if (filterEvent) {
        logs = logs.filter((l) => l.event === filterEvent);
      }

      callback(logs);
    },
    (err) => {
      console.warn('Error subscribing to notification logs:', err);
      callback([]);
    }
  );
};

/**
 * Delete a notification log entry
 */
export const deleteNotificationLog = async (logId: string): Promise<void> => {
  await deleteDoc(doc(db, LOGS_COLLECTION, logId));
};

/**
 * Simulate status update (e.g. OPENED, DELIVERED)
 */
export const simulateDeliveryEvent = async (
  logId: string,
  newStatus: NotificationDeliveryStatus
): Promise<void> => {
  const now = new Date().toISOString();
  const updateData: Partial<NotificationLog> = {
    status: newStatus,
    updatedAt: now,
  };
  if (newStatus === 'OPENED') {
    updateData.openedAt = now;
  } else if (newStatus === 'DELIVERED') {
    updateData.deliveredAt = now;
  }
  await updateDoc(doc(db, LOGS_COLLECTION, logId), updateData);
};

// --- HIGH-LEVEL WORKFLOW EVENT TRIGGER HELPERS ---

/**
 * 1. Application Received Trigger
 */
export const sendApplicationReceivedNotification = async (params: {
  name: string;
  email: string;
  phone?: string;
  applicationId: string;
  programmeName: string;
  cohortName: string;
  submissionDate?: string;
  actionUrl?: string;
  channel?: NotificationChannel;
}) => {
  return notificationService.sendNotification({
    event: 'application_received',
    channel: params.channel || 'EMAIL',
    recipientName: params.name,
    recipientEmail: params.email,
    recipientPhone: params.phone,
    variables: {
      recipientName: params.name,
      programmeName: params.programmeName,
      cohortName: params.cohortName,
      applicationId: params.applicationId,
      submissionDate: params.submissionDate || new Date().toLocaleDateString(),
      actionUrl: params.actionUrl || `${window.location.origin}/portal/applicant/status`,
    },
    metadata: { applicationId: params.applicationId },
  });
};

/**
 * 2. Qualified Trigger
 */
export const sendQualificationNotification = async (params: {
  name: string;
  email: string;
  phone?: string;
  programmeName: string;
  cohortName: string;
  actionUrl?: string;
  channel?: NotificationChannel;
}) => {
  return notificationService.sendNotification({
    event: 'qualified',
    channel: params.channel || 'EMAIL',
    recipientName: params.name,
    recipientEmail: params.email,
    recipientPhone: params.phone,
    variables: {
      recipientName: params.name,
      programmeName: params.programmeName,
      cohortName: params.cohortName,
      actionUrl: params.actionUrl || `${window.location.origin}/portal/applicant/assessment`,
    },
  });
};

/**
 * 3. Assessment Invitation Trigger
 */
export const sendAssessmentInvitationNotification = async (params: {
  name: string;
  email: string;
  phone?: string;
  programmeName: string;
  cohortName: string;
  assessmentTitle: string;
  durationMinutes: number;
  passThreshold: number;
  deadline: string;
  token: string;
  actionUrl?: string;
  channel?: NotificationChannel;
}) => {
  return notificationService.sendNotification({
    event: 'assessment_invitation',
    channel: params.channel || 'EMAIL',
    recipientName: params.name,
    recipientEmail: params.email,
    recipientPhone: params.phone,
    variables: {
      recipientName: params.name,
      programmeName: params.programmeName,
      cohortName: params.cohortName,
      assessmentTitle: params.assessmentTitle,
      durationMinutes: params.durationMinutes,
      passThreshold: params.passThreshold,
      deadline: params.deadline,
      token: params.token,
      actionUrl: params.actionUrl || `${window.location.origin}/portal/applicant/assessment?token=${params.token}`,
    },
    metadata: { token: params.token },
  });
};

/**
 * 4. Assessment Reminder Trigger
 */
export const sendAssessmentReminderNotification = async (params: {
  name: string;
  email: string;
  phone?: string;
  programmeName: string;
  cohortName: string;
  assessmentTitle: string;
  deadline: string;
  token: string;
  actionUrl?: string;
  channel?: NotificationChannel;
}) => {
  return notificationService.sendNotification({
    event: 'assessment_reminder',
    channel: params.channel || 'EMAIL',
    recipientName: params.name,
    recipientEmail: params.email,
    recipientPhone: params.phone,
    variables: {
      recipientName: params.name,
      programmeName: params.programmeName,
      cohortName: params.cohortName,
      assessmentTitle: params.assessmentTitle,
      deadline: params.deadline,
      token: params.token,
      actionUrl: params.actionUrl || `${window.location.origin}/portal/applicant/assessment?token=${params.token}`,
    },
  });
};

/**
 * 5. Acceptance Offer Trigger
 */
export const sendAcceptanceNotification = async (params: {
  name: string;
  email: string;
  phone?: string;
  programmeName: string;
  cohortName: string;
  startDate: string;
  actionUrl?: string;
  channel?: NotificationChannel;
}) => {
  return notificationService.sendNotification({
    event: 'acceptance',
    channel: params.channel || 'EMAIL',
    recipientName: params.name,
    recipientEmail: params.email,
    recipientPhone: params.phone,
    variables: {
      recipientName: params.name,
      programmeName: params.programmeName,
      cohortName: params.cohortName,
      startDate: params.startDate,
      actionUrl: params.actionUrl || `${window.location.origin}/portal/applicant/decision`,
    },
  });
};

/**
 * 6. Rejection Trigger
 */
export const sendRejectionNotification = async (params: {
  name: string;
  email: string;
  phone?: string;
  programmeName: string;
  cohortName: string;
  actionUrl?: string;
  channel?: NotificationChannel;
}) => {
  return notificationService.sendNotification({
    event: 'rejection',
    channel: params.channel || 'EMAIL',
    recipientName: params.name,
    recipientEmail: params.email,
    recipientPhone: params.phone,
    variables: {
      recipientName: params.name,
      programmeName: params.programmeName,
      cohortName: params.cohortName,
      actionUrl: params.actionUrl || `${window.location.origin}/programmes`,
    },
  });
};

/**
 * 7. Enrolment Confirmation Trigger
 */
export const sendEnrolmentNotification = async (params: {
  name: string;
  email: string;
  phone?: string;
  learnerId: string;
  programmeName: string;
  cohortName: string;
  startDate: string;
  actionUrl?: string;
  channel?: NotificationChannel;
}) => {
  return notificationService.sendNotification({
    event: 'enrolment',
    channel: params.channel || 'EMAIL',
    recipientName: params.name,
    recipientEmail: params.email,
    recipientPhone: params.phone,
    variables: {
      recipientName: params.name,
      learnerId: params.learnerId,
      programmeName: params.programmeName,
      cohortName: params.cohortName,
      startDate: params.startDate,
      actionUrl: params.actionUrl || `${window.location.origin}/portal/learner/dashboard`,
    },
  });
};

/**
 * 8. Class Reminder Trigger
 */
export const sendClassReminderNotification = async (params: {
  name: string;
  email: string;
  phone?: string;
  cohortName: string;
  classTitle: string;
  classTime: string;
  instructorName: string;
  meetingUrl: string;
  channel?: NotificationChannel;
}) => {
  return notificationService.sendNotification({
    event: 'class_reminder',
    channel: params.channel || 'EMAIL',
    recipientName: params.name,
    recipientEmail: params.email,
    recipientPhone: params.phone,
    variables: {
      recipientName: params.name,
      cohortName: params.cohortName,
      classTitle: params.classTitle,
      classTime: params.classTime,
      instructorName: params.instructorName,
      meetingUrl: params.meetingUrl,
    },
  });
};

/**
 * 9. Assignment Reminder Trigger
 */
export const sendAssignmentReminderNotification = async (params: {
  name: string;
  email: string;
  phone?: string;
  programmeName: string;
  assignmentTitle: string;
  dueDate: string;
  maxPoints: number;
  actionUrl?: string;
  channel?: NotificationChannel;
}) => {
  return notificationService.sendNotification({
    event: 'assignment_reminder',
    channel: params.channel || 'EMAIL',
    recipientName: params.name,
    recipientEmail: params.email,
    recipientPhone: params.phone,
    variables: {
      recipientName: params.name,
      programmeName: params.programmeName,
      assignmentTitle: params.assignmentTitle,
      dueDate: params.dueDate,
      maxPoints: params.maxPoints,
      actionUrl: params.actionUrl || `${window.location.origin}/portal/learner/assignments`,
    },
  });
};

/**
 * 10. Feedback Reminder Trigger
 */
export const sendFeedbackReminderNotification = async (params: {
  name: string;
  email: string;
  phone?: string;
  cohortName: string;
  moduleTitle: string;
  actionUrl?: string;
  channel?: NotificationChannel;
}) => {
  return notificationService.sendNotification({
    event: 'feedback_reminder',
    channel: params.channel || 'EMAIL',
    recipientName: params.name,
    recipientEmail: params.email,
    recipientPhone: params.phone,
    variables: {
      recipientName: params.name,
      cohortName: params.cohortName,
      moduleTitle: params.moduleTitle,
      actionUrl: params.actionUrl || `${window.location.origin}/portal/learner/feedback`,
    },
  });
};

/**
 * 11. Certificate Issued Trigger
 */
export const sendCertificateIssuedNotification = async (params: {
  name: string;
  email: string;
  phone?: string;
  programmeName: string;
  cohortName: string;
  verificationCode: string;
  issueDate: string;
  gradeHonors: string;
  certificateUrl: string;
  channel?: NotificationChannel;
}) => {
  return notificationService.sendNotification({
    event: 'certificate_issued',
    channel: params.channel || 'EMAIL',
    recipientName: params.name,
    recipientEmail: params.email,
    recipientPhone: params.phone,
    variables: {
      recipientName: params.name,
      programmeName: params.programmeName,
      cohortName: params.cohortName,
      verificationCode: params.verificationCode,
      issueDate: params.issueDate,
      gradeHonors: params.gradeHonors,
      certificateUrl: params.certificateUrl,
    },
  });
};

/**
 * Batch Dispatcher Helper
 */
export const sendBatchNotifications = async (
  payloads: SendNotificationPayload[]
): Promise<NotificationDeliveryResult[]> => {
  const results: NotificationDeliveryResult[] = [];
  for (const p of payloads) {
    const res = await notificationService.sendNotification(p);
    results.push(res);
  }
  return results;
};
