import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthService {
  constructor(private readonly jwtService: JwtService) {}

  async generateToken(userId: string, email: string): Promise<string> {
    const payload = { sub: userId, email };
    return await this.jwtService.sign(payload);
  }

  async validateToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verify(token);
    } catch (error) {
      return null;
    }
  }
}
