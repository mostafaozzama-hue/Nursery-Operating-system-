import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Logger } from 'nestjs-pino';
import { AuthenticatedRequest } from '../../modules/identity/types/authenticated-request';
import { attachRequestLogBindings } from '../../logging/request-log-bindings';

/**
 * Global catch-all. Guard failures (e.g. JwtAuthGuard rejecting a request)
 * throw before any interceptor runs, so the X-Request-Id header and the
 * route/tenantId/userId log bindings are both set here too, not only in
 * RequestIdInterceptor - this is the only place guaranteed to run for every
 * thrown exception regardless of where in the pipeline it originated.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();
    // request.id is typed as pino-http's broader ReqId (number | string |
    // object) via ambient declaration merging, but our own genReqId
    // (generateRequestId) always returns a string.
    const requestId = typeof request.id === 'string' ? request.id : undefined;

    if (requestId) {
      response.setHeader('X-Request-Id', requestId);
    }
    attachRequestLogBindings(request);

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      this.logger.warn({ requestId, statusCode: status, err: exception }, exception.message);
      response.status(status).json(exception.getResponse());
      return;
    }

    // Never serialize an unknown error's message/stack to the client - domain
    // errors can carry PII-derived text (e.g. a constraint violation echoing
    // an email), and only the log line, not the wire response, should see it.
    this.logger.error({ requestId, err: exception }, 'Unhandled exception');
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      requestId,
    });
  }
}
