import { IncomingMessage } from 'http';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { EnvironmentVariables } from '../config/environment-variables';
import { generateRequestId } from './generate-request-id';

// Redact by key, not by "we never log headers" convention - these three are
// the ones known to carry credentials today, but redaction is here so a
// future change that starts including headers wholesale doesn't silently
// leak them.
const REDACT_PATHS = ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'];

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>) => ({
        pinoHttp: {
          level: configService.get('LOG_LEVEL', { infer: true }),
          genReqId: (req: IncomingMessage) => generateRequestId(req.headers['x-request-id']),
          redact: { paths: REDACT_PATHS, censor: '[Redacted]' },
          // tenantId/userId/route are NOT set here via `customProps`: pino-http
          // calls that option twice per request (once at request-start, before
          // Express has dispatched to the matched route, and again at
          // response-finish) and bakes both results into the log line as
          // separate child-logger bindings. Since req.route differs between
          // those two calls, that produced literal duplicate "route" keys in
          // every log line. These fields are instead set exactly once, via
          // req.log.setBindings(...), from RequestIdInterceptor (success path)
          // and AllExceptionsFilter (error path, including guard rejections) -
          // both of which run only after routing/guards have resolved.
        },
      }),
    }),
  ],
})
export class LoggingModule {}
