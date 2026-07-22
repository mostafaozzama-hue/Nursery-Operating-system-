import { randomUUID } from 'crypto';

/**
 * A client-supplied X-Request-Id is opaque correlation data, not a trust
 * signal - it must never be used for anything beyond a log line, and an
 * unbounded/malformed value must not reach pino as-is. Only a conservative
 * charset and length is accepted; anything else falls back to a fresh id.
 */
const VALID_REQUEST_ID = /^[a-zA-Z0-9_-]{1,100}$/;

export function generateRequestId(candidate: unknown): string {
  if (typeof candidate === 'string' && VALID_REQUEST_ID.test(candidate)) {
    return candidate;
  }
  return randomUUID();
}
