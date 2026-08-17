import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from '../../../types';

export interface NotificationPayload {
  recipientId?: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  whatsAppText?: string;
  variables: Record<string, any>;
  metadata?: Record<string, any>;
}

export type ProviderOperationalStatus =
  | 'CONFIGURED'
  | 'NOT_CONFIGURED'
  | 'DISABLED'
  | 'ERROR';

export interface ProviderStatusInfo {
  isConfigured: boolean;
  isEnabled: boolean;
  status: ProviderOperationalStatus;
  statusLabel: string;
  message: string;
  details?: Record<string, any>;
}

export interface NotificationProviderSendResult {
  success: boolean;
  status: NotificationDeliveryStatus;
  providerMessageId?: string;
  error?: string;
  details?: Record<string, any>;
}

export interface NotificationProvider {
  readonly id: string;
  readonly name: string;
  readonly channel: NotificationChannel;
  readonly isEnabled: boolean;
  
  isConfigured(): boolean;
  getStatus(): ProviderStatusInfo;

  send(payload: NotificationPayload): Promise<NotificationProviderSendResult>;
  checkStatus?(providerMessageId: string): Promise<NotificationDeliveryStatus>;
}

// Backward compatibility alias
export type INotificationProvider = NotificationProvider;

