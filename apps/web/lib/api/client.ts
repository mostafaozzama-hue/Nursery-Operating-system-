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
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

/**
 * Single transport function for every endpoint module. Auth-refresh handling
 * (if ever added) belongs here so it never changes callers' signatures.
 *
 * FormData bodies (Easy Enrollment, Product Gap H phase 2 - photo upload)
 * are passed through to fetch as-is, with no Content-Type header set - the
 * browser generates the multipart boundary itself, which only happens
 * correctly when it owns that header.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body === undefined ? undefined : isFormData ? (options.body as FormData) : JSON.stringify(options.body),
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

/** Easy Enrollment (Product Gap H, phase 2) - multipart uploads (Child photo). */
export const postForm = <T>(path: string, formData: FormData) =>
  request<T>(path, { method: 'POST', body: formData });

export const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body });

export const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });
