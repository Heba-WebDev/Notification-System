import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Notification System API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token (without "Bearer" prefix)',
      },
      'JWT-auth', // matching up with @ApiBearerAuth() in controller!
    )
    .addTag('Health', 'Service health check endpoints')
    .addTag('Authentication', 'User login endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Templates', 'Template management endpoints')
    .addTag('Notifications', 'Send email and push notifications')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // token after page refresh
      tagsSorter: 'none',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || process.env.API_GATEWAY_PORT || 3000;
  await app.listen(port);
  console.log(`API Gateway running on port ${port}`);
  console.log(`Push Token Manager: http://localhost:${port}/push-tokens.html`);
  console.log(`Swagger Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
