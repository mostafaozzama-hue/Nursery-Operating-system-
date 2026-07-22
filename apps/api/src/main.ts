import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { EnvironmentVariables } from './config/environment-variables';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
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

  const helmetOptions: Parameters<typeof helmet>[0] = {
    // Default 'same-origin' would block the cross-origin credentialed
    // fetches CORS_ALLOWED_ORIGINS explicitly permits for local dev - CORP
    // and CORS are independent gates, and CORS allowing a request does not
    // stop CORP from still blocking it.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // No use of SharedArrayBuffer / cross-origin isolation; the default risks
    // silently breaking any future external asset added to Swagger, for zero
    // benefit today.
    crossOriginEmbedderPolicy: false,
    // contentSecurityPolicy is intentionally left at Helmet's default for
    // both policies below: script-src 'self' already covers Swagger's three
    // same-origin <script src> tags (its spec/init JS is served as an actual
    // file, never inlined, in the installed swagger-ui-dist version), and
    // style-src already includes 'unsafe-inline' by default, covering
    // Swagger's one fixed inline <style> block. No relaxation is needed.
  };

  // Registration order matters here: Express runs every matching middleware
  // in registration order, and helmet's sub-middlewares all call
  // res.setHeader (overwrite, not append) - so whichever call runs LAST for
  // a given header wins. The global policy must be registered first so the
  // /docs-scoped policy (registered second, matching only /docs*) overwrites
  // it for that path, while every other route only ever hits the global one.
  // Getting this backwards would make the global policy silently clobber
  // the Swagger-specific one instead of the other way around. The two
  // policies happen to be identical today (Swagger needs no exception) -
  // kept as separate registrations anyway so a future divergence (e.g. an
  // upgrade that changes how Swagger serves its assets) only ever needs to
  // touch the /docs-scoped one, never the real API's policy.
  app.use(helmet(helmetOptions));
  app.use('/docs', helmet(helmetOptions));

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
