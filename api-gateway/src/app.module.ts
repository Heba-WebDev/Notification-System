import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { UsersController } from './users.controller';
import { AuthController } from './auth.controller';
import { StatusController } from './status.controller';
import { HealthController } from './health.controller';
import { TemplatesController } from './templates.controller';
import { AppService } from './app.service';
import { RABBITMQ_CONFIG } from '@shared/config/rabbitmq.config';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: RABBITMQ_CONFIG.urls,
          queue: RABBITMQ_CONFIG.queues.user,
        },
      },
      {
        name: 'TEMPLATE_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: RABBITMQ_CONFIG.urls,
          queue: RABBITMQ_CONFIG.queues.template,
        },
      },
      {
        name: 'EMAIL_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: RABBITMQ_CONFIG.urls,
          queue: RABBITMQ_CONFIG.queues.email,
        },
      },
      {
        name: 'PUSH_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: RABBITMQ_CONFIG.urls,
          queue: RABBITMQ_CONFIG.queues.push,
        },
      },
      {
        name: 'AUTH_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: RABBITMQ_CONFIG.urls,
          queue: RABBITMQ_CONFIG.queues.auth,
        },
      },
    ]),
  ],
  controllers: [AppController, UsersController, AuthController, StatusController, HealthController, TemplatesController],
  providers: [AppService, CircuitBreakerService, AuthGuard],
})
export class AppModule {}
