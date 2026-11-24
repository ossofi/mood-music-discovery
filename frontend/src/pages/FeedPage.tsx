import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFeed } from '@/api/queries';
import type { FactType } from '@/api/types';
import { useAuthStore } from '@/stores/authStore';
import { Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { filterFeed, type FeedSort } from '@/lib/feedFilter';

const TYPES: (FactType | 'all')[] = ['all', 'history', 'creation', 'influence', 'trivia'];

export function FeedPage() {
  const consent = useAuthStore((s) => s.user?.historyConsent);
  const q = useFeed();
  const [type, setType] = useState<FactType | 'all'>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<FeedSort>('newest');
  const all = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const items = useMemo(() => filterFeed(all, { type, query, sort }), [all, type, query, sort]);

  if (q.isPending) return <Skeleton lines={5} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return (
    <div className="stack">
      <h1>Mood feed</h1>
      {!consent && (
        <p className="alert">
          Listening history is off. <Link to="/profile">Turn it on</Link> to get facts about what
          you play.
        </p>
      )}
      <div className="chips" role="group" aria-label="Filter by type">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className="chip-btn"
            aria-pressed={type === t}
            onClick={() => setType(t)}
          >
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="feed-tools">
        <div className="field">
          <label htmlFor="feed-search">Search</label>
          <input
            id="feed-search"
            className="input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="feed-sort">Sort</label>
          <select
            id="feed-sort"
            className="input"
            value={sort}
            onChange={(e) => setSort(e.target.value as FeedSort)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState title={all.length === 0 ? 'Nothing here yet' : 'No facts match'}>
          <p>
            {all.length === 0
              ? 'Facts about the music you listen to will show up here.'
              : 'Try a different search or filter.'}
          </p>
        </EmptyState>
      ) : (
        <ul className="list feed-grid">
          {items.map((f) => (
            <li key={f.factId} className="card feed-card">
              <span className="chip">{f.factType}</span>
              <p>{f.text}</p>
              <a className="link-tap" href={f.source.url} target="_blank" rel="noreferrer noopener">
                Source: {f.source.name}
              </a>
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