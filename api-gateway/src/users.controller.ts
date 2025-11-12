import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Inject,
  HttpException,
  HttpStatus,
  HttpCode,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, throwError } from 'rxjs';
import { ResponseDto } from '@shared/index';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';
import { AuthGuard } from './auth.guard';

/**
 * Users Controller
 * Handles user-related operations like user creation and push token registration
 */
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
    @Inject('TEMPLATE_SERVICE') private readonly templateService: ClientProxy,
    @Inject('EMAIL_SERVICE') private readonly emailService: ClientProxy,
    @Inject('PUSH_SERVICE') private readonly pushService: ClientProxy,
  ) {}

  /**
   * Create a new user
   * Creates a new user account with preferences and password.
   * The user is created in both User Service and Auth Service.
   * If auth creation fails, the user is automatically rolled back.
   *
   * @param createUserDto - User creation data (name, email, password, push_token, preferences)
   * @returns Created user data
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description: `Creates a new user account with preferences and password.
    
The user is created in both User Service (profile) and Auth Service (credentials).
If auth creation fails, the user profile is automatically rolled back.

**Preferences:**
- email: Enable/disable email notifications (default: true)
- push: Enable/disable push notifications (default: true)`,
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      example: {
        success: true,
        message: 'User created successfully',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          name: 'John Doe',
          push_token: null,
          preferences: {
            email_notifications: true,
            push_notifications: true,
            language: 'en',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input or email already registered',
    schema: {
      example: {
        success: false,
        message: 'Email already registered',
        error: 'Email already registered',
      },
    },
  })
  async createUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<ResponseDto<any>> {
    let user_id: string | null = null;

    try {
      // Create user in User Service
      // push_token is already transformed (empty string -> null) by the DTO
      console.log(
        '[API Gateway] Sending user.create message to User Service:',
        {
          email: createUserDto.email,
          name: createUserDto.name,
          has_push_token: !!createUserDto.push_token,
          preferences: createUserDto.preferences,
        },
      );

      const userResponse = await firstValueFrom(
        this.userService
          .send('user.create', {
            email: createUserDto.email,
            name: createUserDto.name,
            push_token: createUserDto.push_token || null, // null if empty string was provided
            preferences: createUserDto.preferences || {
              email: true,
              push: true,
            },
          })
          .pipe(
            timeout(5000),
            catchError((error: any) => {
              console.error(
                '[API Gateway] Error sending user.create message:',
                {
                  error: error.message,
                  code: error.code,
                  name: error.name,
                  stack: error.stack,
                },
              );
              return throwError(() => error);
            }),
          ),
      );

      console.log('[API Gateway] Received response from User Service:', {
        success: userResponse.success,
        has_data: !!userResponse.data,
        user_id: userResponse.data?.id,
        message: userResponse.message,
        error: userResponse.error,
      });

      if (!userResponse.success || !userResponse.data?.id) {
        throw new HttpException(
          'Failed to create user',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      user_id = userResponse.data.id;

      // Create auth credentials in Auth Service
      let authResponse;
      try {
        authResponse = await firstValueFrom(
          this.authService
            .send('auth.register', {
              email: createUserDto.email,
              password: createUserDto.password,
              name: createUserDto.name,
              user_id: user_id,
            })
            .pipe(
              timeout(5000),
              catchError((error: any) => {
                // Extract error message from RPC exception
                const errorMessage =
                  error?.message ||
                  error?.response?.message ||
                  (typeof error?.response === 'string'
                    ? error.response
                    : null) ||
                  error?.error ||
                  'Failed to create auth credentials';

                // Create a new error with the extracted message
                const extractedError = new Error(errorMessage);
                (extractedError as any).status =
                  error?.status || HttpStatus.BAD_REQUEST;
                (extractedError as any).originalError = error;

                return throwError(() => extractedError);
              }),
            ),
        );

        // Auth service returns { token, user_id } on success, not { success: true }
        // If we get here without exception, registration was successful
        if (!authResponse || !authResponse.token) {
          throw new HttpException(
            'Failed to create auth credentials - Invalid response',
            HttpStatus.BAD_REQUEST,
          );
        }
      } catch (error: any) {
        // Log full error structure for debugging
        console.error(
          '[API Gateway] Auth service registration error - Full error object:',
          {
            message: error?.message,
            status: error?.status,
            response: error?.response,
            error: error?.error,
            stack: error?.stack,
            name: error?.name,
            toString: error?.toString?.(),
          },
        );

        // Extract error message from RPC exception
        // NestJS RPC exceptions can have the message in various places
        let errorMessage = 'Failed to create auth credentials';

        // Try different locations for the error message
        if (error?.message) {
          errorMessage = error.message;
        } else if (error?.response?.message) {
          errorMessage = error.response.message;
        } else if (typeof error?.response === 'string') {
          errorMessage = error.response;
        } else if (error?.error) {
          // Sometimes the error is nested in an 'error' property
          errorMessage =
            typeof error.error === 'string'
              ? error.error
              : error.error?.message || errorMessage;
        }

        // Clean up the error message (remove any extra formatting)
        errorMessage = errorMessage.trim();

        // Determine appropriate HTTP status - ensure it's always a valid number
        // UnauthorizedException from auth service should map to 400 (Bad Request) for registration
        let statusCode = HttpStatus.BAD_REQUEST; // Default to 400

        if (error?.status) {
          // If error.status is a number, use it (but map 401 to 400 for registration)
          const status =
            typeof error.status === 'number'
              ? error.status
              : parseInt(String(error.status), 10);
          if (!isNaN(status) && status >= 400 && status <= 599) {
            statusCode = status === 401 ? HttpStatus.BAD_REQUEST : status;
          }
        } else if (error?.response?.statusCode) {
          // Sometimes status is in response.statusCode
          const status =
            typeof error.response.statusCode === 'number'
              ? error.response.statusCode
              : parseInt(String(error.response.statusCode), 10);
          if (!isNaN(status) && status >= 400 && status <= 599) {
            statusCode = status === 401 ? HttpStatus.BAD_REQUEST : status;
          }
        }

        // Ensure statusCode is a valid HTTP status code (between 400-599)
        if (statusCode < 400 || statusCode > 599) {
          statusCode = HttpStatus.BAD_REQUEST;
        }

        console.error(
          '[API Gateway] Auth service registration error - Extracted:',
          {
            message: errorMessage,
            status: statusCode,
          },
        );

        throw new HttpException(errorMessage, statusCode);
      }

      // Queue welcome notifications if user has them enabled
      try {
        // Get user data with preferences to check notification settings
        const userWithPreferencesResponse = await firstValueFrom(
          this.userService.send('user.get_by_id', { user_id }),
        );

        if (
          userWithPreferencesResponse.success &&
          userWithPreferencesResponse.data
        ) {
          const user = userWithPreferencesResponse.data;
          const userPreferences = user.preferences;

          // Queue welcome email if email notifications are enabled
          if (userPreferences?.email_notifications) {
            try {
              const emailTemplateResponse = await firstValueFrom(
                this.templateService
                  .send('template.get_by_name', {
                    name: 'welcome-email',
                    type: 'email',
                    language: userPreferences.language || 'en',
                  })
                  .pipe(timeout(3000)),
              );

              if (emailTemplateResponse.success && emailTemplateResponse.data) {
                const requestId = `welcome-${user_id}-${Date.now()}-email`;
                this.emailService.emit('notification.email', {
                  request_id: requestId,
                  user: user,
                  template: emailTemplateResponse.data,
                  variables: {
                    name: user.name || 'User',
                    email: user.email,
                  },
                  priority: 0,
                  metadata: {},
                });
              }
            } catch (error) {
              // Log but don't fail the request if notification queuing fails
              console.error(
                '[UsersController] Failed to queue welcome email:',
                error,
              );
            }
          }

          // Queue welcome push if push notifications are enabled and user has push token
          if (userPreferences?.push_notifications && user.push_token) {
            try {
              const pushTemplateResponse = await firstValueFrom(
                this.templateService
                  .send('template.get_by_name', {
                    name: 'welcome-push',
                    type: 'push',
                    language: userPreferences.language || 'en',
                  })
                  .pipe(timeout(3000)),
              );

              if (pushTemplateResponse.success && pushTemplateResponse.data) {
                const requestId = `welcome-${user_id}-${Date.now()}-push`;
                this.pushService.emit('notification.push', {
                  request_id: requestId,
                  user: user,
                  template: pushTemplateResponse.data,
                  variables: {
                    name: user.name || 'User',
                  },
                  priority: 0,
                  metadata: {},
                });
              }
            } catch (error) {
              // Log but don't fail the request if notification queuing fails
              console.error(
                '[UsersController] Failed to queue welcome push:',
                error,
              );
            }
          }
        }
      } catch (error) {
        // Log but don't fail the request if notification queuing fails
        console.error(
          '[UsersController] Failed to queue welcome notifications:',
          error,
        );
      }

      return {
        success: true,
        message: 'User created successfully',
        data: userResponse.data,
      };
    } catch (error: any) {
      // Rollback: If auth creation failed but user was created
      if (user_id) {
        try {
          console.log(
            `[API Gateway] Rolling back user creation for user_id: ${user_id}`,
          );
          await firstValueFrom(
            this.userService
              .send('user.delete', { user_id })
              .pipe(timeout(5000)),
          );
          console.log(
            `[API Gateway] Successfully rolled back user creation for user_id: ${user_id}`,
          );
        } catch (rollbackError) {
          console.error(
            `[API Gateway] Failed to rollback user creation for user_id: ${user_id}`,
            rollbackError,
          );
        }
      }

      // If it's already an HttpException (from inner catch), re-throw it
      if (error instanceof HttpException) {
        throw error;
      }

      // Otherwise, create a new HttpException with the error message
      console.error('[API Gateway] Error in createUser:', {
        error: error?.message,
        code: error?.code,
        name: error?.name,
        user_id,
      });
      const errorMessage = error?.message || 'Failed to create user';
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Update push token for authenticated user
   * Associates a web push subscription token with the authenticated user's account.
   * This token is used to send push notifications to the user's browser.
   *
   * @param req - Request object containing authenticated user
   * @param body - Push token data
   * @returns Updated user data
   */
  @Patch('me/push-token')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update my push token',
    description: `Updates the web push subscription token for the authenticated user.
    
The push token should be obtained from the browser's Push API.
This endpoint is typically called after a user grants notification permissions.

**Push Token Format:**
The push token should be a JSON string containing the PushSubscription object:
\`\`\`json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
\`\`\`

**Authentication Required:** This endpoint requires a valid JWT token. Click the "Authorize" button above and enter your token.

See the Push Token Manager page at \`/push-tokens.html\` for a helper interface.`,
  })
  @ApiBody({ type: UpdatePushTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Push token updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Push token updated successfully',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          push_token: '{"endpoint":"https://...","keys":{...}}',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid push token',
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Missing or invalid JWT token. Make sure you have clicked "Authorize" and entered your token.',
  })
  async updateMyPushToken(
    @Request() req: any,
    @Body() body: UpdatePushTokenDto,
  ): Promise<ResponseDto<any>> {
    const userId = req.user?.user_id;

    if (!userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

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
        message: 'Push token updated successfully',
        data: response.data,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      return {
        success: false,
        message: 'Failed to update push token',
        error: error.message,
      };
    }
  }

  /**
   * Get my preferences
   * Retrieves notification preferences for the authenticated user.
   *
   * @param req - Request object containing authenticated user
   * @returns User preferences
   */
  @Get('me/preferences')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get my preferences',
    description: `Retrieves notification preferences for the authenticated user.

**Authentication Required:** This endpoint requires a valid JWT token. Click the "Authorize" button above and enter your token.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Preferences retrieved successfully',
        data: {
          email_notifications: true,
          push_notifications: true,
          language: 'en',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Missing or invalid JWT token. Make sure you have clicked "Authorize" and entered your token.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getMyPreferences(@Request() req: any): Promise<ResponseDto<any>> {
    const userId = req.user?.user_id;

    if (!userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const userResponse = await firstValueFrom(
        this.userService.send('user.get_by_id', { user_id: userId }),
      );

      if (!userResponse.success || !userResponse.data) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const user = userResponse.data;
      const preferences = user.preferences || null;

      return {
        success: true,
        message: 'Preferences retrieved successfully',
        data: preferences
          ? {
              email_notifications: preferences.email_notifications,
              push_notifications: preferences.push_notifications,
              language: preferences.language,
            }
          : null,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to get preferences',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update user preferences
   * Updates notification preferences for the authenticated user.
   *
   * @param req - Request object containing authenticated user
   * @param body - Preferences data
   * @returns Updated user data
   */
  @Patch('me/preferences')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update my preferences',
    description: `Updates notification preferences for the authenticated user.
    
**Preferences:**
- email: Enable/disable email notifications (boolean)
- push: Enable/disable push notifications (boolean)
- language: Preferred language (string, default: 'en')

**Authentication Required:** This endpoint requires a valid JWT token. Click the "Authorize" button above and enter your token.`,
  })
  @ApiBody({ type: UpdatePreferencesDto })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Preferences updated successfully',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          preferences: {
            email_notifications: true,
            push_notifications: false,
            language: 'en',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid preferences',
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Missing or invalid JWT token. Make sure you have clicked "Authorize" and entered your token.',
  })
  async updateMyPreferences(
    @Request() req: any,
    @Body() body: UpdatePreferencesDto,
  ): Promise<ResponseDto<any>> {
    const userId = req.user?.user_id;

    if (!userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      // Map API format to service format
      const preferences: any = {};
      if (body.email !== undefined) {
        preferences.email_notifications = body.email;
      }
      if (body.push !== undefined) {
        preferences.push_notifications = body.push;
      }
      if (body.language !== undefined) {
        preferences.language = body.language;
      }

      const response = await firstValueFrom(
        this.userService.send('user.update', {
          user_id: userId,
          data: { preferences },
        }),
      );

      if (!response.success) {
        throw new HttpException(
          response.message || 'Failed to update preferences',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Get updated user data with preferences to check notification settings
      const updatedUserResponse = await firstValueFrom(
        this.userService.send('user.get_by_id', { user_id: userId }),
      );

      if (updatedUserResponse.success && updatedUserResponse.data) {
        const user = updatedUserResponse.data;
        const userPreferences = user.preferences;

        // Queue notifications if user has them enabled
        if (userPreferences) {
          // Queue email notification if email notifications are enabled
          if (userPreferences.email_notifications) {
            try {
              const emailTemplateResponse = await firstValueFrom(
                this.templateService
                  .send('template.get_by_name', {
                    name: 'preferences-changed-email',
                    type: 'email',
                    language: userPreferences.language || 'en',
                  })
                  .pipe(timeout(3000)),
              );

              if (emailTemplateResponse.success && emailTemplateResponse.data) {
                const requestId = `pref-${userId}-${Date.now()}-email`;
                this.emailService.emit('notification.email', {
                  request_id: requestId,
                  user: user,
                  template: emailTemplateResponse.data,
                  variables: {
                    name: user.name || 'User',
                    email_notifications: userPreferences.email_notifications
                      ? 'Enabled'
                      : 'Disabled',
                    push_notifications: userPreferences.push_notifications
                      ? 'Enabled'
                      : 'Disabled',
                    language: userPreferences.language || 'en',
                  },
                  priority: 0,
                  metadata: {},
                });
              }
            } catch (error) {
              // Log but don't fail the request if notification queuing fails
              console.error(
                '[UsersController] Failed to queue email notification:',
                error,
              );
            }
          }

          // Queue push notification if push notifications are enabled and user has push token
          if (userPreferences.push_notifications && user.push_token) {
            try {
              const pushTemplateResponse = await firstValueFrom(
                this.templateService
                  .send('template.get_by_name', {
                    name: 'preferences-changed-push',
                    type: 'push',
                    language: userPreferences.language || 'en',
                  })
                  .pipe(timeout(3000)),
              );

              if (pushTemplateResponse.success && pushTemplateResponse.data) {
                const requestId = `pref-${userId}-${Date.now()}-push`;
                this.pushService.emit('notification.push', {
                  request_id: requestId,
                  user: user,
                  template: pushTemplateResponse.data,
                  variables: {},
                  priority: 0,
                  metadata: {},
                });
              }
            } catch (error) {
              // Log but don't fail the request if notification queuing fails
              console.error(
                '[UsersController] Failed to queue push notification:',
                error,
              );
            }
          }
        }
      }

      return {
        success: true,
        message: 'Preferences updated successfully',
        data: response.data,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      return {
        success: false,
        message: 'Failed to update preferences',
        error: error.message,
      };
    }
  }
}
