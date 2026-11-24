import type { FactType, FeedItem } from '@/api/types';

export type FeedSort = 'newest' | 'oldest';

/** Client-side filter, search and sort for the feed. Pure, so it is unit-tested. */
export function filterFeed(
  items: FeedItem[],
  opts: { type: FactType | 'all'; query: string; sort: FeedSort },
): FeedItem[] {
  const q = opts.query.trim().toLowerCase();
  return items
    .filter(
      (i) =>
        (opts.type === 'all' || i.factType === opts.type) &&
        (!q || i.text.toLowerCase().includes(q)),
    )
    .sort((a, b) =>
      opts.sort === 'newest'
        ? b.lastListenedAt.localeCompare(a.lastListenedAt)
        : a.lastListenedAt.localeCompare(b.lastListenedAt),
    );
}
