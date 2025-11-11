import {
  Controller,
  Post,
  Body,
  Inject,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { LoginDto } from './dto/index';

/**
 * Authentication Controller
 * Handles user login
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
  ) {}

  /**
   * Login with email and password
   * Authenticates a user and returns a JWT token.
   *
   * @param loginDto - User login credentials (email, password)
   * @returns JWT token and user_id
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticates a user with email and password. Returns a JWT token that can be used for authenticated requests. The token expires in 24 hours.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        success: true,
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials',
    schema: {
      example: {
        success: false,
        message: 'Invalid credentials',
        error: 'Invalid credentials',
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    try {
      const response = await firstValueFrom(
        this.authService.send('auth.login', loginDto).pipe(timeout(5000)),
      );
      return response;
    } catch (error) {
      throw new HttpException(
        error.message || 'Login failed',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
