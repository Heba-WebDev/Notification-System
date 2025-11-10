import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
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
}
