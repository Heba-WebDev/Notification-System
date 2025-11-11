import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushLog } from './entities/push-log.entity';
import * as webpush from 'web-push';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

@Injectable()
export class AppService {
  private vapidInitialized = false;

  constructor(
    @InjectRepository(PushLog)
    private readonly pushLogRepository: Repository<PushLog>,
  ) {
    // Initialize Web Push with VAPID keys only if provided
    // For testing without VAPID keys, we'll skip initialization
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:noreply@example.com';
    
    // Validate VAPID keys in production
    if (process.env.NODE_ENV === 'production' && (!vapidPublicKey || !vapidPrivateKey)) {
      console.warn(
        '⚠️  WARNING: VAPID keys not set in production. Push notifications will fail.',
      );
      console.warn('   Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in environment variables.');
      console.warn('   Generate keys with: npx web-push generate-vapid-keys');
    }

    if (vapidPublicKey && vapidPrivateKey) {
      try {
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
        this.vapidInitialized = true;
        console.log('✅ VAPID keys initialized successfully');
      } catch (error) {
        console.warn(
          '⚠️  Invalid VAPID keys provided. Push notifications may not work.',
        );
        console.warn('   Generate keys with: npx web-push generate-vapid-keys');
      }
    } else {
      console.warn(
        '⚠️  No VAPID keys found. Push notifications will use mock tokens.',
      );
      console.warn(
        '   For production, set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env',
      );
      console.warn('   Generate keys with: npx web-push generate-vapid-keys');
    }
  }

  async processPushNotification(
    data: {
      request_id: string;
      user: any;
      template: any;
      variables: Record<string, any>;
    },
    retryCount: number = 0,
  ): Promise<void> {
    const maxRetries = 3;

    try {
      const existing = await this.pushLogRepository.findOne({
        where: { request_id: data.request_id },
      });

      if (existing) {
        console.log(`Push ${data.request_id} already processed`);
        return;
      }

      if (!data.user.push_token) {
        throw new Error('User has no push token');
      }

      let title = data.template.subject || 'Notification';
      let body = data.template.body;

      Object.keys(data.variables).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        title = title.replace(regex, data.variables[key] || '');
        body = body.replace(regex, data.variables[key] || '');
      });

      const pushLog = this.pushLogRepository.create({
        request_id: data.request_id,
        user_id: data.user.id,
        device_token: data.user.push_token,
        title: title,
        body: body,
        data: data.variables,
        status: 'pending',
      });

      await this.pushLogRepository.save(pushLog);

      // Parse push subscription from stored token
      let pushSubscription;
      try {
        const tokenValue = data.user.push_token;

        // Check if it's an old mock token format (starts with "web-push-token-")
        if (
          typeof tokenValue === 'string' &&
          tokenValue.startsWith('web-push-token-')
        ) {
          throw new Error(
            'Old mock token format detected. Please re-register your push token using the "Get Push Token" button in the Push Token Manager page.',
          );
        }

        // Try to parse as JSON
        let parsed;
        if (typeof tokenValue === 'string') {
          try {
            parsed = JSON.parse(tokenValue);
          } catch (parseError) {
            // If it's not valid JSON, it might be just an endpoint string (old format)
            throw new Error(
              'Invalid token format. Expected JSON subscription object. Please re-register your push token.',
            );
          }
        } else {
          parsed = tokenValue;
        }

        // Check if it's a valid Web Push subscription object
        if (parsed && parsed.endpoint) {
          // Extract keys - they should be base64url strings
          const p256dh = parsed.keys?.p256dh || '';
          const auth = parsed.keys?.auth || '';

          // Validate that we have the required keys
          if (!p256dh || !auth) {
            console.error(
              'Push subscription structure:',
              JSON.stringify(parsed, null, 2),
            );
            throw new Error(
              'Push subscription missing required keys (p256dh or auth). Please re-register your push token with a valid subscription.',
            );
          }

          // Create subscription object for web-push
          pushSubscription = {
            endpoint: parsed.endpoint,
            keys: {
              p256dh: p256dh,
              auth: auth,
            },
          };
        } else {
          throw new Error(
            'Invalid push subscription format - missing endpoint or keys',
          );
        }
      } catch (error) {
        console.error('Error parsing push subscription:', error);
        console.error(
          'Push token value (first 200 chars):',
          typeof data.user.push_token === 'string'
            ? data.user.push_token.substring(0, 200)
            : JSON.stringify(data.user.push_token).substring(0, 200),
        );

        // Update log with helpful error message
        pushLog.status = 'failed';
        pushLog.error_message = error.message;
        await this.pushLogRepository.save(pushLog);

        throw error;
      }
      // Create payload for web push
      // The payload will be received by the service worker's push event
      const payload = JSON.stringify({
        title: title,
        body: body,
        icon: '/icon.png',
        badge: '/badge.png',
        data: data.variables,
        timestamp: Date.now(),
      });

      console.log('Sending push notification with payload:', payload);

      // Check if VAPID keys are initialized
      if (!this.vapidInitialized) {
        console.warn(
          `⚠️  Skipping push notification ${data.request_id}: VAPID keys not configured`,
        );
        pushLog.status = 'failed';
        pushLog.error_message =
          'VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env';
        await this.pushLogRepository.save(pushLog);
        return; // Don't throw - just log and skip
      }

      try {
        await webpush.sendNotification(pushSubscription, payload);

        pushLog.status = 'sent';
        await this.pushLogRepository.save(pushLog);

        console.log(`Push sent successfully: ${data.request_id}`);
      } catch (webPushError: any) {
        console.error(`Web Push error: ${webPushError.message}`);

        pushLog.status = 'failed';
        pushLog.error_message = webPushError.message;
        await this.pushLogRepository.save(pushLog);

        //  just log for invalid tokens
        if (
          webPushError.statusCode === 410 ||
          webPushError.statusCode === 404
        ) {
          console.log(`Token expired or invalid for user ${data.user.id}`);
          return; // don't retry expired tokens
        }

        throw webPushError; // Re-throw for other errors to trigger retry
      }
    } catch (error) {
      console.error(`Failed to send push: ${error.message}`);

      // Retry with exponential backoff
      if (retryCount < maxRetries) {
        // Exponential backoff: 2^retryCount * 1000ms
        // Attempt 1: 1s, Attempt 2: 2s, Attempt 3: 4s
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(
          `Retrying push in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.processPushNotification(data, retryCount + 1);
      }

      // Max retries reached
      const pushLog = await this.pushLogRepository.findOne({
        where: { request_id: data.request_id },
      });

      if (pushLog) {
        pushLog.status = 'failed';
        pushLog.error_message = error.message;
        await this.pushLogRepository.save(pushLog);
      }

      // Move to dead-letter queue after max retries
      await this.moveToDeadLetterQueue(data, error);

      throw error; // Re-throw to trigger RabbitMQ retry/dead-letter queue
    }
  }

  async checkDatabase(): Promise<void> {
    // Simple query to check database connectivity
    await this.pushLogRepository.query('SELECT 1');
  }

  async updateStatus(
    requestId: string,
    status: string,
    timestamp?: string,
    error?: string,
  ): Promise<any | null> {
    const pushLog = await this.pushLogRepository.findOne({
      where: { request_id: requestId },
    });

    if (!pushLog) {
      return null;
    }

    // Map status values: 'delivered' -> 'sent', keep others as is
    const mappedStatus = status === 'delivered' ? 'sent' : status;
    
    pushLog.status = mappedStatus;
    if (error) {
      pushLog.error_message = error;
    }

    await this.pushLogRepository.save(pushLog);

    return pushLog;
  }

  async getNotificationsByUserId(userId: string): Promise<any[]> {
    const notifications = await this.pushLogRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });

    return notifications.map((log) => ({
      request_id: log.request_id,
      status: log.status,
      title: log.title,
      error_message: log.error_message,
      created_at: log.created_at,
    }));
  }

  private async moveToDeadLetterQueue(data: any, error: Error): Promise<void> {
    // Log the failure for manual review or processing by a separate service
    console.error(
      `Moving to dead-letter queue: ${data.request_id}`,
      error.message,
    );
    // In a production system, you would emit this to a failed queue
    // For now, we'll just log it
    // TODO: Implement dead-letter queue emission
  }
}
