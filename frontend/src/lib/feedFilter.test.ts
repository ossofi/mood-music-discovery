import { describe, expect, it } from 'vitest';
import type { FeedItem } from '@/api/types';
import { filterFeed } from './feedFilter';

const src = { name: 's', url: 'https://example.org' };
const items: FeedItem[] = [
  {
    factId: 1,
    factType: 'history',
    text: 'Born in Mississippi',
    source: src,
    lastListenedAt: '2026-01-01T00:00:00Z',
  },
  {
    factId: 2,
    factType: 'trivia',
    text: 'Recorded in one take',
    source: src,
    lastListenedAt: '2026-03-01T00:00:00Z',
  },
  {
    factId: 3,
    factType: 'history',
    text: 'Moved to Chicago',
    source: src,
    lastListenedAt: '2026-02-01T00:00:00Z',
  },
];

describe('filterFeed', () => {
  it('filters by type', () => {
    expect(
      filterFeed(items, { type: 'history', query: '', sort: 'newest' }).map((i) => i.factId),
    ).toEqual([3, 1]);
  });
  it('searches case-insensitively', () => {
    expect(
      filterFeed(items, { type: 'all', query: ' CHICAGO ', sort: 'newest' }).map((i) => i.factId),
    ).toEqual([3]);
  });
  it('sorts oldest first', () => {
    expect(
      filterFeed(items, { type: 'all', query: '', sort: 'oldest' }).map((i) => i.factId),
    ).toEqual([1, 3, 2]);
  });
  it('does not mutate the input', () => {
    const copy = [...items];
    filterFeed(items, { type: 'all', query: '', sort: 'oldest' });
    expect(items).toEqual(copy);
  });
});
