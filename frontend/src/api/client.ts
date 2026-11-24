import { logger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE } from './config';
import type { FieldError, Problem, ProblemCode } from './types';

/** An error response from the API (application/problem+json, RFC 9457). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ProblemCode | 'UNKNOWN';
  readonly detail?: string;
  readonly traceId?: string;
  readonly fieldErrors: FieldError[];
  readonly retryAfter?: number;

  constructor(status: number, problem: Partial<Problem>, retryAfter?: number) {
    super(problem.detail ?? problem.title ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = problem.code ?? 'UNKNOWN';
    this.detail = problem.detail;
    this.traceId = problem.traceId;
    this.fieldErrors = problem.errors ?? [];
    this.retryAfter = retryAfter;
  }
}

/** The request never reached the server (offline, DNS, CORS, server down). */
export class NetworkError extends Error {
  constructor(options?: ErrorOptions) {
    super('Cannot reach the server', options);
    this.name = 'NetworkError';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Send the bearer token (default). Set false for login/register/health. */
  auth?: boolean;
  signal?: AbortSignal;
}

async function readProblem(res: Response): Promise<Partial<Problem>> {
  try {
    const data: unknown = await res.json();
    return typeof data === 'object' && data !== null ? (data as Partial<Problem>) : {};
  } catch {
    return {};
  }
}

/**
 * The single place that talks to the network: adds the token, serialises JSON,
 * turns failures into ApiError / NetworkError and logs them. Pages never call fetch directly.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = true, signal } = options;
  const finalHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
  const token = useAuthStore.getState().token;
  if (auth && token) finalHeaders.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    logger.error('Network error', { method, path });
    throw new NetworkError({ cause });
  }

  if (!res.ok) {
    const problem = await readProblem(res);
    const retryAfterHeader = res.headers.get('Retry-After');
    const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    const error = new ApiError(
      res.status,
      problem,
      Number.isFinite(retryAfter) ? retryAfter : undefined,
    );
    logger.warn(`API ${res.status} ${method} ${path}`, {
      code: error.code,
      traceId: error.traceId,
    });
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
