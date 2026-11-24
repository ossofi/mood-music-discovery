import { delay, http, HttpResponse } from 'msw';
import { API_BASE } from '@/api/config';
import type {
  FeedItem,
  Fact,
  FieldError,
  Playlist,
  PlaylistSummary,
  ProblemCode,
  QuizAnswer,
  TrackDetail,
  User,
} from '@/api/types';
import { FACTS, LYRICS_TRACKS, QUESTIONS, RELATED_GENRES, TAG_LABELS, TRACKS } from './data';
import { db, heardBy, rank } from './db';

/** Artificial latency so loading skeletons are visible; zero in tests. */
const LATENCY = import.meta.env.MODE === 'test' ? 0 : 350;
const url = (path: string) => `${API_BASE}${path}`;

function problem(
  status: number,
  code: ProblemCode,
  title: string,
  detail: string,
  extra: { errors?: FieldError[]; headers?: Record<string, string>; traceId?: string } = {},
) {
  const { headers, ...rest } = extra;
  return HttpResponse.json(
    {
      type: `https://api.moodmusic.example/problems/${code.toLowerCase().replaceAll('_', '-')}`,
      title,
      status,
      code,
      detail,
      ...rest,
    },
    { status, headers: { 'Content-Type': 'application/problem+json', ...headers } },
  );
}

const unauthorized = () =>
  problem(401, 'UNAUTHENTICATED', 'Not signed in', 'Sign in to use this endpoint.');
const notFound = (what: string) => problem(404, 'NOT_FOUND', 'Not found', `${what} was not found.`);
const validation = (errors: FieldError[]) =>
  problem(422, 'VALIDATION_ERROR', 'Validation failed', 'One or more fields are invalid.', {
    errors,
  });

function currentUser(request: Request) {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer mock-token-(\d+)$/.exec(header);
  if (!match) return undefined;
  return db.users.find((u) => u.userId === Number(match[1]));
}

function publicUser(u: { password?: string } & User): User {
  const { userId, email, displayName, historyConsent, createdAt } = u;
  return { userId, email, displayName, historyConsent, createdAt };
}

function paginate<T>(all: T[], url: URL): { items: T[]; nextCursor: string | null } {
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 20) || 20, 1), 50);
  const offset = Number(url.searchParams.get('cursor') ?? 0) || 0;
  const items = all.slice(offset, offset + limit);
  return { items, nextCursor: offset + limit < all.length ? String(offset + limit) : null };
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function factsForTrack(trackId: number): Fact[] {
  const track = TRACKS.find((t) => t.trackId === trackId);
  return FACTS.filter((f) => f.trackId === trackId || (track && f.artistId === track.artistId)).map(
    (f) => ({
      factId: f.factId,
      factType: f.factType,
      text: f.text,
      source: { name: 'Manual curation', url: f.url },
    }),
  );
}

export const handlers = [
  // ---------- Auth ----------
  http.post(url('/auth/register'), async ({ request }) => {
    await delay(LATENCY);
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
    };
    const errors: FieldError[] = [];
    const email = (body.email ?? '').trim().toLowerCase();
    if (!EMAIL.test(email))
      errors.push({ field: 'email', message: 'Must be a valid e-mail address.' });
    if (!body.password || body.password.length < 10)
      errors.push({ field: 'password', message: 'Must be at least 10 characters.' });
    if (errors.length) return validation(errors);
    if (db.users.some((u) => u.email === email))
      return problem(
        409,
        'EMAIL_ALREADY_REGISTERED',
        'E-mail already registered',
        'An account with this e-mail already exists.',
      );
    const user = {
      userId: ++db.seq.user,
      email,
      password: body.password ?? '',
      displayName: body.displayName?.trim() || null,
      historyConsent: false,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return HttpResponse.json(
      {
        accessToken: `mock-token-${user.userId}`,
        tokenType: 'Bearer',
        expiresIn: 86400,
        user: publicUser(user),
      },
      { status: 201 },
    );
  }),

  http.post(url('/auth/login'), async ({ request }) => {
    await delay(LATENCY);
    const body = (await request.json()) as { email?: string; password?: string };
    const email = (body.email ?? '').trim().toLowerCase();
    if (!EMAIL.test(email) || !body.password)
      return validation([{ field: 'email', message: 'Enter your e-mail and password.' }]);
    if ((db.loginFailures.get(email) ?? 0) >= 5)
      return problem(429, 'RATE_LIMITED', 'Too many attempts', 'Try again in 900 seconds.', {
        headers: { 'Retry-After': '900' },
      });
    const user = db.users.find((u) => u.email === email);
    if (!user || user.password !== body.password) {
      db.loginFailures.set(email, (db.loginFailures.get(email) ?? 0) + 1);
      return problem(
        401,
        'INVALID_CREDENTIALS',
        'Invalid credentials',
        'E-mail or password is incorrect.',
      );
    }
    db.loginFailures.delete(email);
    return HttpResponse.json({
      accessToken: `mock-token-${user.userId}`,
      tokenType: 'Bearer',
      expiresIn: 86400,
      user: publicUser(user),
    });
  }),

  http.post(url('/auth/logout'), async ({ request }) => {
    await delay(LATENCY / 2);
    if (!currentUser(request)) return unauthorized();
    return new HttpResponse(null, { status: 204 });
  }),

  // ---------- Profile ----------
  http.get(url('/users/me'), async ({ request }) => {
    await delay(LATENCY);
    const user = currentUser(request);
    return user ? HttpResponse.json(publicUser(user)) : unauthorized();
  }),

  http.patch(url('/users/me'), async ({ request }) => {
    await delay(LATENCY);
    const user = currentUser(request);
    if (!user) return unauthorized();
    const body = (await request.json()) as { displayName?: string; historyConsent?: boolean };
    if (
      body.displayName !== undefined &&
      (body.displayName.length < 1 || body.displayName.length > 50)
    )
      return validation([{ field: 'displayName', message: 'Must be 1 to 50 characters.' }]);
    if (body.displayName !== undefined) user.displayName = body.displayName;
    if (body.historyConsent !== undefined) user.historyConsent = body.historyConsent;
    return HttpResponse.json(publicUser(user));
  }),

  http.delete(url('/users/me'), async ({ request }) => {
    await delay(LATENCY);
    const user = currentUser(request);
    if (!user) return unauthorized();
    db.users = db.users.filter((u) => u.userId !== user.userId);
    db.events = db.events.filter((e) => e.userId !== user.userId);
    db.playlists = db.playlists.filter((p) => p.userId !== user.userId);
    db.sessions = db.sessions.filter((s) => s.userId !== user.userId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(url('/users/me/history'), async ({ request }) => {
    await delay(LATENCY);
    const user = currentUser(request);
    if (!user) return unauthorized();
    db.events = db.events.filter((e) => e.userId !== user.userId);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---------- Quiz ----------
  http.get(url('/quiz'), async ({ request }) => {
    await delay(LATENCY);
    if (!currentUser(request)) return unauthorized();
    return HttpResponse.json({
      questions: QUESTIONS.map((q) => ({
        questionId: q.questionId,
        position: q.position,
        prompt: q.prompt,
        options: q.options.map((label, i) => ({ optionId: (q.questionId - 1) * 4 + i + 1, label })),
      })),
    });
  }),

  http.post(url('/quiz-sessions'), async ({ request }) => {
    await delay(LATENCY);
    const user = currentUser(request);
    if (!user) return unauthorized();
    const body = (await request.json()) as { familiarWeight?: number; answers?: QuizAnswer[] };
    const answers = body.answers ?? [];
    const familiarWeight = body.familiarWeight ?? 0.5;
    if (familiarWeight < 0 || familiarWeight > 1)
      return validation([{ field: 'familiarWeight', message: 'Must be between 0 and 1.' }]);
    const answered = new Set(answers.map((a) => a.questionId));
    if (answered.size < QUESTIONS.length)
      return problem(
        422,
        'QUIZ_INCOMPLETE',
        'Quiz incomplete',
        `${answered.size} of ${QUESTIONS.length} required questions were answered.`,
      );
    const mismatch = answers.find((a) => Math.ceil(a.optionId / 4) !== a.questionId);
    if (mismatch || answered.size !== answers.length)
      return validation([
        { field: 'answers', message: 'Each answer must use an option of its own question, once.' },
      ]);
    const session = {
      sessionId: ++db.seq.session,
      userId: user.userId,
      answers,
      familiarWeight,
      quizDate: new Date().toISOString().slice(0, 10),
    };
    db.sessions.push(session);
    return HttpResponse.json(
      {
        sessionId: session.sessionId,
        quizDate: session.quizDate,
        familiarWeight,
        answerCount: answers.length,
      },
      { status: 201 },
    );
  }),

  http.post(url('/quiz-sessions/:sessionId/playlists'), async ({ request, params }) => {
    await delay(LATENCY);
    const user = currentUser(request);
    if (!user) return unauthorized();
    const session = db.sessions.find(
      (s) => s.sessionId === Number(params.sessionId) && s.userId === user.userId,
    );
    if (!session) return notFound(`Quiz session ${String(params.sessionId)}`);
    const text = await request.text();
    const body = (text ? JSON.parse(text) : {}) as { limit?: number; familiarWeight?: number };
    const limit = body.limit ?? 10;
    const familiarWeight = body.familiarWeight ?? session.familiarWeight;
    const errors: FieldError[] = [];
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      errors.push({ field: 'limit', message: 'Must be between 1 and 50.' });
    if (familiarWeight < 0 || familiarWeight > 1)
      errors.push({ field: 'familiarWeight', message: 'Must be between 0 and 1.' });
    if (errors.length) return validation(errors);

    const items = rank(session.answers, familiarWeight, limit, heardBy(user.userId));
    const playlist = {
      userId: user.userId,
      playlistId: ++db.seq.playlist,
      sessionId: session.sessionId,
      familiarWeight,
      generatedAt: new Date().toISOString(),
      requestedLimit: limit,
      moodFitRating: null,
      limitationNotice:
        items.length === 0
          ? 'No tracks matched your mood.'
          : items.length < limit
            ? `Only ${items.length} tracks matched your mood; showing all of them.`
            : null,
      items,
    };
    db.playlists.push(playlist);
    const { userId: _owner, ...publicPlaylist } = playlist;
    void _owner;
    return HttpResponse.json(publicPlaylist satisfies Playlist, { status: 201 });
  }),

  // ---------- Playlists ----------
  http.get(url('/playlists'), async ({ request }) => {
    await delay(LATENCY);
    const user = currentUser(request);
    if (!user) return unauthorized();
    const all: PlaylistSummary[] = db.playlists
      .filter((p) => p.userId === user.userId)
      .sort((a, b) => b.playlistId - a.playlistId)
      .map((p) => ({
        playlistId: p.playlistId,
        sessionId: p.sessionId,
        familiarWeight: p.familiarWeight,
        generatedAt: p.generatedAt,
        trackCount: p.items.length,
        moodFitRating: p.moodFitRating,
      }));
    return HttpResponse.json(paginate(all, new URL(request.url)));
  }),

  http.get(url('/playlists/:playlistId'), async ({ request, params }) => {
    await delay(LATENCY);
    const user = currentUser(request);
    if (!user) return unauthorized();
    const p = db.playlists.find(
      (x) => x.playlistId === Number(params.playlistId) && x.userId === user.userId,
    );
    if (!p) return notFound(`Playlist ${String(params.playlistId)}`);
    const { userId: _owner, ...publicPlaylist } = p;
    void _owner;
    return HttpResponse.json(publicPlaylist);
  }),

  http.put(url('/playlists/:playlistId/rating'), async ({ request, params }) => {
    await delay(LATENCY);
    const user = currentUser(request);
    if (!user) return unauthorized();
    const p = db.playlists.find(
      (x) => x.playlistId === Number(params.playlistId) && x.userId === user.userId,
    );
    if (!p) return notFound(`Playlist ${String(params.playlistId)}`);
    const body = (await request.json()) as { moodFitRating?: number };
    const r = body.moodFitRating;
    if (!Number.isInteger(r) || (r as number) < 1 || (r as number) > 5)
      return validation([
        { field: 'moodFitRating', message: 'Must be a whole number from 1 to 5.' },
      ]);
    p.moodFitRating = r as number;
    return HttpResponse.json({
      playlistId: p.playlistId,
      moodFitRating: r,
      ratedAt: new Date().toISOString(),
    });
  }),

  // ---------- Catalogue ----------
  http.get(url('/tracks/:trackId'), async ({ request, params }) => {
    await delay(LATENCY);
    if (!currentUser(request)) return unauthorized();
    const track = TRACKS.find((t) => t.trackId === Number(params.trackId));
    if (!track) return notFound(`Track ${String(params.trackId)}`);
    const detail: TrackDetail = {
      trackId: track.trackId,
      title: track.title,
      releaseYear: track.year,
      artist: { artistId: track.artistId, name: track.artist },
      genres: track.genres,
      tags: track.tags.map(([tag]) => TAG_LABELS[tag] ?? tag),
      facts: factsForTrack(track.trackId),
      relatedGenres: track.genres.flatMap((g) =>
        (RELATED_GENRES[g] ?? []).map((r) => ({
          genre: g,
          relationType: r.relationType,
          relatedGenre: r.relatedGenre,
        })),
      ),
      embeds: [{ provider: 'spotify', id: `mock-spotify-${track.trackId}` }],
      lyrics: LYRICS_TRACKS.has(track.trackId)
        ? { url: `https://lyrics.example.org/track/${track.trackId}`, excerpt: null }
        : null,
    };
    return HttpResponse.json(detail);
  }),

  http.get(url('/artists/:artistId'), async ({ request, params }) => {
    await delay(LATENCY);
    if (!currentUser(request)) return unauthorized();
    const tracks = TRACKS.filter((t) => t.artistId === Number(params.artistId));
    const first = tracks[0];
    if (!first) return notFound(`Artist ${String(params.artistId)}`);
    return HttpResponse.json({
      artistId: first.artistId,
      name: first.artist,
      originCountry: null,
      formedYear: null,
      genres: [...new Set(tracks.flatMap((t) => t.genres))],
      facts: FACTS.filter((f) => f.artistId === first.artistId).map((f) => ({
        factId: f.factId,
        factType: f.factType,
        text: f.text,
        source: { name: 'Manual curation', url: f.url },
      })),
      tracks: tracks.map((t) => ({ trackId: t.trackId, title: t.title, releaseYear: t.year })),
    });
  }),

  // ---------- Activity ----------
  http.post(url('/listening-events'), async ({ request }) => {
    await delay(LATENCY);
    const user = currentUser(request);
    if (!user) return unauthorized();
    if (!user.historyConsent)
      return problem(
        403,
        'HISTORY_CONSENT_REQUIRED',
        'Listening history is switched off',
        'Enable listening history in your profile to record plays.',
      );
    const key = request.headers.get('Idempotency-Key');
    const cacheKey = key ? `${user.userId}:${key}` : null;
    if (cacheKey && db.idempotency.has(cacheKey))
      return HttpResponse.json(db.idempotency.get(cacheKey) as Record<string, unknown>, {
        status: 201,
      });
    const body = (await request.json()) as {
      trackId?: number;
      playlistId?: number;
      listenedSeconds?: number;
    };
    if (!Number.isInteger(body.listenedSeconds) || (body.listenedSeconds as number) < 0)
      return validation([
        { field: 'listenedSeconds', message: 'Must be a whole number of seconds, 0 or more.' },
      ]);
    if (!TRACKS.some((t) => t.trackId === body.trackId))
      return notFound(`Track ${String(body.trackId)}`);
    const event = {
      eventId: ++db.seq.event,
      userId: user.userId,
      trackId: body.trackId as number,
      playlistId: body.playlistId ?? null,
      startedAt: new Date().toISOString(),
      listenedSeconds: body.listenedSeconds as number,
    };
    db.events.push(event);
    const response = {
      eventId: event.eventId,
      trackId: event.trackId,
      playlistId: event.playlistId,
      startedAt: event.startedAt,
      listenedSeconds: event.listenedSeconds,
    };
    if (cacheKey) db.idempotency.set(cacheKey, response);
    return HttpResponse.json(response, { status: 201 });
  }),

  http.get(url('/feed'), async ({ request }) => {
    await delay(LATENCY);
    const user = currentUser(request);
    if (!user) return unauthorized();
    const items = new Map<number, FeedItem>();
    if (user.historyConsent) {
      for (const e of db.events.filter((x) => x.userId === user.userId)) {
        const track = TRACKS.find((t) => t.trackId === e.trackId);
        for (const f of FACTS.filter(
          (x) => x.trackId === e.trackId || (track && x.artistId === track.artistId),
        )) {
          const prev = items.get(f.factId);
          if (!prev || prev.lastListenedAt < e.startedAt)
            items.set(f.factId, {
              factId: f.factId,
              factType: f.factType,
              text: f.text,
              source: { name: 'Manual curation', url: f.url },
              lastListenedAt: e.startedAt,
            });
        }
      }
    }
    const sorted = [...items.values()].sort((a, b) =>
      b.lastListenedAt.localeCompare(a.lastListenedAt),
    );
    return HttpResponse.json(paginate(sorted, new URL(request.url)));
  }),

  http.get(url('/health'), () =>
    HttpResponse.json({ status: 'ok', database: 'up', version: '1.0.0-mock' }),
  ),
];
