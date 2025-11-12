import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { RABBITMQ_CONFIG } from '@shared/config/rabbitmq.config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: RABBITMQ_CONFIG.urls,
        queue: RABBITMQ_CONFIG.queues.user,
        queueOptions: {
          durable: true,
        },
      },
    },
  );

  await app.listen();
  console.log('User Service is listening');
}
bootstrap();
