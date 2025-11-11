import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @EventPattern('notification.email')
  async handleEmailNotification(@Payload() data: any) {
    console.log('Received email notification:', data.request_id);

    try {
      await this.appService.processEmailNotification(data);
    } catch (error) {
      console.error('Failed to process email notification:', error);
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
        message: 'Email service is healthy',
        data: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Email service is unhealthy',
        error: error.message || 'Internal server error',
      };
    }
  }
}
