import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PushLog } from './entities/push-log.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5434, // Match docker-compose port mapping
      username: 'admin',
      password: 'password',
      database: 'push_service',
      entities: [PushLog],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([PushLog]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
