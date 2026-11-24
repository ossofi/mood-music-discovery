import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { ApiError, NetworkError } from './client';
import { describeError } from './errors';

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { silent?: boolean };
    mutationMeta: { silent?: boolean };
  }
}

/**
 * One handler for every failed query and mutation (the SPA's "interceptor").
 * - 401 (not a wrong password): drop the session; the router sends the user to /login.
 * - 403, 429, 5xx, network: toast.
 * - 404 and 422 are shown in place (page error state / field errors), so no toast here.
 * `meta: { silent: true }` lets a caller handle an error itself.
 */
export function handleGlobalError(error: unknown, silent = false): void {
  if (silent) return;
  if (error instanceof ApiError) {
    if (error.status === 401 && error.code !== 'INVALID_CREDENTIALS') {
      if (useAuthStore.getState().token) {
        useAuthStore.getState().clear();
        toast.error('Session expired', 'Please sign in again.');
      }
      return;
    }
    if (error.status === 404 || error.status === 422 || error.status === 409) return;
    if (error.status === 401) return; // wrong password: the form shows it
  }
  const { title, message } = describeError(error);
  toast.error(title, message);
  if (!(error instanceof ApiError || error instanceof NetworkError)) {
    logger.error('Unexpected error', { error: String(error) });
  }
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (error instanceof NetworkError) return true;
  return error instanceof ApiError && error.status >= 500;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => handleGlobalError(error, query.meta?.silent),
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => handleGlobalError(error, mutation.meta?.silent),
    }),
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
