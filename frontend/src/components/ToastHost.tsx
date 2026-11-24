import { useEffect } from 'react';
import { useToastStore } from '@/stores/toastStore';

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const timers = toasts.map((t) =>
      setTimeout(() => dismiss(t.id), t.kind === 'error' ? 8000 : 4000),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);
  return (
    <div className="toasts" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.kind}`}
          role={t.kind === 'error' ? 'alert' : 'status'}
        >
          <div>
            <strong>{t.title}</strong>
            {t.message && <span>{t.message}</span>}
          </div>
          <button
            type="button"
            className="btn secondary small"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
