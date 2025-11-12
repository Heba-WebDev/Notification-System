import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auth } from './entities/auth.entity';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthService } from './jwt.service';
import { AppService } from './app.service';
import { AppController } from './app.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'admin',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'auth_service',
      entities: [Auth],
      synchronize: process.env.SYNCHRONIZE === 'true' || process.env.NODE_ENV !== 'production', // Enable with SYNCHRONIZE=true env var
    }),
    TypeOrmModule.forFeature([Auth]),
    JwtModule.register({
      secret: (() => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET must be set in production');
          }
          return 'development-jwt-secret-change-in-production'; // Only for development
        }
        return secret;
      })(),
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, JwtAuthService],
})
export class AppModule {}
