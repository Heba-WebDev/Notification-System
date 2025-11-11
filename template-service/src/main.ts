import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { RABBITMQ_CONFIG } from '@shared/config/rabbitmq.config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: RABBITMQ_CONFIG.urls,
        queue: RABBITMQ_CONFIG.queues.template,
        queueOptions: {
          durable: true,
        },
      },
    },
  );
  await app.listen();
  console.log('Template Service is listening');
}
bootstrap();
