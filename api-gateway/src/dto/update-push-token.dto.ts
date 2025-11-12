import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePushTokenDto {
  @ApiProperty({
    description: 'Web push subscription token (JSON string)',
    example: '{"endpoint":"https://fcm.googleapis.com/...","keys":{"p256dh":"...","auth":"..."}}',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  push_token!: string;
}

