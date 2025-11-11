import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { UsersController } from './users.controller';
import { AppService } from './app.service';
import { RABBITMQ_CONFIG } from '@shared/config/rabbitmq.config';
import { CircuitBreakerService } from './circuit-breaker.service';

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
    ]),
  ],
  controllers: [AppController, UsersController],
  providers: [AppService, CircuitBreakerService],
})
export class AppModule {}
