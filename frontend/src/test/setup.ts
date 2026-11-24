import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetDb } from '@/mocks/db';
import { server } from '@/mocks/server';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetDb();
  useAuthStore.getState().clear();
  useToastStore.getState().clear();
  sessionStorage.clear();
});
afterAll(() => server.close());
