import {
  Controller,
  Post,
  Body,
  Get,
  Inject,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
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
import { AuthGuard } from './auth.guard';

/**
 * Notifications Controller
 * Handles sending email and push notifications
 */
@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
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

  /**
   * Send a notification
   * Sends an email or push notification to a user using a template.
   * Requires authentication via JWT token.
   *
   * The notification is queued asynchronously. The API Gateway returns immediately
   * with a request_id that can be used to track the notification status.
   *
   * @param sendNotificationDto - Notification data (notification_type, user_id, template_code, variables, request_id, priority, metadata)
   * @returns Request ID for tracking the notification
   */
  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Send a notification',
    description: `Sends an email or push notification to a user. 
    
**Notification Types:**
- \`email\`: Sends an email notification
- \`push\`: Sends a web push notification

**Template Variables:**
The \`variables\` object is used to replace placeholders in the template.
For example, if your template contains \`{{name}}\`, pass \`{"name": "John"}\` in variables.

**Authentication:**
This endpoint requires a valid JWT token in the Authorization header:
\`Authorization: Bearer <your-token>\`

**Response:**
Returns a \`request_id\` that can be used to track the notification status.`,
  })
  @ApiBody({
    type: SendNotificationDto,
    description: 'Notification',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification queued successfully',
    schema: {
      example: {
        success: true,
        message: 'Notification queued successfully',
        data: {
          request_id: '1762781396004-z6cb389lp',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'User or template not found',
    schema: {
      example: {
        success: false,
        message: 'User not found',
        error: 'User not found',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - Backend service is down',
    schema: {
      example: {
        success: false,
        message: 'User service is temporarily unavailable',
        error: 'User service is temporarily unavailable',
      },
    },
  })
  async sendNotification(
    @Body() sendNotificationDto: SendNotificationDto,
  ): Promise<ResponseDto<any>> {
    console.log(`[API Gateway] Received notification request:`, {
      notification_type: sendNotificationDto.notification_type,
      user_id: sendNotificationDto.user_id,
      template_code: sendNotificationDto.template_code,
      request_id: sendNotificationDto.request_id,
      priority: sendNotificationDto.priority,
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
    } catch (error) {
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

    // Get template data by name (template_code)
    let templateResponse;
    try {
      templateResponse = await firstValueFrom(
        this.templateService
          .send('template.get_by_name', {
            name: sendNotificationDto.template_code,
            type: sendNotificationDto.notification_type,
            language: 'en', // Default to 'en', can be made configurable later
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

    // Use client-provided request_id or generate one
    const requestId = sendNotificationDto.request_id || this.appService.generateRequestId();
    
    // Flatten UserData structure for template substitution
    // UserData has { name, link, meta }, but templates need flat variables
    const templateVariables = {
      name: sendNotificationDto.variables.name,
      link: sendNotificationDto.variables.link,
      ...(sendNotificationDto.variables.meta || {}), // Spread meta fields
    };
    
    // Queue notification (these are fire-and-forget, no circuit breaker needed)
    const notificationData = {
      request_id: requestId,
      user: userResponse.data,
      template: templateResponse.data,
      variables: templateVariables,
      priority: sendNotificationDto.priority || 0,
      metadata: sendNotificationDto.metadata || {},
    };

    if (sendNotificationDto.notification_type === NotificationType.EMAIL) {
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

  /**
   * Get user's own notifications
   * Returns all notifications (email and push) for the authenticated user.
   * Includes notification status.
   *
   * @param req - Request object containing authenticated user
   * @returns List of user's notifications
   */
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get my notifications',
    description: `Returns all notifications (email and push) for the authenticated user.
    
Includes notification status (pending, sent/delivered, failed) and timestamps.
Users can only see their own notifications.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Notifications retrieved successfully',
        data: {
          email: [
            {
              request_id: 'req-1234567890',
              status: 'sent',
              subject: 'Welcome!',
              created_at: '2024-01-01T00:00:00.000Z',
            },
          ],
          push: [
            {
              request_id: 'req-1234567891',
              status: 'sent',
              title: 'New Message',
              created_at: '2024-01-01T00:00:00.000Z',
            },
          ],
        },
      },
    },
  })
  async getMyNotifications(@Request() req: any): Promise<ResponseDto<any>> {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }

    try {
      // Get email notifications
      const emailResponse = await firstValueFrom(
        this.emailService
          .send('email.get_by_user_id', { user_id: userId })
          .pipe(timeout(3000)),
      );

      // Get push notifications
      const pushResponse = await firstValueFrom(
        this.pushService
          .send('push.get_by_user_id', { user_id: userId })
          .pipe(timeout(3000)),
      );

      return {
        success: true,
        message: 'Notifications retrieved successfully',
        data: {
          email: emailResponse.success ? emailResponse.data || [] : [],
          push: pushResponse.success ? pushResponse.data || [] : [],
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve notifications',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

}
