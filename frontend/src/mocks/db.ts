import type { Playlist, PlaylistItem, QuizAnswer, User } from '@/api/types';
import { ALICE_HEARD, OPTION_TAGS, TAG_LABELS, TRACKS } from './data';

interface MockUser extends User {
  password: string;
}
interface MockSession {
  sessionId: number;
  userId: number;
  answers: QuizAnswer[];
  familiarWeight: number;
  quizDate: string;
}
interface MockEvent {
  eventId: number;
  userId: number;
  trackId: number;
  playlistId: number | null;
  startedAt: string;
  listenedSeconds: number;
}
interface MockPlaylist extends Playlist {
  userId: number;
}

export interface MockDb {
  users: MockUser[];
  sessions: MockSession[];
  playlists: MockPlaylist[];
  events: MockEvent[];
  idempotency: Map<string, unknown>;
  loginFailures: Map<string, number>;
  seq: { user: number; session: number; playlist: number; event: number };
}

const DAY = 86_400_000;

function seed(): MockDb {
  const now = Date.now();
  const db: MockDb = {
    users: [
      {
        userId: 1,
        email: 'alice@example.com',
        password: 'correct-horse-battery',
        displayName: 'Alice',
        historyConsent: true,
        createdAt: new Date(now - 30 * DAY).toISOString(),
      },
    ],
    sessions: [],
    playlists: [],
    events: [],
    idempotency: new Map(),
    loginFailures: new Map(),
    seq: { user: 1, session: 0, playlist: 0, event: 0 },
  };
  ALICE_HEARD.forEach((trackId, i) => {
    db.events.push({
      eventId: ++db.seq.event,
      userId: 1,
      trackId,
      playlistId: null,
      startedAt: new Date(now - (i + 1) * DAY).toISOString(),
      listenedSeconds: 120,
    });
  });
  return db;
}

export const db: MockDb = seed();

/** Restore the initial state (used by tests). */
export function resetDb(): void {
  Object.assign(db, seed());
}

export function heardBy(userId: number): Set<number> {
  return new Set(db.events.filter((e) => e.userId === userId).map((e) => e.trackId));
}

/**
 * Same rule as database/002_logic.sql generate_playlist():
 *   score = sum(mood weight x track tag weight) x (heard ? 0.5 + w : 1.5 - w)
 * Ties: lower track id first. Fewer matches than `limit` are all returned.
 */
export function rank(
  answers: QuizAnswer[],
  familiarWeight: number,
  limit: number,
  heard: Set<number>,
): PlaylistItem[] {
  const mood = new Map<string, number>();
  for (const a of answers) {
    for (const [tag, w] of OPTION_TAGS[a.optionId] ?? []) mood.set(tag, (mood.get(tag) ?? 0) + w);
  }
  const scored = TRACKS.flatMap((t) => {
    const matched = t.tags.filter(([tag]) => mood.has(tag));
    if (matched.length === 0) return [];
    const tagScore = matched.reduce((sum, [tag, w]) => sum + (mood.get(tag) ?? 0) * w, 0);
    const isFamiliar = heard.has(t.trackId);
    const multiplier = isFamiliar ? 0.5 + familiarWeight : 1.5 - familiarWeight;
    return [{ t, isFamiliar, score: Math.round(tagScore * multiplier * 10_000) / 10_000, matched }];
  });
  scored.sort((a, b) => b.score - a.score || a.t.trackId - b.t.trackId);
  return scored.slice(0, limit).map((s, i) => ({
    position: i + 1,
    trackId: s.t.trackId,
    title: s.t.title,
    artist: { artistId: s.t.artistId, name: s.t.artist },
    releaseYear: s.t.year,
    score: s.score,
    isFamiliar: s.isFamiliar,
    matchedTags: s.matched.map(([tag]) => TAG_LABELS[tag] ?? tag).sort(),
  }));
}
