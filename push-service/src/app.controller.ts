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
}
