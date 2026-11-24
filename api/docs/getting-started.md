# Getting started

This guide takes you from zero to your first authenticated request in a few minutes.

## 1. Choose a server

| Server | Base URL | Use |
|---|---|---|
| Local backend | `http://localhost:8080/api/v1` | Docker Compose (when the backend exists) |
| Mock server | `http://localhost:4010` | Example responses from `openapi.yaml`; note: **no** `/api/v1` prefix |

Start the mock server:

```bash
cd api
npm install
npm run mock
```

The examples below use a shell variable so you can switch servers:

```bash
BASE=http://localhost:4010          # mock; for the real backend: http://localhost:8080/api/v1
```

## 2. Sign in and get a token

```bash
curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"correct-horse-battery"}'
```

Response `200`:

```json
{ "accessToken": "eyJ...", "tokenType": "Bearer", "expiresIn": 86400,
  "user": { "userId": 1, "email": "alice@example.com", "displayName": "Alice", "historyConsent": true, "createdAt": "2026-11-20T10:00:00Z" } }
```

The token is valid for 24 hours (`expiresIn` is in seconds). Keep it in memory or a secure store; never commit it to source code.
No account yet? `POST /auth/register` with `email`, `password` (10–72 characters) and an optional `displayName`.

## 3. Make an authenticated request

```bash
TOKEN=eyJ...    # accessToken from step 2
curl -s "$BASE/quiz" -H "Authorization: Bearer $TOKEN"
```

Without a valid token every endpoint except `register`, `login` and `health` returns `401`.

## Conventions

- **Content type:** `application/json`; errors are `application/problem+json` (see [errors.md](errors.md)).
- **Pagination:** list endpoints take `limit` (1–50, default 20) and `cursor`. Pass the `nextCursor` of the previous page as `cursor`; `nextCursor: null` means the last page. Cursors are opaque, do not parse them.
- **Idempotency:** `POST /listening-events` accepts an `Idempotency-Key` header (a UUID). If a request is retried with the same key within 24 hours, the first result is returned and no duplicate is created. `PUT /playlists/{id}/rating` is naturally idempotent.
- **Rate limits:** after 5 failed logins within 15 minutes the API returns `429` with `Retry-After` (seconds). Wait before retrying; do not retry in a tight loop.
- **Timestamps:** ISO 8601 UTC, e.g. `2026-11-23T09:15:00Z`.
- **Versioning:** `/api/v1`. See [changelog.md](changelog.md).
- **Privacy:** listening events are stored only when `historyConsent` is `true`. `DELETE /users/me` removes the account and all its data.

## Next

Follow [tutorial-quiz-to-playlist.md](tutorial-quiz-to-playlist.md) for the complete flow.
