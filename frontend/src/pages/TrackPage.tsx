import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useRecordListening, useTrack } from '@/api/queries';
import { statusOf } from '@/api/errors';
import { Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { toast } from '@/stores/toastStore';

export function TrackPage() {
  const id = Number(useParams().trackId);
  const track = useTrack(id);
  const record = useRecordListening();
  const consent = useAuthStore((s) => s.user?.historyConsent);

  if (track.isPending) return <Skeleton lines={6} />;
  if (track.isError) {
    return statusOf(track.error) === 404 ? (
      <EmptyState title="Track not found" />
    ) : (
      <ErrorState error={track.error} onRetry={() => void track.refetch()} />
    );
  }
  const t = track.data;
  const markListened = () =>
    record.mutate(
      { trackId: t.trackId, listenedSeconds: 60, idempotencyKey: crypto.randomUUID() },
      { onSuccess: () => toast.success('Saved to your listening history') },
    );
  return (
    <article className="stack">
      <h1>{t.title}</h1>
      <p className="muted">
        {t.artist.name}
        {t.releaseYear ? ` · ${t.releaseYear}` : ''}
      </p>
      <div className="row">
        {t.genres.map((g) => (
          <span key={g} className="tag">
            {g}
          </span>
        ))}
        {t.tags.map((g) => (
          <span key={g} className="tag">
            {g}
          </span>
        ))}
      </div>
      <section className="card stack" aria-label="Listen">
        {t.embeds.map((e) => (
          <div key={e.provider} className="embed">
            Player: {e.provider} ({e.id}). The embedded player appears here when a real catalogue is
            connected.
          </div>
        ))}
        <div className="row">
          <Button onClick={markListened} loading={record.isPending}>
            I listened to this
          </Button>
          {!consent && (
            <span className="hint">Turn on listening history in your profile to save plays.</span>
          )}
        </div>
      </section>
      {t.facts.length > 0 && (
        <section className="stack">
          <h2>Good to know</h2>
          <ul className="list">
            {t.facts.map((f) => (
              <li key={f.factId} className="card">
                <span className="tag">{f.factType}</span>
                <p>{f.text}</p>
                <a href={f.source.url} target="_blank" rel="noreferrer noopener">
                  Source: {f.source.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {t.relatedGenres.length > 0 && (
        <section className="stack">
          <h2>Related genres</h2>
          <ul>
            {t.relatedGenres.map((r) => (
              <li key={`${r.genre}-${r.relatedGenre}`}>
                {r.genre} {r.relationType.replaceAll('_', ' ')} {r.relatedGenre}
              </li>
            ))}
          </ul>
        </section>
      )}
      {t.lyrics && (
        <p>
          <a href={t.lyrics.url} target="_blank" rel="noreferrer noopener">
            Lyrics (external site)
          </a>
        </p>
      )}
    </article>
  );
}
