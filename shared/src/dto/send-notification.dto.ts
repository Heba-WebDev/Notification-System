import { IsEnum, IsNotEmpty, IsObject, IsString } from 'class-validator';
import { NotificationType } from './notification-type.enum';

export class SendNotificationDto {
  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @IsString()
  @IsNotEmpty()
  template_id!: string;

  @IsObject()
  variables!: Record<string, any>;
}
