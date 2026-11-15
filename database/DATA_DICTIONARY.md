# Data Dictionary

Generated from the live PostgreSQL 16 catalog after running migrations 001-004 (script: `gen_dictionary.py`). Do not edit by hand; regenerate after each migration.

## General data-quality expectations

- Every table has a primary key; every relationship is a foreign key with an explicit `ON DELETE` rule (CASCADE for owned child rows, RESTRICT for catalogue rows referenced by history).
- Text codes are lowercase slugs; e-mail is stored lowercase and validated by pattern; password hashes must be bcrypt with work factor 12 or higher.
- Weights are in the range (0, 1]; the familiar/discovery balance and ratings have fixed ranges (0-1 and 1-5).
- Timestamps are `timestamptz`; years are `smallint` with a plausible range; identifiers are identity columns.
- A fact belongs to exactly one of track or artist; lyric excerpts never exceed 200 characters; audio is never stored.

## app_user

Registered listeners: e-mail, bcrypt hash, consent flag for listening history (GDPR).

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `user_id` | bigint | NO | PK | identity |
| `email` | text | NO | UNIQUE | CHECK (((email = lower(email)) AND (email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'::text))) |
| `password_hash` | text | NO |  | CHECK ((password_hash ~ '^[$]2[aby][$](1[2-9]\|2[0-9]\|3[01])[$].{53}$'::text)) |
| `display_name` | text | yes |  | CHECK (((char_length(display_name) >= 1) AND (char_length(display_name) <= 50))) |
| `history_consent` | boolean | NO |  | default false; CHECK (((NOT history_consent) OR (history_consent_at IS NOT NULL))) |
| `history_consent_at` | timestamp with time zone | yes |  | CHECK (((NOT history_consent) OR (history_consent_at IS NOT NULL))) |
| `is_active` | boolean | NO |  | default true |
| `created_at` | timestamp with time zone | NO |  | default now() |
| `updated_at` | timestamp with time zone | NO |  | default now() |

## artist

Artists and bands in the cached catalogue.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `artist_id` | bigint | NO | PK | identity |
| `name` | text | NO |  | CHECK (((char_length(name) >= 1) AND (char_length(name) <= 200))) |
| `mbid` | uuid | yes | UNIQUE |  |
| `origin_country` | character(2) | yes |  | CHECK ((origin_country ~ '^[A-Z]{2}$'::text)) |
| `formed_year` | smallint | yes |  | CHECK (((formed_year >= 1850) AND (formed_year <= 2100))) |

## artist_genre

Many-to-many link between artists and genres.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `artist_id` | bigint | NO | PK (composite); FK→artist |  |
| `genre_id` | smallint | NO | PK (composite); FK→genre |  |

## data_source

Where metadata, tags, facts, lyrics links and playback come from; used for source attribution.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `source_id` | smallint | NO | PK | identity |
| `name` | text | NO | UNIQUE |  |
| `kind` | text | NO |  | CHECK ((kind = ANY (ARRAY['metadata'::text, 'tags'::text, 'facts'::text, 'lyrics'::text, 'playback'::text, 'manual'::text]))) |
| `base_url` | text | yes |  | CHECK ((base_url ~ '^https?://'::text)) |

## genre

The five supported genres: blues, country, jazz, rock, metal.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `genre_id` | smallint | NO | PK | identity |
| `code` | text | NO | UNIQUE | CHECK ((code ~ '^[a-z]+(-[a-z]+)*$'::text)) |
| `name` | text | NO | UNIQUE |  |

## genre_relation

Directed relations between genres (root, subgenre, related); labelled in the UI as metadata associations.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `parent_genre_id` | smallint | NO | PK (composite); FK→genre | CHECK ((parent_genre_id <> child_genre_id)) |
| `child_genre_id` | smallint | NO | PK (composite); FK→genre | CHECK ((parent_genre_id <> child_genre_id)) |
| `relation_type` | text | NO | PK (composite) | CHECK ((relation_type = ANY (ARRAY['root_of'::text, 'subgenre_of'::text, 'related_to'::text]))) |
| `source_id` | smallint | NO | FK→data_source |  |

## listening_event

Listening history: which user played which track, when and for how long.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `event_id` | bigint | NO | PK | identity |
| `user_id` | bigint | NO | FK→app_user |  |
| `track_id` | bigint | NO | FK→track |  |
| `playlist_id` | bigint | yes | FK→playlist |  |
| `started_at` | timestamp with time zone | NO |  | default now() |
| `listened_seconds` | integer | NO |  | default 0; CHECK ((listened_seconds >= 0)) |

## lyric_access

Link to a licensed lyrics provider and an optional excerpt of at most 200 characters.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `track_id` | bigint | NO | PK; FK→track |  |
| `source_id` | smallint | NO | FK→data_source |  |
| `url` | text | NO |  | CHECK ((url ~ '^https?://'::text)) |
| `excerpt` | text | yes |  | CHECK ((char_length(excerpt) <= 200)) |

## mood_tag

Controlled vocabulary of mood tags used by the quiz and by track tagging.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `tag_id` | smallint | NO | PK | identity |
| `code` | text | NO | UNIQUE | CHECK ((code ~ '^[a-z]+(-[a-z]+)*$'::text)) |
| `label` | text | NO | UNIQUE |  |
| `category` | text | NO |  | CHECK ((category = ANY (ARRAY['energy'::text, 'valence'::text, 'character'::text]))) |

## playlist

A generated playlist for a session; stores the 1-5 mood-fit rating used for KPI-02.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `playlist_id` | bigint | NO | PK | identity |
| `session_id` | bigint | NO | FK→quiz_session |  |
| `familiar_weight` | numeric(3,2) | NO |  | CHECK (((familiar_weight >= (0)::numeric) AND (familiar_weight <= (1)::numeric))) |
| `generated_at` | timestamp with time zone | NO |  | default now() |
| `mood_fit_rating` | smallint | yes |  | CHECK (((mood_fit_rating >= 1) AND (mood_fit_rating <= 5))); CHECK (((mood_fit_rating IS NULL) = (rated_at IS NULL))) |
| `rated_at` | timestamp with time zone | yes |  | CHECK (((mood_fit_rating IS NULL) = (rated_at IS NULL))) |

## playlist_item

Ranked tracks of a playlist with score and familiar flag.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `playlist_id` | bigint | NO | PK (composite); FK→playlist; UNIQUE with track_id |  |
| `position` | smallint | NO | PK (composite) | CHECK (("position" > 0)) |
| `track_id` | bigint | NO | FK→track; UNIQUE with playlist_id |  |
| `score` | numeric(8,4) | NO |  | CHECK ((score >= (0)::numeric)) |
| `is_familiar` | boolean | NO |  |  |

## quiz_answer

The option chosen for each question in a session (one answer per question).

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `session_id` | bigint | NO | PK (composite); FK→quiz_session |  |
| `question_id` | smallint | NO | PK (composite); FK→quiz_option (composite) |  |
| `option_id` | integer | NO | FK→quiz_option (composite) |  |

## quiz_option

Answer options of a question.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `option_id` | integer | NO | PK; UNIQUE with question_id | identity |
| `question_id` | smallint | NO | FK→quiz_question; UNIQUE with position; UNIQUE with option_id |  |
| `label` | text | NO |  | CHECK (((char_length(label) >= 2) AND (char_length(label) <= 100))) |
| `position` | smallint | NO | UNIQUE with question_id | CHECK ((("position" >= 1) AND ("position" <= 6))) |

## quiz_option_tag

Mapping from an answer option to mood tags with a weight (the quiz-to-tag rule).

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `option_id` | integer | NO | PK (composite); FK→quiz_option |  |
| `tag_id` | smallint | NO | PK (composite); FK→mood_tag |  |
| `weight` | numeric(3,2) | NO |  | CHECK (((weight > (0)::numeric) AND (weight <= (1)::numeric))) |

## quiz_question

Quiz questions (3-5 active at a time).

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `question_id` | smallint | NO | PK | identity |
| `code` | text | NO | UNIQUE |  |
| `prompt` | text | NO |  | CHECK (((char_length(prompt) >= 5) AND (char_length(prompt) <= 200))) |
| `position` | smallint | NO |  | CHECK ((("position" >= 1) AND ("position" <= 5))) |
| `is_active` | boolean | NO |  | default true |

## quiz_session

One quiz attempt by a user, with the familiar/discovery balance value.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `session_id` | bigint | NO | PK | identity |
| `user_id` | bigint | NO | FK→app_user |  |
| `quiz_date` | date | NO |  | default CURRENT_DATE |
| `started_at` | timestamp with time zone | NO |  | default now(); CHECK (((completed_at IS NULL) OR (completed_at >= started_at))) |
| `completed_at` | timestamp with time zone | yes |  | CHECK (((completed_at IS NULL) OR (completed_at >= started_at))) |
| `familiar_weight` | numeric(3,2) | NO |  | default 0.50; CHECK (((familiar_weight >= (0)::numeric) AND (familiar_weight <= (1)::numeric))) |

## track

Cached tracks with identifiers for official embedded playback; no audio is stored.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `track_id` | bigint | NO | PK | identity |
| `artist_id` | bigint | NO | FK→artist; UNIQUE with title, release_year |  |
| `title` | text | NO | UNIQUE with artist_id, release_year | CHECK (((char_length(title) >= 1) AND (char_length(title) <= 300))) |
| `release_year` | smallint | yes | UNIQUE with artist_id, title | CHECK (((release_year >= 1900) AND (release_year <= 2100))) |
| `duration_sec` | integer | yes |  | CHECK (((duration_sec > 0) AND (duration_sec <= 7200))) |
| `mbid` | uuid | yes | UNIQUE |  |
| `spotify_track_id` | text | yes |  |  |
| `deezer_track_id` | bigint | yes |  |  |
| `created_at` | timestamp with time zone | NO |  | default now() |
| `updated_at` | timestamp with time zone | NO |  | default now() |

## track_fact

Source-attributed facts about either a track or an artist.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `fact_id` | bigint | NO | PK | identity |
| `track_id` | bigint | yes | FK→track | CHECK (((track_id IS NULL) <> (artist_id IS NULL))) |
| `artist_id` | bigint | yes | FK→artist | CHECK (((track_id IS NULL) <> (artist_id IS NULL))) |
| `fact_type` | text | NO |  | CHECK ((fact_type = ANY (ARRAY['history'::text, 'creation'::text, 'influence'::text, 'trivia'::text]))) |
| `fact_text` | text | NO |  | CHECK (((char_length(fact_text) >= 10) AND (char_length(fact_text) <= 500))) |
| `source_id` | smallint | NO | FK→data_source |  |
| `source_url` | text | NO |  | CHECK ((source_url ~ '^https?://'::text)) |
| `fetched_at` | timestamp with time zone | NO |  | default now() |

## track_tag

Mood tags of a track with a weight and the source that provided them.

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `track_id` | bigint | NO | PK (composite); FK→track |  |
| `tag_id` | smallint | NO | PK (composite); FK→mood_tag |  |
| `source_id` | smallint | NO | PK (composite); FK→data_source |  |
| `weight` | numeric(4,3) | NO |  | CHECK (((weight > (0)::numeric) AND (weight <= (1)::numeric))) |

## schema_migration

Version history of applied migration scripts (database versioning).

| Column | Type | Null | Key | Rules / data quality |
|---|---|---|---|---|
| `version` | text | NO | PK |  |
| `description` | text | NO |  |  |
| `applied_at` | timestamp with time zone | NO |  | default now() |

## Views, materialized view, functions, triggers

| Object | Purpose |
|---|---|
| `v_app_user_masked` | Users with masked e-mail (j***@domain); the only user view readable by app_read |
| `v_track_tag_best` | One weight per (track, tag): the highest across sources |
| `v_session_mood` | Mood profile of a quiz session (sum of option→tag weights) |
| `v_playlist_explained` | Playlist with title, artist, score and matched mood tags (explainable ranking) |
| `v_user_feed` | Facts for artists/tracks the user has listened to (personal feed) |
| `v_artist_related_genres` | Related genres/roots of an artist with source |
| `mv_tag_coverage` | Materialized: tracks per genre and how many have 3+ tags (data-coverage risk check) |
| `generate_playlist(session, limit)` | Ranking in one transaction: score = Σ(mood weight × track tag weight) × balance multiplier; tie-break by track_id |
| `purge_old_listening_events(interval)` | Deletes listening history older than the retention period (default 12 months) |
| `mask_email(text)` | Masks an e-mail address |
| `enforce_history_consent() trigger` | Rejects listening_event rows for users without history consent |
| `touch_updated_at() trigger` | Maintains updated_at on app_user and track |
