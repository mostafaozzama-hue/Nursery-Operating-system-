import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../modules/identity/types/authenticated-request';
import { attachRequestLogBindings } from '../../logging/request-log-bindings';

/**
 * Echoes the request id pino-http already assigned (req.id) back as a
 * response header, and attaches route/tenantId/userId to the request's
 * pino child logger exactly once. Registered as a Nest interceptor rather
 * than raw middleware so it's guaranteed to run after pino-http's own
 * middleware and after guards regardless of module registration order -
 * Nest's pipeline is always middleware -> guards -> interceptors, so req.id
 * and (for authenticated routes) req.user are already set by the time this
 * runs. Guard rejections never reach here - AllExceptionsFilter covers those.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    // req.id is typed as pino-http's broader ReqId (number | string | object)
    // via ambient declaration merging, but our own genReqId (generateRequestId)
    // always returns a string - narrow with a runtime check rather than a cast.
    if (typeof req.id === 'string') {
      res.setHeader('X-Request-Id', req.id);
    }
    attachRequestLogBindings(req);
    return next.handle();
  }
}
