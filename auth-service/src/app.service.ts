import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from './entities/auth.entity';
import * as bcrypt from 'bcrypt';
import { JwtAuthService } from './jwt.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly jwtAuthService: JwtAuthService,
  ) {}

  async register(
    registerDto: RegisterDto & { user_id: string }, // user_id provided by API Gateway
  ): Promise<{ token: string; user_id: string }> {
    // Check if email already exists
    const existing = await this.authRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existing) {
      throw new UnauthorizedException('Email already registered');
    }

    // Check if user_id already has auth record
    const existingByUserId = await this.authRepository.findOne({
      where: { user_id: registerDto.user_id },
    });

    if (existingByUserId) {
      throw new UnauthorizedException(
        'User already has authentication credentials',
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Create auth record with user_id provided by API Gateway
    const auth = this.authRepository.create({
      email: registerDto.email,
      password_hash: passwordHash,
      user_id: registerDto.user_id, // user_id comes from API Gateway (User Service)
    });

    const savedAuth = await this.authRepository.save(auth);

    const token = await this.jwtAuthService.generateToken(
      savedAuth.user_id,
      savedAuth.email,
    );

    return {
      token,
      user_id: savedAuth.user_id,
    };
  }

  async login(loginDto: LoginDto): Promise<{ token: string; user_id: string }> {
    const auth = await this.authRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!auth) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      auth.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.jwtAuthService.generateToken(
      auth.user_id,
      auth.email,
    );

    return {
      token,
      user_id: auth.user_id,
    };
  }

  async validateToken(
    token: string,
  ): Promise<{ valid: boolean; user_id?: string; email?: string }> {
    const payload = await this.jwtAuthService.validateToken(token);

    if (!payload) {
      return { valid: false };
    }

    return {
      valid: true,
      user_id: payload.sub,
      email: payload.email,
    };
  }

  async checkDatabase(): Promise<void> {
    await this.authRepository.query('SELECT 1');
  }
}
