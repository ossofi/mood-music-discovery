/**
 * Basic logging. The only module allowed to use the console (see eslint.config.js).
 * Swap `sink` for a remote service (Sentry, Loki...) without touching the rest of the app.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const order: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel: Level = import.meta.env.PROD ? 'warn' : 'debug';

function write(level: Level, message: string, context?: Record<string, unknown>): void {
  if (order[level] < order[minLevel]) return;
  if (import.meta.env.MODE === 'test') return; // keep test output clean
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  const fn = level === 'debug' ? console.debug : console[level];
  if (context) fn(line, context);
  else fn(line);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => write('error', message, context),
};
