# Mood-Based Music Discovery

Database stage of the project. Web application that turns a short mood quiz into a playlist and shows context (facts, related genres, lyrics links) next to each track. This repository currently contains the **database part**: a transactional (OLTP) PostgreSQL 16 database with migrations, reference data, test data and automated tests.

Author: Sofya Asinskaya

## Repository structure

```
database/
  001_schema.sql          tables, keys, constraints, indexes (3NF)
  002_logic.sql           triggers, views, materialized view, ranking and retention functions
  003_roles.sql           roles and privileges
  004_reference_data.sql  fixed data: sources, genres, mood tags, quiz questions and answer-to-tag rules
  005_test_data.sql       DEMO data only (users, artists, tracks, tags, facts, quiz sessions)
  006_tests.sql           29 integrity, business-rule and permission checks (rolls back)
  DATA_DICTIONARY.md      tables, columns, types, keys, data-quality rules (generated)
  er_diagram.svg / .png   logical schema, colour-coded by block
  gen_dictionary.py       generator of the dictionary and diagram
```

Migrations are numbered and applied in order. A schema change is a new numbered file; applied files are never edited. Each migration records itself in the `schema_migration` table.

## Requirements

- Docker (Docker Desktop on macOS/Windows), or a local PostgreSQL 16
- A terminal (the commands below are for macOS/Linux; see the PowerShell note for Windows)

## Quick start (Docker)

Port 5432 is often taken by a local PostgreSQL, so the container is exposed on **5433**.

```bash
docker run --name musicmood-db -e POSTGRES_PASSWORD=dev -p 5433:5432 -d postgres:16
sleep 5
docker exec musicmood-db psql -U postgres -c "CREATE DATABASE musicmood"

cd database
run() { f=$1; shift; docker exec -i musicmood-db psql -U postgres -d musicmood -v ON_ERROR_STOP=1 "$@" < "$f"; }
run 001_schema.sql
run 002_logic.sql
run 003_roles.sql -v backend_password=devpass -v reporting_password=devpass
run 004_reference_data.sql
run 005_test_data.sql     # demo data, never load into production
run 006_tests.sql         # expect 29 lines starting with "NOTICE:  PASS", no FAIL or ERROR
```

**Windows PowerShell:** the `<` redirect is not available. Use
`Get-Content 001_schema.sql | docker exec -i musicmood-db psql -U postgres -d musicmood -v ON_ERROR_STOP=1`
for each file (add the `-v backend_password=... -v reporting_password=...` options for `003_roles.sql`).

### Start over from scratch

```bash
docker exec musicmood-db psql -U postgres -c "DROP DATABASE musicmood"
docker exec musicmood-db psql -U postgres -c "CREATE DATABASE musicmood"
```

then run the migrations again.

### Open a console

```bash
docker exec -it musicmood-db psql -U postgres -d musicmood
```

From outside Docker (DBeaver, an application): host `localhost`, port `5433`, database `musicmood`.

## Try it

Playlist of the demo user Alice with the reason for each track:

```sql
SELECT position, title, artist, score, matched_tags
FROM v_playlist_explained WHERE playlist_id = 1 ORDER BY position;
```

Tag coverage by genre (data-coverage check):

```sql
SELECT * FROM mv_tag_coverage;
```

The quiz with its answer-to-tag weights:

```sql
SELECT q.position AS q, q.prompt, o.position AS opt, o.label,
       string_agg(mt.label || ' ' || ot.weight, ', ' ORDER BY ot.weight DESC) AS tags
FROM quiz_question q
JOIN quiz_option o ON o.question_id = q.question_id
JOIN quiz_option_tag ot ON ot.option_id = o.option_id
JOIN mood_tag mt ON mt.tag_id = ot.tag_id
GROUP BY q.position, q.prompt, o.position, o.label
ORDER BY q.position, o.position;
```

## How the ranking works

`generate_playlist(session_id, limit)` runs in one transaction and computes

```
score = SUM(mood_weight * track_tag_weight) * balance_multiplier
balance_multiplier = 0.5 + familiar_weight   for tracks the user has already heard
                     1.5 - familiar_weight   for new tracks
```

Ties are broken by the lower `track_id`, so the same input always gives the same playlist. If fewer than `limit` tracks match, all available matches are returned; an incomplete quiz is rejected.

## Roles

| Role | Purpose |
|---|---|
| `app_read` | catalogue, taxonomy and safe views; no access to `app_user` (e-mail, password hashes) |
| `app_write` | runtime data (users, quiz, playlists, history) and catalogue sync; cannot change reference data |
| `app_admin` | reference data and schema management |
| `backend_app` (login) | the API connects as this role; member of `app_write`; not a superuser |
| `reporting_ro` (login) | read-only reporting; member of `app_read` |

## Demo data (development only)

Demo accounts: `alice@example.com`, `bob@example.com`, `carol@example.com`. They share one development password (see the comment at the top of `005_test_data.sql`); only a bcrypt hash is stored in the database. Never use these accounts or this password outside a development database.

Track mood weights in the demo data are illustrative values for testing, not measured or provider data. Lyrics are not stored: only links to a licensed provider and an optional short excerpt (at most 200 characters).

## Data sources (planned)

The database stores a cache of the catalogue. Planned sources, called only from the backend: MusicBrainz (artists, recordings), Last.fm (mood tags), Wikidata (facts), official Spotify/Deezer embeds for playback. Check each provider's current terms of use before loading real data; Last.fm requires contacting them for academic use.

## Known limitations

- Tests depend on the demo data (playlist ids 1 and 2, demo user names) and work right after `005` on a clean database.
- Not covered by tests: cascading deletion of a user, concurrent calls of `generate_playlist`, the `updated_at` trigger.
- No raw/staging/mart layers, second DBMS or analytics: the topic does not require them.
- Login throttling and token handling are application-layer concerns; the database has no session table.