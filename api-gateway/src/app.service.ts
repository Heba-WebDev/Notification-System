import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class AppService {
  constructor(
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
  ) {}

  generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async checkRabbitMQ(): Promise<boolean> {
    try {
      // timeout to fail fast if RabbitMQ is down
      await firstValueFrom(
        this.userService.send('health.check', {}).pipe(timeout(2000)),
      );
      return true;
    } catch (error) {
      // If service is not available or times out, RabbitMQ might be down
      // or service might be down, but we'll consider it a connectivity issue
      return false;
    }
  }
}
