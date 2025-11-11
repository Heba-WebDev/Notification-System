import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';
import { RegisterDto, LoginDto } from './dto/index';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern('auth.register')
  async register(@Payload() registerDto: RegisterDto & { user_id: string }) {
    return await this.appService.register(registerDto);
  }

  @MessagePattern('auth.login')
  async login(@Payload() loginDto: LoginDto) {
    return await this.appService.login(loginDto);
  }

  @MessagePattern('auth.validate_token')
  async validateToken(@Payload() data: { token: string }) {
    return await this.appService.validateToken(data.token);
  }

  @MessagePattern('health.check')
  async healthCheck() {
    try {
      await this.appService.checkDatabase();
      return {
        success: true,
        message: 'Auth service is healthy',
        data: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Auth service is unhealthy',
        error: error.message || 'Internal server error',
      };
    }
  }
}
