-- =====================================================================
-- 003_roles.sql | Roles and privileges
-- psql -v backend_password='...' -v reporting_password='...' -f 003_roles.sql
-- =====================================================================
BEGIN;

DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_read')  THEN CREATE ROLE app_read  NOLOGIN; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_write') THEN CREATE ROLE app_write NOLOGIN; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_admin') THEN CREATE ROLE app_admin NOLOGIN; END IF;
END $$;

SELECT format('CREATE ROLE backend_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE', :'backend_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'backend_app') \gexec
SELECT format('CREATE ROLE reporting_ro LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE', :'reporting_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'reporting_ro') \gexec

GRANT app_read  TO app_write;                -- writers can also read
GRANT app_write TO app_admin;
GRANT app_write TO backend_app;              -- the API runs as backend_app, never as superuser
GRANT app_read  TO reporting_ro;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_read;
GRANT CREATE ON SCHEMA public TO app_admin;

-- app_read: catalogue, taxonomy, safe views. NO direct access to app_user (email, password_hash).
GRANT SELECT ON data_source, genre, genre_relation, mood_tag, quiz_question, quiz_option, quiz_option_tag,
                artist, artist_genre, track, track_tag, track_fact, lyric_access,
                v_track_tag_best, v_artist_related_genres, v_app_user_masked, mv_tag_coverage TO app_read;
GRANT EXECUTE ON FUNCTION mask_email(text) TO app_read;

-- app_write: everything the API changes at run time.
GRANT SELECT, INSERT, UPDATE, DELETE ON app_user TO app_write;       -- DELETE = right to erasure
GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_session, quiz_answer, playlist, playlist_item, listening_event TO app_write;
GRANT INSERT, UPDATE, DELETE ON artist, artist_genre, track, track_tag, track_fact, lyric_access TO app_write; -- metadata sync
GRANT SELECT ON v_session_mood, v_playlist_explained, v_user_feed TO app_write;
GRANT EXECUTE ON FUNCTION generate_playlist(bigint, integer), purge_old_listening_events(interval) TO app_write;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_write;

-- app_admin: reference data and schema management.
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_admin;

-- Objects created later by this owner are visible to app_admin only; everything else needs an explicit GRANT
-- (secure by default). Review checklist: docs section "Adding new objects".
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_admin;

INSERT INTO schema_migration(version, description) VALUES ('003', 'roles and privileges');
COMMIT;
