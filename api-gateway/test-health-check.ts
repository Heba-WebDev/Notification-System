/**
 * Test script to debug health check issues
 * Run: npx ts-node -r tsconfig-paths/register test-health-check.ts
 */

import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

const RABBITMQ_URL =
  process.env.RABBITMQ_URL ||
  `amqp://${process.env.RABBITMQ_USERNAME || 'admin'}:${process.env.RABBITMQ_PASSWORD || 'password'}@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || '5672'}`;

const RABBITMQ_CONFIG = {
  urls: [RABBITMQ_URL],
  queue: process.env.RABBITMQ_QUEUE_USER || 'user_queue',
};

async function testHealthCheck() {
  console.log('Testing RabbitMQ health check...\n');

  const client: ClientProxy = ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: RABBITMQ_CONFIG.urls,
      queue: RABBITMQ_CONFIG.queue,
    },
  });

  try {
    console.log('1. Sending health.check message to User Service...');
    const response = await firstValueFrom(
      client.send('health.check', {}).pipe(timeout(5000)),
    );
    console.log('✅ Success! Response:', JSON.stringify(response, null, 2));
    return true;
  } catch (error: any) {
    console.error('❌ Failed! Error:', error.message);
    console.error('Error details:', error);
    return false;
  } finally {
    client.close();
  }
}

testHealthCheck()
  .then((success) => {
    console.log(`\nHealth check result: ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
