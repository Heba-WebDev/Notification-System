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
      host: 'localhost',
      port: 5434,
      username: 'admin',
      password: 'password',
      database: 'user_service',
      entities: [User, UserPreferences],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, UserPreferences]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
