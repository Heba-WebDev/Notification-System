import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ResponseDto } from '@shared/index';

@Controller('users')
export class UsersController {
  constructor(
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
  ) {}

  @Put(':userId/push-token')
  async registerPushToken(
    @Param('userId') userId: string,
    @Body() body: { push_token: string },
  ): Promise<ResponseDto<any>> {
    try {
      const response = await firstValueFrom(
        this.userService.send('user.update', {
          user_id: userId,
          data: { push_token: body.push_token },
        }),
      );

      if (!response.success) {
        throw new HttpException(
          response.message || 'Failed to update push token',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        message: 'Push token registered successfully',
        data: response.data,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      return {
        success: false,
        message: 'Failed to register push token',
        error: error.message,
      };
    }
  }

  @Get('push-tokens')
  async getAllUsersWithPushTokens(): Promise<ResponseDto<any>> {
    try {
      const response = await firstValueFrom(
        this.userService.send('user.get_all_with_push_tokens', {}),
      );

      if (!response.success) {
        throw new HttpException(
          response.message || 'Failed to get users',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        message: 'Users with push tokens retrieved successfully',
        data: response.data || [],
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      return {
        success: false,
        message: 'Failed to get users',
        error: error.message,
      };
    }
  }
}

