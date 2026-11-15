-- =====================================================================
-- 001_schema.sql  |  Mood-Based Music Discovery App  |  PostgreSQL 16
-- Tables, keys, constraints, indexes (3NF). Run first.
-- =====================================================================
BEGIN;

CREATE TABLE schema_migration (
    version     text PRIMARY KEY,
    description text        NOT NULL,
    applied_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- Sources and taxonomy (reference data) ----------
CREATE TABLE data_source (
    source_id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name      text NOT NULL UNIQUE,
    kind      text NOT NULL CHECK (kind IN ('metadata','tags','facts','lyrics','playback','manual')),
    base_url  text CHECK (base_url ~ '^https?://')
);

CREATE TABLE genre (
    genre_id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code     text NOT NULL UNIQUE CHECK (code ~ '^[a-z]+(-[a-z]+)*$'),
    name     text NOT NULL UNIQUE
);

-- relation_type describes how the CHILD relates to the PARENT:
--   root_of      parent is a historical root of child
--   subgenre_of  child is a subgenre of parent
--   related_to   loose association
CREATE TABLE genre_relation (
    parent_genre_id smallint NOT NULL REFERENCES genre(genre_id) ON DELETE CASCADE,
    child_genre_id  smallint NOT NULL REFERENCES genre(genre_id) ON DELETE CASCADE,
    relation_type   text     NOT NULL CHECK (relation_type IN ('root_of','subgenre_of','related_to')),
    source_id       smallint NOT NULL REFERENCES data_source(source_id),
    PRIMARY KEY (parent_genre_id, child_genre_id, relation_type),
    CHECK (parent_genre_id <> child_genre_id)
);

CREATE TABLE mood_tag (
    tag_id   smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code     text NOT NULL UNIQUE CHECK (code ~ '^[a-z]+(-[a-z]+)*$'),
    label    text NOT NULL UNIQUE,
    category text NOT NULL CHECK (category IN ('energy','valence','character'))
);

-- ---------- Quiz definition ----------
CREATE TABLE quiz_question (
    question_id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        text    NOT NULL UNIQUE,
    prompt      text    NOT NULL CHECK (char_length(prompt) BETWEEN 5 AND 200),
    position    smallint NOT NULL CHECK (position BETWEEN 1 AND 5),
    is_active   boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX ux_quiz_question_active_position ON quiz_question(position) WHERE is_active;

CREATE TABLE quiz_option (
    option_id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id smallint NOT NULL REFERENCES quiz_question(question_id) ON DELETE CASCADE,
    label       text     NOT NULL CHECK (char_length(label) BETWEEN 2 AND 100),
    position    smallint NOT NULL CHECK (position BETWEEN 1 AND 6),
    UNIQUE (question_id, position),
    UNIQUE (question_id, option_id)          -- target of composite FK from quiz_answer
);

CREATE TABLE quiz_option_tag (
    option_id integer  NOT NULL REFERENCES quiz_option(option_id) ON DELETE CASCADE,
    tag_id    smallint NOT NULL REFERENCES mood_tag(tag_id),
    weight    numeric(3,2) NOT NULL CHECK (weight > 0 AND weight <= 1),
    PRIMARY KEY (option_id, tag_id)
);

-- ---------- Music catalogue ----------
CREATE TABLE artist (
    artist_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
    mbid           uuid UNIQUE,
    origin_country char(2) CHECK (origin_country ~ '^[A-Z]{2}$'),
    formed_year    smallint CHECK (formed_year BETWEEN 1850 AND 2100)
);

CREATE TABLE artist_genre (
    artist_id bigint   NOT NULL REFERENCES artist(artist_id) ON DELETE CASCADE,
    genre_id  smallint NOT NULL REFERENCES genre(genre_id),
    PRIMARY KEY (artist_id, genre_id)
);

CREATE TABLE track (
    track_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    artist_id       bigint NOT NULL REFERENCES artist(artist_id) ON DELETE RESTRICT,
    title           text   NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
    release_year    smallint CHECK (release_year BETWEEN 1900 AND 2100),
    duration_sec    integer  CHECK (duration_sec > 0 AND duration_sec <= 7200),
    mbid            uuid UNIQUE,
    spotify_track_id text,
    deezer_track_id  bigint,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ux_track_artist_title_year UNIQUE NULLS NOT DISTINCT (artist_id, title, release_year)
);

CREATE TABLE track_tag (
    track_id  bigint   NOT NULL REFERENCES track(track_id) ON DELETE CASCADE,
    tag_id    smallint NOT NULL REFERENCES mood_tag(tag_id),
    source_id smallint NOT NULL REFERENCES data_source(source_id),
    weight    numeric(4,3) NOT NULL CHECK (weight > 0 AND weight <= 1),
    PRIMARY KEY (track_id, tag_id, source_id)
);

-- A fact describes either a track or an artist (exactly one of the two).
CREATE TABLE track_fact (
    fact_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    track_id   bigint REFERENCES track(track_id)   ON DELETE CASCADE,
    artist_id  bigint REFERENCES artist(artist_id) ON DELETE CASCADE,
    fact_type  text   NOT NULL CHECK (fact_type IN ('history','creation','influence','trivia')),
    fact_text  text   NOT NULL CHECK (char_length(fact_text) BETWEEN 10 AND 500),
    source_id  smallint NOT NULL REFERENCES data_source(source_id),
    source_url text NOT NULL CHECK (source_url ~ '^https?://'),
    fetched_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_fact_target CHECK ((track_id IS NULL) <> (artist_id IS NULL))
);

-- Link to a licensed lyric provider; optional short excerpt (copyright limit: 200 chars).
CREATE TABLE lyric_access (
    track_id   bigint PRIMARY KEY REFERENCES track(track_id) ON DELETE CASCADE,
    source_id  smallint NOT NULL REFERENCES data_source(source_id),
    url        text NOT NULL CHECK (url ~ '^https?://'),
    excerpt    text CHECK (char_length(excerpt) <= 200)
);

-- ---------- Users and activity (transactional) ----------
CREATE TABLE app_user (
    user_id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email              text NOT NULL UNIQUE
                       CHECK (email = lower(email) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
    -- bcrypt only, work factor >= 12 (NFR-02); plain text or MD5/SHA-1 hashes are rejected
    password_hash      text NOT NULL
                       CHECK (password_hash ~ '^[$]2[aby][$](1[2-9]|2[0-9]|3[01])[$].{53}$'),
    display_name       text CHECK (char_length(display_name) BETWEEN 1 AND 50),
    history_consent    boolean NOT NULL DEFAULT false,
    history_consent_at timestamptz,
    is_active          boolean NOT NULL DEFAULT true,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_consent_timestamp CHECK (NOT history_consent OR history_consent_at IS NOT NULL)
);

CREATE TABLE quiz_session (
    session_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        bigint NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    quiz_date      date   NOT NULL DEFAULT current_date,
    started_at     timestamptz NOT NULL DEFAULT now(),
    completed_at   timestamptz,
    familiar_weight numeric(3,2) NOT NULL DEFAULT 0.50 CHECK (familiar_weight BETWEEN 0 AND 1),
    CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE quiz_answer (
    session_id  bigint   NOT NULL REFERENCES quiz_session(session_id) ON DELETE CASCADE,
    question_id smallint NOT NULL,
    option_id   integer  NOT NULL,
    PRIMARY KEY (session_id, question_id),   -- one answer per question
    FOREIGN KEY (question_id, option_id) REFERENCES quiz_option(question_id, option_id)  -- option must belong to the question
);

CREATE TABLE playlist (
    playlist_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id      bigint NOT NULL REFERENCES quiz_session(session_id) ON DELETE CASCADE,
    familiar_weight numeric(3,2) NOT NULL CHECK (familiar_weight BETWEEN 0 AND 1),
    generated_at    timestamptz NOT NULL DEFAULT now(),
    mood_fit_rating smallint CHECK (mood_fit_rating BETWEEN 1 AND 5),   -- KPI-02 (1-5 scale)
    rated_at        timestamptz,
    CONSTRAINT ck_rating_pair CHECK ((mood_fit_rating IS NULL) = (rated_at IS NULL))
);

CREATE TABLE playlist_item (
    playlist_id bigint   NOT NULL REFERENCES playlist(playlist_id) ON DELETE CASCADE,
    position    smallint NOT NULL CHECK (position > 0),
    track_id    bigint   NOT NULL REFERENCES track(track_id) ON DELETE RESTRICT,
    score       numeric(8,4) NOT NULL CHECK (score >= 0),
    is_familiar boolean  NOT NULL,
    PRIMARY KEY (playlist_id, position),
    UNIQUE (playlist_id, track_id)
);

CREATE TABLE listening_event (
    event_id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id          bigint NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    track_id         bigint NOT NULL REFERENCES track(track_id) ON DELETE RESTRICT,
    playlist_id      bigint REFERENCES playlist(playlist_id) ON DELETE SET NULL,
    started_at       timestamptz NOT NULL DEFAULT now(),
    listened_seconds integer NOT NULL DEFAULT 0 CHECK (listened_seconds >= 0)
);

-- ---------- Indexes (each one has a reason; see docs) ----------
CREATE INDEX ix_track_artist            ON track(artist_id);                         -- join artist -> tracks
CREATE INDEX ix_track_tag_tag_track     ON track_tag(tag_id, track_id) INCLUDE (weight); -- tag-overlap scoring (index-only scan)
CREATE INDEX ix_artist_genre_genre      ON artist_genre(genre_id);                   -- coverage by genre
CREATE INDEX ix_fact_track              ON track_fact(track_id)  WHERE track_id  IS NOT NULL;
CREATE INDEX ix_fact_artist             ON track_fact(artist_id) WHERE artist_id IS NOT NULL;
CREATE INDEX ix_quiz_session_user_date  ON quiz_session(user_id, quiz_date DESC);    -- "today's quiz", history
CREATE INDEX ix_playlist_session        ON playlist(session_id);
CREATE INDEX ix_listening_user_track    ON listening_event(user_id, track_id);       -- "already heard" check
CREATE INDEX ix_listening_user_time     ON listening_event(user_id, started_at DESC);-- feed, retention purge
CREATE INDEX ix_listening_started       ON listening_event(started_at);              -- retention purge across users

INSERT INTO schema_migration(version, description) VALUES ('001', 'core schema');
COMMIT;
