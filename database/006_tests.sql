-- =====================================================================
-- 006_tests.sql | Integrity, business-rule and permission tests (run after 005)
-- Every block prints PASS or aborts with FAIL. Safe to run on a test database only.
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;

CREATE FUNCTION pg_temp.expect_error(p_sql text, p_state text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_ok boolean := false;
BEGIN
    BEGIN
        EXECUTE p_sql;
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = p_state THEN v_ok := true;
        ELSE RAISE EXCEPTION 'FAIL %: expected %, got % (%)', p_label, p_state, SQLSTATE, SQLERRM; END IF;
    END;
    IF NOT v_ok THEN RAISE EXCEPTION 'FAIL %: no error raised', p_label; END IF;
    RAISE NOTICE 'PASS: %', p_label;
END $$;

CREATE FUNCTION pg_temp.expect_true(p_cond boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    IF p_cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL %', p_label; END IF;
    RAISE NOTICE 'PASS: %', p_label;
END $$;

-- ---------- Integrity constraints ----------
SELECT pg_temp.expect_error($$INSERT INTO app_user(email,password_hash) SELECT 'alice@example.com', password_hash FROM app_user LIMIT 1$$, '23505', 'duplicate e-mail rejected');
SELECT pg_temp.expect_error($$INSERT INTO app_user(email,password_hash) VALUES ('Mixed@Example.com', repeat('x',60))$$, '23514', 'non-lowercase e-mail / non-bcrypt hash rejected');
SELECT pg_temp.expect_error($$INSERT INTO app_user(email,password_hash) VALUES ('plain@example.com','password123')$$, '23514', 'plain-text password rejected');
SELECT pg_temp.expect_error($$INSERT INTO app_user(email,password_hash) VALUES ('md5@example.com','5f4dcc3b5aa765d61d8327deb882cf99')$$, '23514', 'MD5 hash rejected');
SELECT pg_temp.expect_error($$INSERT INTO app_user(email,password_hash) VALUES ('weak@example.com','$2b$10$' || repeat('a',53))$$, '23514', 'bcrypt work factor below 12 rejected');
SELECT pg_temp.expect_error($$INSERT INTO track_fact(track_id,artist_id,fact_type,fact_text,source_id,source_url)
  SELECT t.track_id, t.artist_id,'trivia','A fact about both a track and artist',1,'https://x.org' FROM track t LIMIT 1$$, '23514', 'fact must target exactly one of track/artist (both given)');
SELECT pg_temp.expect_error($$INSERT INTO track_fact(fact_type,fact_text,source_id,source_url) VALUES ('trivia','A fact about nothing at all',1,'https://x.org')$$, '23514', 'fact must target exactly one of track/artist (none given)');
SELECT pg_temp.expect_error($$INSERT INTO quiz_answer(session_id,question_id,option_id)
  SELECT s.session_id, 2, (SELECT option_id FROM quiz_option WHERE question_id = 1 LIMIT 1)
  FROM quiz_session s JOIN app_user u USING (user_id) WHERE u.email = 'carol@example.com'$$, '23503', 'answer option must belong to its question');
SELECT pg_temp.expect_error($$INSERT INTO quiz_answer(session_id,question_id,option_id)
  SELECT a.session_id, a.question_id, a.option_id FROM quiz_answer a LIMIT 1$$, '23505', 'one answer per question per session');
SELECT pg_temp.expect_error($$UPDATE playlist SET mood_fit_rating = 4 WHERE rated_at IS NULL$$, '23514', 'rating requires rated_at');
SELECT pg_temp.expect_error($$UPDATE lyric_access SET excerpt = repeat('a',201)$$, '23514', 'lyric excerpt limited to 200 characters');
SELECT pg_temp.expect_error($$DELETE FROM track WHERE track_id IN (SELECT track_id FROM playlist_item)$$, '23503', 'track used in a playlist cannot be deleted');
SELECT pg_temp.expect_error($$INSERT INTO listening_event(user_id, track_id) SELECT u.user_id, t.track_id FROM app_user u, track t WHERE u.email='bob@example.com' LIMIT 1$$, '23514', 'no history without consent (trigger)');

-- ---------- Business rules ----------
SELECT pg_temp.expect_error($$SELECT generate_playlist(session_id) FROM quiz_session s JOIN app_user u USING (user_id) WHERE u.email='carol@example.com'$$, '22023', 'incomplete quiz does not generate a playlist');
SELECT pg_temp.expect_true((SELECT count(*) = 10 FROM playlist_item WHERE playlist_id = (SELECT max(playlist_id) FROM playlist)), 'enough matches: playlist has the requested 10 tracks (US-04)');
SELECT pg_temp.expect_true((SELECT count(*) < 10 AND count(*) = (SELECT count(DISTINCT tb.track_id) FROM v_session_mood sm JOIN v_track_tag_best tb USING (tag_id) WHERE sm.session_id = (SELECT session_id FROM playlist WHERE playlist_id = (SELECT min(playlist_id) FROM playlist)))
                            FROM playlist_item WHERE playlist_id = (SELECT min(playlist_id) FROM playlist)), 'fewer than 10 matches: all available matches returned (US-04)');
SELECT pg_temp.expect_true((SELECT bool_and(score <= prev) FROM (SELECT score, lag(score) OVER (ORDER BY position) AS prev0, coalesce(lag(score) OVER (ORDER BY position), 1e9) AS prev FROM playlist_item WHERE playlist_id = (SELECT min(playlist_id) FROM playlist)) x), 'scores are in descending order');
SELECT pg_temp.expect_true((SELECT NOT EXISTS (SELECT 1 FROM playlist_item pi JOIN track t USING (track_id) WHERE t.title = 'Time')), 'untagged track never appears in a playlist');
SELECT pg_temp.expect_true((
    SELECT (SELECT score FROM playlist_item pi JOIN track t USING (track_id) WHERE t.title = 'So What'   AND pi.playlist_id = 2) > (SELECT score FROM playlist_item pi JOIN track t USING (track_id) WHERE t.title = 'So What'   AND pi.playlist_id = 1)
       AND (SELECT score FROM playlist_item pi JOIN track t USING (track_id) WHERE t.title = 'Take Five' AND pi.playlist_id = 2) < (SELECT score FROM playlist_item pi JOIN track t USING (track_id) WHERE t.title = 'Take Five' AND pi.playlist_id = 1)),
  'familiar slider 0.5 -> 1.0 raises heard-track score and lowers new-track score');
SELECT pg_temp.expect_true((SELECT count(*) > 0 FROM v_playlist_explained WHERE matched_tags <> ''), 'playlist explanation lists matched mood tags');
SELECT pg_temp.expect_true((SELECT count(*) > 0 FROM v_user_feed), 'feed contains facts for listened artists/tracks');
SELECT pg_temp.expect_true((SELECT email_masked FROM v_app_user_masked WHERE display_name='Alice') = 'a***@example.com', 'e-mail masking');
SELECT pg_temp.expect_true((SELECT purge_old_listening_events(interval '1 day') = 2), 'retention purge removes events older than the limit');

-- ---------- Permissions ----------
DO $$
BEGIN
    SET LOCAL ROLE app_read;
    BEGIN
        PERFORM 1 FROM app_user;
        RAISE EXCEPTION 'FAIL: app_read can read app_user';
    EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: app_read cannot read app_user (password hashes)'; END;
    PERFORM 1 FROM v_app_user_masked;  RAISE NOTICE 'PASS: app_read can read the masked view';
    BEGIN
        INSERT INTO genre(code,name) VALUES ('x','X');
        RAISE EXCEPTION 'FAIL: app_read can write';
    EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: app_read cannot write'; END;
    RESET ROLE;
    SET LOCAL ROLE backend_app;
    PERFORM 1 FROM app_user;           RAISE NOTICE 'PASS: backend_app (app_write) can read app_user';
    BEGIN
        INSERT INTO genre(code,name) VALUES ('x','X');
        RAISE EXCEPTION 'FAIL: backend_app can edit reference data';
    EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: backend_app cannot edit reference data'; END;
    RESET ROLE;
END $$;
SELECT pg_temp.expect_true((SELECT NOT rolsuper FROM pg_roles WHERE rolname='backend_app'), 'application role is not a superuser');

ROLLBACK;   -- tests leave no data behind
