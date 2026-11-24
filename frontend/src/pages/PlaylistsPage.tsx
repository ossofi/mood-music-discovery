import { Link } from 'react-router-dom';
import { usePlaylists } from '@/api/queries';
import { Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';

export function PlaylistsPage() {
  const q = usePlaylists();
  if (q.isPending) return <Skeleton lines={4} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const items = q.data.pages.flatMap((p) => p.items);
  return (
    <div className="stack">
      <h1>Your playlists</h1>
      {items.length === 0 ? (
        <EmptyState title="No playlists yet">
          <p>Take the mood quiz to get your first one.</p>
          <Link className="btn" to="/quiz">
            Start the quiz
          </Link>
        </EmptyState>
      ) : (
        <ul className="list">
          {items.map((p) => (
            <li key={p.playlistId} className="card row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  <Link to={`/playlists/${p.playlistId}`}>
                    {new Date(p.generatedAt).toLocaleDateString()}
                  </Link>
                </h3>
                <span className="muted">
                  {p.trackCount} tracks ·{' '}
                  {p.moodFitRating ? `rated ${p.moodFitRating}/5` : 'not rated'}
                </span>
              </div>
              <Link className="btn secondary small" to={`/playlists/${p.playlistId}`}>
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
      {q.hasNextPage && (
        <Button
          variant="secondary"
          loading={q.isFetchingNextPage}
          onClick={() => void q.fetchNextPage()}
        >
          Load more
        </Button>
      )}
    </div>
  );
}
