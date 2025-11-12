import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './entities/user.entity';
import { UserPreferences } from './entities/user-preferences.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'admin',
      password: String(process.env.DB_PASSWORD || ''),
      database: process.env.DB_NAME || 'user_service',
      entities: [User, UserPreferences],
      synchronize: process.env.SYNCHRONIZE === 'true' || process.env.NODE_ENV !== 'production', // Enable with SYNCHRONIZE=true env var
    }),
    TypeOrmModule.forFeature([User, UserPreferences]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
