import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { describeError } from '@/api/errors';

export function Button({
  variant = 'primary',
  small,
  loading,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  small?: boolean;
  loading?: boolean;
}) {
  const cls = ['btn', variant === 'primary' ? '' : variant, small ? 'small' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="stack" role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${100 - i * 12}%`, height: '1.5rem' }} />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { title, message, retryable } = describeError(error);
  return (
    <div className="state card" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {retryable && onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state card">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
