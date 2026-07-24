import type { ApiErrorBody } from '@nursery-os/contracts';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: ApiErrorBody,
    public readonly requestId?: string,
  ) {
    super(typeof body.message === 'string' ? body.message : body.message.join(', '));
    this.name = 'ApiError';
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
