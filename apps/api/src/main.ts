import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { EnvironmentVariables } from './config/environment-variables';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const configService = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  // Primarily serves local development, where the frontend and API run on
  // different ports. Production deploys frontend+API same-origin behind a
  // reverse proxy, so same-origin requests never trigger CORS in the first
  // place - this allowlist is not what protects production traffic.
  app.enableCors({
    origin: configService.get('CORS_ALLOWED_ORIGINS', { infer: true }),
    credentials: true,
  });

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const swaggerConfig = new DocumentBuilder().setTitle('Nursery OS API').setVersion('0.0.0').build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(configService.get('PORT', { infer: true }));
}

bootstrap();
