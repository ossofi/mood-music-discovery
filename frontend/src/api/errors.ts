import { ApiError, NetworkError } from './client';

export interface ErrorDescription {
  title: string;
  message: string;
  /** Whether a retry can help (network, 5xx, 429). */
  retryable: boolean;
}

/** Turns any thrown value into text a person can act on. Never exposes stack traces. */
export function describeError(error: unknown): ErrorDescription {
  if (error instanceof NetworkError) {
    return {
      title: 'No connection',
      message: 'We cannot reach the server. Check your internet connection and try again.',
      retryable: true,
    };
  }
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return error.code === 'INVALID_CREDENTIALS'
          ? {
              title: 'Sign-in failed',
              message: 'E-mail or password is incorrect.',
              retryable: false,
            }
          : { title: 'Session expired', message: 'Please sign in again.', retryable: false };
      case 403:
        return error.code === 'HISTORY_CONSENT_REQUIRED'
          ? {
              title: 'Listening history is off',
              message: 'Turn it on in your profile to save plays and get a personal feed.',
              retryable: false,
            }
          : { title: 'Not allowed', message: 'You do not have access to this.', retryable: false };
      case 404:
        return {
          title: 'Not found',
          message: 'This page or item does not exist.',
          retryable: false,
        };
      case 409:
        return {
          title: 'Already registered',
          message: 'An account with this e-mail already exists. Try signing in.',
          retryable: false,
        };
      case 422:
        return {
          title: 'Please check the form',
          message: error.detail ?? 'Some fields are not valid.',
          retryable: false,
        };
      case 429:
        return {
          title: 'Too many attempts',
          message: error.retryAfter
            ? `Please wait ${Math.ceil(error.retryAfter / 60)} min before trying again.`
            : 'Please wait a little before trying again.',
          retryable: true,
        };
      default:
        if (error.status >= 500) {
          return {
            title: 'Something went wrong',
            message: error.traceId
              ? `Please try again later. Reference: ${error.traceId}`
              : 'Please try again later.',
            retryable: true,
          };
        }
    }
  }
  return { title: 'Unexpected error', message: 'Please try again.', retryable: true };
}

/** Error status of an API failure, or undefined for network and unknown errors. */
export function statusOf(error: unknown): number | undefined {
  return error instanceof ApiError ? error.status : undefined;
}
