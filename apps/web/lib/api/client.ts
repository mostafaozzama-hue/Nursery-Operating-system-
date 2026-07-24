import type { ApiErrorBody } from '@nursery-os/contracts';
import { env } from '@/env';
import { ApiError } from './errors';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type QueryValue = string | number | boolean | undefined;

interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: Record<string, QueryValue>;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path, env.NEXT_PUBLIC_API_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function parseJson<T>(res: Response): Promise<T | undefined> {
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : undefined;
}

/**
 * Single transport function for every endpoint module. Auth-refresh handling
 * (if ever added) belongs here so it never changes callers' signatures.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const requestId = res.headers.get('X-Request-Id') ?? undefined;

  if (!res.ok) {
    const errorBody = await parseJson<ApiErrorBody>(res);
    throw new ApiError(
      res.status,
      errorBody ?? { statusCode: res.status, message: res.statusText },
      requestId,
    );
  }

  return (await parseJson<T>(res)) as T;
}

export const get = <T, Q extends object = object>(path: string, query?: Q) =>
  request<T>(path, {
    method: 'GET',
    query: query as unknown as Record<string, QueryValue> | undefined,
  });

export const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body });

export const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body });

export const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });
