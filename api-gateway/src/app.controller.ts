import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Param,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AppService } from './app.service';
import {
  NotificationType,
  ResponseDto,
  SendNotificationDto,
} from '@shared/index';

@Controller('/notifications')
export class AppController {
  constructor(
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
    @Inject('TEMPLATE_SERVICE')
    private readonly templateService: ClientProxy,
    @Inject('EMAIL_SERVICE') private readonly emailService: ClientProxy,
    @Inject('PUSH_SERVICE') private readonly pushService: ClientProxy,
    private readonly appService: AppService,
  ) {}

  @Post('send')
  async sendNotification(
    @Body() sendNotificationDto: SendNotificationDto,
  ): Promise<ResponseDto<any>> {
    console.log(`[API Gateway] Received notification request:`, {
      type: sendNotificationDto.type,
      user_id: sendNotificationDto.user_id,
      template_id: sendNotificationDto.template_id,
    });
    try {
      // user data
      const userResponse = await firstValueFrom(
        this.userService.send('user.get_by_id', {
          user_id: sendNotificationDto.user_id,
        }),
      );

      if (!userResponse.success || !userResponse.data) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // template
      const templateResponse = await firstValueFrom(
        this.templateService.send('template.get_by_id', {
          template_id: sendNotificationDto.template_id,
        }),
      );

      if (!templateResponse.success || !templateResponse.data) {
        throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
      }

      const requestId = this.appService.generateRequestId();

      // queue
      const notificationData = {
        request_id: requestId,
        user: userResponse.data,
        template: templateResponse.data,
        variables: sendNotificationDto.variables,
      };

      if (sendNotificationDto.type === NotificationType.EMAIL) {
        this.emailService.emit('notification.email', notificationData);
      } else {
        this.pushService.emit('notification.push', notificationData);
      }

      return {
        success: true,
        message: 'Notification queued successfully',
        data: { request_id: requestId },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      return {
        success: false,
        message: 'Failed to queue notification',
        error: error.message,
      };
    }
  }

  @Get('health')
  getHealth(): ResponseDto<any> {
    return {
      success: true,
      message: 'API Gateway is healthy',
      data: { timestamp: new Date().toISOString() },
    };
  }

}
