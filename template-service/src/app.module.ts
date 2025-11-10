import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Template } from './entities/template.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      username: 'admin',
      password: 'password',
      database: 'template_service',
      entities: [Template],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Template]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
