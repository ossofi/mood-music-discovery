import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/api/client';

/** Copies server-side validation errors (422) onto the matching form fields. */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!(error instanceof ApiError) || error.fieldErrors.length === 0) return false;
  for (const e of error.fieldErrors)
    setError(e.field as Path<T>, { type: 'server', message: e.message });
  return true;
}
