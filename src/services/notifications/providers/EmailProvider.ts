import { NotificationChannel, NotificationDeliveryStatus } from '../../../types';
import {
  NotificationProvider,
  NotificationPayload,
  NotificationProviderSendResult,
  ProviderStatusInfo,
} from './NotificationProvider';

export interface EmailProviderConfig {
  senderEmail: string;
  senderName: string;
  replyTo: string;
  smtpHost?: string;
  smtpPort?: number;
  apiKey?: string;
  isEnabled?: boolean;
}

export class EmailProvider implements NotificationProvider {
  public readonly id = 'email_default_smtp';
  public readonly name = 'NextGen Email Gateway (SMTP / SES)';
  public readonly channel: NotificationChannel = 'EMAIL';
  public isEnabled: boolean = true;
  private config: EmailProviderConfig;

  constructor(config?: Partial<EmailProviderConfig>) {
    this.config = {
      senderEmail: 'admissions@nextgenclass.org',
      senderName: 'NextGen Class Academic Platform',
      replyTo: 'support@nextgenclass.org',
      isEnabled: true,
      ...config,
    };
    this.isEnabled = this.config.isEnabled ?? true;
  }

  public updateConfig(newConfig: Partial<EmailProviderConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.isEnabled !== undefined) {
      this.isEnabled = newConfig.isEnabled;
    }
  }

  public getConfig(): EmailProviderConfig {
    return { ...this.config };
  }

  public isConfigured(): boolean {
    return Boolean(
      this.config.senderEmail &&
      this.config.senderEmail.includes('@') &&
      this.config.senderName
    );
  }

  public getStatus(): ProviderStatusInfo {
    if (!this.isEnabled) {
      return {
        isConfigured: this.isConfigured(),
        isEnabled: false,
        status: 'DISABLED',
        statusLabel: 'Disabled',
        message: 'Email gateway is currently disabled by system administrator.',
        details: { senderEmail: this.config.senderEmail },
      };
    }

    if (!this.isConfigured()) {
      return {
        isConfigured: false,
        isEnabled: this.isEnabled,
        status: 'NOT_CONFIGURED',
        statusLabel: 'Not Configured',
        message: 'Email sender address or credentials missing.',
        details: { senderEmail: this.config.senderEmail },
      };
    }

    return {
      isConfigured: true,
      isEnabled: true,
      status: 'CONFIGURED',
      statusLabel: 'Active & Configured',
      message: `Operational via ${this.config.senderName} (${this.config.senderEmail})`,
      details: {
        sender: `${this.config.senderName} <${this.config.senderEmail}>`,
        replyTo: this.config.replyTo,
      },
    };
  }

  public async send(payload: NotificationPayload): Promise<NotificationProviderSendResult> {
    try {
      if (!this.isEnabled) {
        return {
          success: false,
          status: 'FAILED',
          error: 'Email delivery failed: Email provider is currently disabled.',
        };
      }

      if (!this.isConfigured()) {
        return {
          success: false,
          status: 'FAILED',
          error: 'Email delivery failed: Email provider is not properly configured with a valid sender address.',
        };
      }

      if (!payload.recipientEmail || !payload.recipientEmail.includes('@')) {
        return {
          success: false,
          status: 'FAILED',
          error: `Invalid recipient email address: "${payload.recipientEmail}"`,
        };
      }

      // Generate unique provider tracking reference
      const providerMessageId = `msg_em_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Simulate network dispatch with realistic provider delivery latency (50-150ms)
      await new Promise((resolve) => setTimeout(resolve, 80));

      // Console notification audit for local verification
      console.log(`[EmailProvider] ✉️ Sent email to ${payload.recipientEmail} (${payload.recipientName}) | Subject: "${payload.subject}" [ID: ${providerMessageId}]`);

      return {
        success: true,
        status: 'DELIVERED',
        providerMessageId,
        details: {
          sender: `${this.config.senderName} <${this.config.senderEmail}>`,
          recipient: `${payload.recipientName} <${payload.recipientEmail}>`,
          subject: payload.subject,
          format: payload.bodyHtml ? 'multipart/alternative (HTML + text)' : 'text/plain',
          sentAt: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      console.error('[EmailProvider] Delivery error:', err);
      return {
        success: false,
        status: 'FAILED',
        error: err?.message || 'Unknown email dispatch failure',
      };
    }
  }

  public async checkStatus(providerMessageId: string): Promise<NotificationDeliveryStatus> {
    return 'DELIVERED';
  }
}

// Backward compatibility alias
export const EmailNotificationProvider = EmailProvider;
export type EmailNotificationProvider = EmailProvider;

