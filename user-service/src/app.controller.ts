import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';
import { User } from './entities/user.entity';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern('user.get_by_id')
  async getUserById(@Payload() data: { user_id: string }) {
    try {
      const user = await this.appService.getUserById(data.user_id);

      if (!user) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        };
      }

      return {
        success: true,
        message: 'User retrieved successfully',
        data: {
          id: user.id,
          email: user.email,
          push_token: user.push_token,
          preferences: user.preferences || null,
        },
      };
    } catch (error) {
      console.error('Error in getUserById:', error);

      // Handle invalid UUID format
      if (error.message === 'Invalid UUID format') {
        return {
          success: false,
          message: 'Invalid user ID format',
          error: 'INVALID_UUID',
        };
      }

      return {
        success: false,
        message: 'Failed to get user',
        error: error.message || 'Internal server error',
      };
    }
  }

  @MessagePattern('user.create')
  async createUser(@Payload() data: Partial<User>) {
    try {
      const user = await this.appService.createUser(data);
      return {
        success: true,
        message: 'User created successfully',
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create user',
        error: error.message,
      };
    }
  }

  @MessagePattern('user.update')
  async updateUser(@Payload() data: { user_id: string; data: Partial<User> }) {
    try {
      const user = await this.appService.updateUser(data.user_id, data.data);

      if (!user) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        };
      }

      return {
        success: true,
        message: 'User updated successfully',
        data: user,
      };
    } catch (error) {
      console.error('Error in updateUser:', error);
      return {
        success: false,
        message: 'Failed to update user',
        error: error.message || 'Internal server error',
      };
    }
  }

  @MessagePattern('user.get_all_with_push_tokens')
  async getAllUsersWithPushTokens() {
    try {
      const users = await this.appService.getAllUsersWithPushTokens();
      return {
        success: true,
        message: 'Users retrieved successfully',
        data: users,
      };
    } catch (error) {
      console.error('Error in getAllUsersWithPushTokens:', error);
      return {
        success: false,
        message: 'Failed to get users',
        error: error.message || 'Internal server error',
      };
    }
  }

  @MessagePattern('health.check')
  async healthCheck() {
    try {
      await this.appService.checkDatabase();
      return {
        success: true,
        message: 'User service is healthy',
        data: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      return {
        success: false,
        message: 'User service is unhealthy',
        error: error.message || 'Internal server error',
      };
    }
  }
}
