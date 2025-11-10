import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailLog } from './entities/email-log.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      username: 'admin',
      password: 'password',
      database: 'email_service',
      entities: [EmailLog],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([EmailLog]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
