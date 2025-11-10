import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
