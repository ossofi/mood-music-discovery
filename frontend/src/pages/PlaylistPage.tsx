import { Link, useParams } from 'react-router-dom';
import { usePlaylist, useRatePlaylist } from '@/api/queries';
import { statusOf } from '@/api/errors';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui';

function Rating({ playlistId, value }: { playlistId: number; value: number | null }) {
  const rate = useRatePlaylist(playlistId);
  return (
    <div className="stack">
      <h2>Did it match your mood?</h2>
      <div className="stars" role="group" aria-label="Mood fit rating, 1 to 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="star"
            aria-pressed={value === n}
            aria-label={`${n} out of 5`}
            disabled={rate.isPending}
            onClick={() => rate.mutate(n)}
          >
            {n}
          </button>
        ))}
      </div>
      {value !== null && (
        <p className="muted" role="status">
          Thanks! You rated this playlist {value}/5.
        </p>
      )}
    </div>
  );
}

export function PlaylistPage() {
  const id = Number(useParams().playlistId);
  const playlist = usePlaylist(id);
  if (playlist.isPending) return <Skeleton lines={6} />;
  if (playlist.isError) {
    return statusOf(playlist.error) === 404 ? (
      <EmptyState title="Playlist not found">
        <Link className="btn" to="/playlists">
          All playlists
        </Link>
      </EmptyState>
    ) : (
      <ErrorState error={playlist.error} onRetry={() => void playlist.refetch()} />
    );
  }
  const p = playlist.data;
  return (
    <div className="stack">
      <h1>Your playlist</h1>
      <p className="muted">
        {new Date(p.generatedAt).toLocaleString()} · {p.items.length} tracks
      </p>
      {p.limitationNotice && (
        <p className="alert" role="status">
          {p.limitationNotice}
        </p>
      )}
      {p.items.length === 0 ? (
        <EmptyState title="No tracks matched">
          <Link className="btn" to="/quiz">
            Try the quiz again
          </Link>
        </EmptyState>
      ) : (
        <ol className="list">
          {p.items.map((t) => (
            <li key={t.trackId} className="card track">
              <span className="pos" aria-hidden="true">
                {t.position}
              </span>
              <div className="stack">
                <h3>
                  <Link to={`/tracks/${t.trackId}`}>{t.title}</Link>
                </h3>
                <p className="muted" style={{ margin: 0 }}>
                  {t.artist.name}
                  {t.releaseYear ? ` · ${t.releaseYear}` : ''}
                </p>
                <div className="row">
                  {t.isFamiliar && <span className="tag familiar">Familiar</span>}
                  {t.matchedTags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Rating playlistId={p.playlistId} value={p.moodFitRating} />
      <div>
        <Link className="btn secondary" to="/quiz">
          New quiz
        </Link>
      </div>
    </div>
  );
}
