import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @EventPattern('notification.push')
  async handlePushNotification(@Payload() data: any) {
    console.log('Received push notification:', data.request_id);

    try {
      await this.appService.processPushNotification(data);
    } catch (error) {
      console.error('Failed to process push notification:', error);
      // Message will go to dead letter queue after retries
      throw error;
    }
  }

  @MessagePattern('health.check')
  async healthCheck() {
    try {
      await this.appService.checkDatabase();
      return {
        success: true,
        message: 'Push service is healthy',
        data: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Push service is unhealthy',
        error: error.message || 'Internal server error',
      };
    }
  }

  @MessagePattern('push.update_status')
  async updateStatus(@Payload() data: { request_id: string; status: string; timestamp?: string; error?: string }) {
    try {
      const result = await this.appService.updateStatus(
        data.request_id,
        data.status,
        data.timestamp,
        data.error,
      );

      if (!result) {
        return {
          success: false,
          message: 'Push notification not found',
          error: 'NOT_FOUND',
        };
      }

      return {
        success: true,
        message: 'Push notification status updated successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update push notification status',
        error: error.message || 'Internal server error',
      };
    }
  }

  @MessagePattern('push.get_by_user_id')
  async getByUserId(@Payload() data: { user_id: string }) {
    try {
      const notifications = await this.appService.getNotificationsByUserId(data.user_id);
      return {
        success: true,
        message: 'Push notifications retrieved successfully',
        data: notifications,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve push notifications',
        error: error.message || 'Internal server error',
      };
    }
  }
}
