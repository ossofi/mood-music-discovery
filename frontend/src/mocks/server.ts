import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Mock server for unit tests (Node). */
export const server = setupServer(...handlers);
