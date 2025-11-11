import { Injectable } from '@nestjs/common';

interface CircuitState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

@Injectable()
export class CircuitBreakerService {
  private circuits: Map<string, CircuitState> = new Map();
  private readonly failureThreshold = 5;
  private readonly timeout = 60000; // 1 minute

  isOpen(serviceName: string): boolean {
    const circuit = this.circuits.get(serviceName);
    if (!circuit) return false;

    if (circuit.state === 'open') {
      // Check if timeout has passed
      if (Date.now() - circuit.lastFailureTime > this.timeout) {
        circuit.state = 'half-open';
        circuit.failures = 0;
        return false; // Allow one test call
      }
      return true; // Circuit is open
    }

    return false;
  }

  recordSuccess(serviceName: string): void {
    const circuit = this.circuits.get(serviceName);
    if (circuit) {
      circuit.state = 'closed';
      circuit.failures = 0;
    }
  }

  recordFailure(serviceName: string): void {
    const service = this.circuits.get(serviceName) || {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed' as const,
    };

    service.failures++;
    service.lastFailureTime = Date.now();

    if (service.failures >= this.failureThreshold) {
      service.state = 'open';
    }

    this.circuits.set(serviceName, service);
  }
}
