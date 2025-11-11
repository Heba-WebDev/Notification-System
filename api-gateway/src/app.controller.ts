import {
  Controller,
  Post,
  Body,
  Get,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { throwError } from 'rxjs';
import { AppService } from './app.service';
import {
  NotificationType,
  ResponseDto,
  SendNotificationDto,
} from '@shared/index';
import { CircuitBreakerService } from './circuit-breaker.service';

@Controller('/notifications')
export class AppController {
  constructor(
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
    @Inject('TEMPLATE_SERVICE')
    private readonly templateService: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
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

    // Check USER_SERVICE circuit
    if (this.circuitBreakerService.isOpen('USER_SERVICE')) {
      throw new HttpException(
        'User service is temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Get user data
    let userResponse;
    try {
      userResponse = await firstValueFrom(
        this.userService
          .send('user.get_by_id', {
            user_id: sendNotificationDto.user_id,
          })
          .pipe(
            timeout(3000), // 3 second timeout
            catchError((error) => {
              // Convert timeout/connection errors to a standard error
              return throwError(() => error);
            }),
          ),
      );
      this.circuitBreakerService.recordSuccess('USER_SERVICE');
    } catch (error: any) {
      this.circuitBreakerService.recordFailure('USER_SERVICE');
      console.log(`[API Gateway] User service error: ${error.message}`);
      throw new HttpException(
        'User service is temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!userResponse.success || !userResponse.data) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Check TEMPLATE_SERVICE circuit
    if (this.circuitBreakerService.isOpen('TEMPLATE_SERVICE')) {
      throw new HttpException(
        'Template service is temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Get template data
    let templateResponse;
    try {
      templateResponse = await firstValueFrom(
        this.templateService
          .send('template.get_by_id', {
            template_id: sendNotificationDto.template_id,
          })
          .pipe(
            timeout(3000), // 3 second timeout
            catchError((error) => {
              // Convert timeout/connection errors to a standard error
              return throwError(() => error);
            }),
          ),
      );
      this.circuitBreakerService.recordSuccess('TEMPLATE_SERVICE');
    } catch (error: any) {
      this.circuitBreakerService.recordFailure('TEMPLATE_SERVICE');
      console.log(`[API Gateway] Template service error: ${error.message}`);
      throw new HttpException(
        'Template service is temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!templateResponse.success || !templateResponse.data) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }

    // Queue notification (these are fire-and-forget, no circuit breaker needed)
    const requestId = this.appService.generateRequestId();
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
  }

  @Get('health')
  async getHealth(): Promise<ResponseDto<any>> {
    const checks: Record<string, boolean> = {
      rabbitmq: await this.appService.checkRabbitMQ(),
    };

    const isHealthy = Object.values(checks).every((check) => check === true);

    return {
      success: isHealthy,
      message: isHealthy
        ? 'API Gateway is healthy'
        : 'API Gateway is unhealthy',
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        checks,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
