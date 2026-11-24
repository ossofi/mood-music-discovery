import { describe, expect, it } from 'vitest';
import { rank } from './db';

const calmAnswers = [
  { questionId: 1, optionId: 1 },
  { questionId: 2, optionId: 5 },
];

describe('rank (mirror of generate_playlist)', () => {
  it('orders by score descending with lower track id breaking ties', () => {
    const items = rank(calmAnswers, 0.5, 10, new Set());
    const scores = items.map((i) => i.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(items.map((i) => i.position)).toEqual(items.map((_, i) => i + 1));
  });

  it('boosts heard tracks when the familiar weight is high and penalises them when low', () => {
    const base = rank(calmAnswers, 0.5, 10, new Set());
    const first = base[0]!;
    const high = rank(calmAnswers, 1, 10, new Set([first.trackId])).find(
      (i) => i.trackId === first.trackId,
    )!;
    const low = rank(calmAnswers, 0, 10, new Set([first.trackId])).find(
      (i) => i.trackId === first.trackId,
    )!;
    expect(high.isFamiliar).toBe(true);
    expect(high.score).toBeGreaterThan(low.score);
  });

  it('returns every match when fewer tracks match than the limit', () => {
    expect(rank(calmAnswers, 0.5, 50, new Set()).length).toBeLessThan(50);
  });
});
