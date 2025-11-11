import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationStatus {
  DELIVERED = 'delivered',
  PENDING = 'pending',
  FAILED = 'failed',
}

/**
 * UpdateStatusDto
 */
export class UpdateStatusDto {
  @ApiProperty({
    description: 'Notification ID (request_id)',
    example: 'req-1234567890',
  })
  @IsString()
  notification_id!: string;

  @ApiProperty({
    description: 'Notification status',
    enum: NotificationStatus,
    example: NotificationStatus.DELIVERED,
  })
  @IsEnum(NotificationStatus)
  status!: NotificationStatus;

  @ApiPropertyOptional({
    description: 'Timestamp of the status update',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional({
    description: 'Error message if status is failed',
    example: 'SMTP server unavailable',
  })
  @IsOptional()
  @IsString()
  error?: string;
}

