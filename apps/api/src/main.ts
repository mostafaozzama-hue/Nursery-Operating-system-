import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { EnvironmentVariables, NodeEnv } from './config/environment-variables';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  // Security review Pass 2 (S3): production deploys behind exactly one
  // reverse-proxy hop (see the CORS comment below). Without this, Express's
  // default req.ip is the proxy's own address for every request - the S2
  // auth rate limiter (ThrottlerGuard, identity.controller.ts) tracks by
  // req.ip, so it would throttle all users behind that proxy as one shared
  // bucket instead of per real client. Setting trust proxy to the number 1
  // (not `true`) makes Express derive req.ip from the single trusted hop of
  // X-Forwarded-For and nothing further back - a client can't spoof extra
  // hops onto the front of that header to impersonate a different proxy,
  // the way an unbounded `true` would allow. Not on INestApplication's own
  // interface - Express's underlying instance is the only thing this
  // setting exists on.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

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

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  // Security review Pass 2 (S1): the API schema (every route/DTO/field name)
  // is real reconnaissance value handed to anyone who can reach the API -
  // only worth exposing outside production, where it's a development aid.
  if (configService.get('NODE_ENV', { infer: true }) !== NodeEnv.Production) {
    app.use('/docs', helmet(helmetOptions));
    const swaggerConfig = new DocumentBuilder().setTitle('Nursery OS API').setVersion('0.0.0').build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(configService.get('PORT', { infer: true }));
}

bootstrap();
