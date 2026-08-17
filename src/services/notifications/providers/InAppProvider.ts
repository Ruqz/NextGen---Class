import { NotificationChannel, NotificationDeliveryStatus } from '../../../types';
import {
  NotificationProvider,
  NotificationPayload,
  NotificationProviderSendResult,
  ProviderStatusInfo,
} from './NotificationProvider';

export class InAppNotificationProvider implements NotificationProvider {
  public readonly id = 'in_app_default';
  public readonly name = 'In-App Notification Centre';
  public readonly channel: NotificationChannel = 'IN_APP';
  public isEnabled: boolean = true;

  public isConfigured(): boolean {
    return true;
  }

  public getStatus(): ProviderStatusInfo {
    return {
      isConfigured: true,
      isEnabled: this.isEnabled,
      status: this.isEnabled ? 'CONFIGURED' : 'DISABLED',
      statusLabel: this.isEnabled ? 'Active' : 'Disabled',
      message: 'In-app notification real-time bell delivery',
    };
  }

  public async send(payload: NotificationPayload): Promise<NotificationProviderSendResult> {
    const providerMessageId = `inapp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      success: true,
      status: 'DELIVERED',
      providerMessageId,
      details: {
        recipientId: payload.recipientId,
        subject: payload.subject,
        sentAt: new Date().toISOString(),
      },
    };
  }

  public async checkStatus(providerMessageId: string): Promise<NotificationDeliveryStatus> {
    return 'DELIVERED';
  }
}

