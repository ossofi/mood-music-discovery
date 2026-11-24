import { describe, expect, it } from 'vitest';
import { ApiError, NetworkError } from './client';
import { describeError } from './errors';

describe('describeError', () => {
  it('explains a network failure and allows retry', () => {
    const d = describeError(new NetworkError());
    expect(d.title).toBe('No connection');
    expect(d.retryable).toBe(true);
  });
  it('maps wrong credentials without exposing details', () => {
    expect(describeError(new ApiError(401, { code: 'INVALID_CREDENTIALS' })).title).toBe(
      'Sign-in failed',
    );
  });
  it('shows the wait time for rate limiting', () => {
    expect(describeError(new ApiError(429, { code: 'RATE_LIMITED' }, 900)).message).toContain(
      '15 min',
    );
  });
  it('includes the trace id for server errors', () => {
    expect(
      describeError(new ApiError(500, { code: 'INTERNAL_ERROR', traceId: 'abc' })).message,
    ).toContain('abc');
  });
});
