import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files from public directory at root level
  // Works in both dev (ts-node-dev) and production (compiled)
  const publicPath = join(process.cwd(), 'public');
  app.useStaticAssets(publicPath, {
    prefix: '/', // Serve at root, not under /api
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  await app.listen(3000);
  console.log('API Gateway running on port 3000');
  console.log('Push Token Manager: http://localhost:3000/push-tokens.html');
}
bootstrap();
