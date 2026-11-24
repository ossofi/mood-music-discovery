# Architecture overview

## System context

```mermaid
flowchart LR
  L[Listener's browser<br/>React SPA] -->|HTTPS, JSON, bearer token| API[REST API /api/v1]
  API --> DB[(PostgreSQL<br/>catalogue, quiz, history)]
  API -->|server side only| MB[MusicBrainz]
  API -->|server side only| LF[Last.fm tags]
  API -->|server side only| WD[Wikidata facts]
  API -.->|optional link| LY[Licensed lyrics provider]
  L -->|official embeds| PB[Spotify / Deezer players]
```

The browser talks only to the API. External metadata is fetched by the backend and cached in the database; audio is played by official embedded players, never served by this API.

## Request flow: quiz to playlist

```mermaid
sequenceDiagram
  participant C as Client (SPA)
  participant A as API
  participant D as Database
  C->>A: POST /auth/login
  A->>D: check bcrypt hash
  A-->>C: 200 accessToken (24 h)
  C->>A: GET /quiz
  A-->>C: questions and options
  C->>A: POST /quiz-sessions (answers, familiarWeight)
  A->>D: validate answers, store session
  A-->>C: 201 sessionId
  C->>A: POST /quiz-sessions/{id}/playlists
  A->>D: generate_playlist(): score, rank, store (one transaction)
  A-->>C: 201 playlist with matchedTags and limitationNotice
  C->>A: PUT /playlists/{id}/rating
  A-->>C: 200 rating stored
```

## Ranking lifecycle

1. The answers are mapped to weighted mood tags (database tables `quiz_option_tag`).
2. Tracks are scored by tag overlap: `sum(mood weight x track tag weight)`.
3. The balance multiplier is applied: `0.5 + familiarWeight` for heard tracks, `1.5 - familiarWeight` for new ones.
4. Tracks are sorted by score, ties by the lower track id; at most `limit` are returned.
5. The matched tags of each track are returned as the explanation. Fewer matches than `limit` produce all matches plus a `limitationNotice`.

## Resources

| Resource | Endpoints | Database tables |
|---|---|---|
| Auth, profile | `/auth/*`, `/users/me`, `/users/me/history` | `app_user` |
| Quiz | `/quiz`, `/quiz-sessions` | `quiz_question`, `quiz_option`, `quiz_option_tag`, `quiz_session`, `quiz_answer` |
| Playlists | `/quiz-sessions/{id}/playlists`, `/playlists`, `/playlists/{id}`, `/playlists/{id}/rating` | `playlist`, `playlist_item` |
| Catalogue | `/tracks/{id}`, `/artists/{id}` | `track`, `artist`, `track_tag`, `track_fact`, `lyric_access`, `artist_genre`, `genre_relation` |
| Activity | `/listening-events`, `/feed` | `listening_event`, `track_fact` |
