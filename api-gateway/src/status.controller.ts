import {
  Controller,
  Post,
  Body,
  Param,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { ResponseDto } from '@shared/index';
import { UpdateStatusDto, NotificationStatus } from './dto/update-status.dto';

/**
 * Status Controller
 * Handles notification status updates
 */
@ApiTags('Status')
@Controller()
export class StatusController {
  constructor(
    @Inject('EMAIL_SERVICE') private readonly emailService: ClientProxy,
    @Inject('PUSH_SERVICE') private readonly pushService: ClientProxy,
  ) {}

  /**
   * Update email notification status
   * Updates the status of an email notification by request_id.
   * This endpoint allows external systems to update notification status.
   *
   * @param updateStatusDto - Status update data (notification_id, status, timestamp, error)
   * @returns Success confirmation
   */
  @Post('email/status')
  @ApiOperation({
    summary: 'Update email notification status',
    description: `Updates the status of an email notification by request_id.
    
**Status Values:**
- \`delivered\`: Email was successfully delivered
- \`pending\`: Email is still being processed
- \`failed\`: Email delivery failed

**Notification ID:**
The \`notification_id\` should be the \`request_id\` returned when the notification was queued.`,
  })
  @ApiBody({ type: UpdateStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Email notification status updated successfully',
        data: {
          notification_id: 'req-1234567890',
          status: 'delivered',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
    schema: {
      example: {
        success: false,
        message: 'Email notification not found',
        error: 'Notification not found',
      },
    },
  })
  async updateEmailStatus(
    @Body() updateStatusDto: UpdateStatusDto,
  ): Promise<ResponseDto<any>> {
    try {
      const response = await firstValueFrom(
        this.emailService
          .send('email.update_status', {
            request_id: updateStatusDto.notification_id,
            status: updateStatusDto.status,
            timestamp: updateStatusDto.timestamp || new Date().toISOString(),
            error: updateStatusDto.error,
          })
          .pipe(timeout(5000)),
      );

      if (!response.success) {
        throw new HttpException(
          response.message || 'Failed to update status',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        message: 'Email notification status updated successfully',
        data: {
          notification_id: updateStatusDto.notification_id,
          status: updateStatusDto.status,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Check if it's a "not found" error
      if (error.message?.includes('not found') || error.message?.includes('Not found')) {
        throw new HttpException(
          'Email notification not found',
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        error.message || 'Failed to update email notification status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update push notification status
   * Updates the status of a push notification by request_id.
   * This endpoint allows external systems to update notification status.
   *
   * @param updateStatusDto - Status update data (notification_id, status, timestamp, error)
   * @returns Success confirmation
   */
  @Post('push/status')
  @ApiOperation({
    summary: 'Update push notification status',
    description: `Updates the status of a push notification by request_id.
    
**Status Values:**
- \`delivered\`: Push notification was successfully delivered
- \`pending\`: Push notification is still being processed
- \`failed\`: Push notification delivery failed

**Notification ID:**
The \`notification_id\` should be the \`request_id\` returned when the notification was queued.`,
  })
  @ApiBody({ type: UpdateStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Push notification status updated successfully',
        data: {
          notification_id: 'req-1234567890',
          status: 'delivered',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
    schema: {
      example: {
        success: false,
        message: 'Push notification not found',
        error: 'Notification not found',
      },
    },
  })
  async updatePushStatus(
    @Body() updateStatusDto: UpdateStatusDto,
  ): Promise<ResponseDto<any>> {
    try {
      const response = await firstValueFrom(
        this.pushService
          .send('push.update_status', {
            request_id: updateStatusDto.notification_id,
            status: updateStatusDto.status,
            timestamp: updateStatusDto.timestamp || new Date().toISOString(),
            error: updateStatusDto.error,
          })
          .pipe(timeout(5000)),
      );

      if (!response.success) {
        throw new HttpException(
          response.message || 'Failed to update status',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        message: 'Push notification status updated successfully',
        data: {
          notification_id: updateStatusDto.notification_id,
          status: updateStatusDto.status,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Check if it's a "not found" error
      if (error.message?.includes('not found') || error.message?.includes('Not found')) {
        throw new HttpException(
          'Push notification not found',
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        error.message || 'Failed to update push notification status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

