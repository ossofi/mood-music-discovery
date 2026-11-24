import { useNavigate } from 'react-router-dom';
import { useDeleteAccount, useDeleteHistory, useUpdateMe } from '@/api/queries';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const update = useUpdateMe();
  const delHistory = useDeleteHistory();
  const delAccount = useDeleteAccount();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="stack" style={{ maxWidth: '40rem' }}>
      <h1>Profile</h1>
      <section className="card stack">
        <p>
          <strong>{user.displayName ?? 'No name'}</strong>
          <br />
          <span className="muted">{user.email}</span>
        </p>
        <label className="choice">
          <input
            type="checkbox"
            checked={user.historyConsent}
            disabled={update.isPending}
            onChange={(e) => update.mutate({ historyConsent: e.target.checked })}
          />
          Save my listening history
        </label>
        <p className="hint">
          Used only for your personal feed and the "familiar" marker. Kept for 12 months. You can
          switch it off at any time.
        </p>
      </section>
      <section className="card stack">
        <h2>Your data</h2>
        <Button
          variant="danger"
          loading={delHistory.isPending}
          onClick={() => {
            if (window.confirm('Delete your whole listening history?'))
              delHistory.mutate(undefined, { onSuccess: () => toast.success('History deleted') });
          }}
        >
          Delete listening history
        </Button>
        <Button
          variant="danger"
          loading={delAccount.isPending}
          onClick={() => {
            if (window.confirm('Delete your account and all data? This cannot be undone.'))
              delAccount.mutate(undefined, { onSuccess: () => navigate('/login') });
          }}
        >
          Delete account
        </Button>
      </section>
    </div>
  );
}
