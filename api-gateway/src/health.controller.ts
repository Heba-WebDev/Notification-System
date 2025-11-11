import {
  Controller,
  Get,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { ResponseDto } from '@shared/index';
import { AppService } from './app.service';

/**
 * Health Controller
 * Handles health checks for API Gateway and all microservices
 * Each service has its own health endpoint that the API Gateway calls
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
    @Inject('TEMPLATE_SERVICE') private readonly templateService: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
    @Inject('EMAIL_SERVICE') private readonly emailService: ClientProxy,
    @Inject('PUSH_SERVICE') private readonly pushService: ClientProxy,
    private readonly appService: AppService,
  ) {}

  /**
   * Main health check endpoint
   * Aggregates health status from API Gateway and all microservices.
   * No authentication required.
   *
   * @returns Combined health status of all services
   */
  @Get()
  @ApiOperation({
    summary: 'Overall health check',
    description:
      'Returns the aggregated health status of the API Gateway and all microservices. Calls each service\'s individual health endpoint and combines the results. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check response',
    schema: {
      example: {
        success: true,
        message: 'All services are healthy',
        data: {
          status: 'healthy',
          api_gateway: {
            status: 'healthy',
            rabbitmq: true,
          },
          services: {
            user_service: { status: 'healthy', timestamp: '2024-01-01T00:00:00.000Z' },
            template_service: { status: 'healthy', timestamp: '2024-01-01T00:00:00.000Z' },
            auth_service: { status: 'healthy', timestamp: '2024-01-01T00:00:00.000Z' },
            email_service: { status: 'healthy', timestamp: '2024-01-01T00:00:00.000Z' },
            push_service: { status: 'healthy', timestamp: '2024-01-01T00:00:00.000Z' },
          },
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      },
    },
  })
  async getHealth(): Promise<ResponseDto<any>> {
    // Check API Gateway health (RabbitMQ connectivity)
    const apiGatewayHealth = {
      status: 'healthy' as 'healthy' | 'unhealthy',
      rabbitmq: await this.appService.checkRabbitMQ(),
    };
    apiGatewayHealth.status = apiGatewayHealth.rabbitmq ? 'healthy' : 'unhealthy';

    // Check all microservices by calling their individual health endpoints
    const services: Record<string, any> = {};
    
    const serviceChecks = await Promise.allSettled([
      this.getUserServiceHealthInternal(),
      this.getTemplateServiceHealthInternal(),
      this.getAuthServiceHealthInternal(),
      this.getEmailServiceHealthInternal(),
      this.getPushServiceHealthInternal(),
    ]);

    const serviceNames = [
      'user_service',
      'template_service',
      'auth_service',
      'email_service',
      'push_service',
    ];

    serviceChecks.forEach((result, index) => {
      const serviceName = serviceNames[index];
      if (result.status === 'fulfilled') {
        // Extract status from ResponseDto
        const healthResponse = result.value;
        services[serviceName] = {
          status: healthResponse.data?.status || (healthResponse.success ? 'healthy' : 'unhealthy'),
          timestamp: healthResponse.data?.timestamp || new Date().toISOString(),
          ...(healthResponse.data?.error && { error: healthResponse.data.error }),
        };
      } else {
        services[serviceName] = {
          status: 'unhealthy',
          error: result.reason?.message || 'Service check failed',
          timestamp: new Date().toISOString(),
        };
      }
    });

    // Determine overall health
    const allServicesHealthy = Object.values(services).every(
      (service: any) => service.status === 'healthy',
    );
    const isHealthy = apiGatewayHealth.status === 'healthy' && allServicesHealthy;

    return {
      success: isHealthy,
      message: isHealthy
        ? 'All services are healthy'
        : 'One or more services are unhealthy',
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        api_gateway: apiGatewayHealth,
        services,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * User Service health endpoint
   * API Gateway calls this to check User Service health
   */
  @Get('user-service')
  @ApiOperation({
    summary: 'User Service health check',
    description: 'Returns the health status of the User Service. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'User Service health status',
  })
  async getUserServiceHealth(): Promise<ResponseDto<any>> {
    return await this.getUserServiceHealthInternal();
  }

  /**
   * Template Service health endpoint
   * API Gateway calls this to check Template Service health
   */
  @Get('template-service')
  @ApiOperation({
    summary: 'Template Service health check',
    description: 'Returns the health status of the Template Service. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Template Service health status',
  })
  async getTemplateServiceHealth(): Promise<ResponseDto<any>> {
    return await this.getTemplateServiceHealthInternal();
  }

  /**
   * Auth Service health endpoint
   * API Gateway calls this to check Auth Service health
   */
  @Get('auth-service')
  @ApiOperation({
    summary: 'Auth Service health check',
    description: 'Returns the health status of the Auth Service. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Auth Service health status',
  })
  async getAuthServiceHealth(): Promise<ResponseDto<any>> {
    return await this.getAuthServiceHealthInternal();
  }

  /**
   * Email Service health endpoint
   * API Gateway calls this to check Email Service health
   */
  @Get('email-service')
  @ApiOperation({
    summary: 'Email Service health check',
    description: 'Returns the health status of the Email Service. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email Service health status',
  })
  async getEmailServiceHealth(): Promise<ResponseDto<any>> {
    return await this.getEmailServiceHealthInternal();
  }

  /**
   * Push Service health endpoint
   * API Gateway calls this to check Push Service health
   */
  @Get('push-service')
  @ApiOperation({
    summary: 'Push Service health check',
    description: 'Returns the health status of the Push Service. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Push Service health status',
  })
  async getPushServiceHealth(): Promise<ResponseDto<any>> {
    return await this.getPushServiceHealthInternal();
  }

  /**
   * API Gateway health endpoint
   */
  @Get('api-gateway')
  @ApiOperation({
    summary: 'API Gateway health check',
    description: 'Returns the health status of the API Gateway itself. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'API Gateway health status',
  })
  async getApiGatewayHealth(): Promise<ResponseDto<any>> {
    const rabbitmq = await this.appService.checkRabbitMQ();
    const isHealthy = rabbitmq;

    return {
      success: isHealthy,
      message: isHealthy
        ? 'API Gateway is healthy'
        : 'API Gateway is unhealthy',
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        rabbitmq,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Internal methods to check each service
  private async getUserServiceHealthInternal(): Promise<ResponseDto<any>> {
    return await this.checkService('User Service', this.userService);
  }

  private async getTemplateServiceHealthInternal(): Promise<ResponseDto<any>> {
    return await this.checkService('Template Service', this.templateService);
  }

  private async getAuthServiceHealthInternal(): Promise<ResponseDto<any>> {
    return await this.checkService('Auth Service', this.authService);
  }

  private async getEmailServiceHealthInternal(): Promise<ResponseDto<any>> {
    return await this.checkService('Email Service', this.emailService);
  }

  private async getPushServiceHealthInternal(): Promise<ResponseDto<any>> {
    return await this.checkService('Push Service', this.pushService);
  }

  /**
   * Check individual service health via message pattern
   */
  private async checkService(
    serviceName: string,
    serviceClient: ClientProxy,
  ): Promise<ResponseDto<any>> {
    try {
      const response = await firstValueFrom(
        serviceClient.send('health.check', {}).pipe(timeout(3000)),
      );

      if (response && response.success) {
        return {
          success: true,
          message: `${serviceName} is healthy`,
          data: {
            status: 'healthy',
            timestamp: response.data?.timestamp || new Date().toISOString(),
          },
        };
      } else {
        return {
          success: false,
          message: `${serviceName} is unhealthy`,
          data: {
            status: 'unhealthy',
            error: response?.message || 'Service returned unhealthy status',
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `${serviceName} is unhealthy`,
        data: {
          status: 'unhealthy',
          error: error.message || 'Service check failed',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

