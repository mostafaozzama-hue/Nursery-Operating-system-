import { AuthenticatedRequest } from '../modules/identity/types/authenticated-request';

/**
 * tenantId/userId come only from req.user, which JwtAuthGuard sets after
 * verifying the JWT - callers invoke this after guards have run (successfully
 * or not), so a failed/missing auth attempt yields both left undefined rather
 * than any unverified claim.
 *
 * route prefers the matched route template (bounded cardinality) and falls
 * back to the raw path so a 404 or routing failure still logs an observable
 * path instead of none at all.
 */
function buildRequestLogBindings(req: AuthenticatedRequest) {
  return {
    tenantId: req.user?.tenantId,
    userId: req.user?.sub,
    route: req.route?.path ?? req.originalUrl,
  };
}

const alreadyBound = new WeakSet<AuthenticatedRequest>();

/**
 * Both RequestIdInterceptor (success path) and AllExceptionsFilter (error
 * path) call this - a handler that throws is caught by the filter *after*
 * the interceptor already ran, so both fire for that one request. pino's
 * setBindings appends a fresh chindings fragment on every call rather than
 * deduplicating, so calling it twice would bake two copies of the same
 * fields into the log line. Track per-request with a WeakSet so only the
 * first call actually attaches bindings.
 */
export function attachRequestLogBindings(req: AuthenticatedRequest): void {
  if (alreadyBound.has(req)) {
    return;
  }
  req.log.setBindings(buildRequestLogBindings(req));
  alreadyBound.add(req);
}
