-- =====================================================================
-- 002_logic.sql | Functions, triggers, views, materialized view
-- =====================================================================
BEGIN;

-- ---------- Triggers ----------
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END $$;

CREATE TRIGGER trg_app_user_touch BEFORE UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_track_touch    BEFORE UPDATE ON track    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- GDPR: listening history may be stored only for users who gave consent (Art. 6(1)(a)).
CREATE FUNCTION enforce_history_consent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM app_user WHERE user_id = NEW.user_id AND history_consent) THEN
        RAISE EXCEPTION 'user % has not consented to listening-history storage', NEW.user_id
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_listening_consent BEFORE INSERT ON listening_event
    FOR EACH ROW EXECUTE FUNCTION enforce_history_consent();

-- ---------- Masking ----------
-- j***@example.com : keeps the first character and the domain only
CREATE FUNCTION mask_email(p_email text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
    SELECT left(p_email, 1) || '***@' || split_part(p_email, '@', 2)
$$;

CREATE VIEW v_app_user_masked AS
SELECT user_id, mask_email(email) AS email_masked, display_name,
       history_consent, is_active, created_at
FROM app_user;

-- ---------- Views ----------
-- One weight per (track, tag): if several sources tag the same track, take the highest.
CREATE VIEW v_track_tag_best AS
SELECT track_id, tag_id, max(weight) AS weight
FROM track_tag GROUP BY track_id, tag_id;

-- Mood profile of a quiz session: sum of option->tag weights over its answers.
CREATE VIEW v_session_mood AS
SELECT a.session_id, ot.tag_id, sum(ot.weight) AS weight
FROM quiz_answer a JOIN quiz_option_tag ot ON ot.option_id = a.option_id
GROUP BY a.session_id, ot.tag_id;

-- Playlist with the matched mood tags, i.e. the "why" behind each position.
CREATE VIEW v_playlist_explained AS
SELECT p.playlist_id, pi.position, t.track_id, t.title, ar.name AS artist,
       pi.score, pi.is_familiar,
       coalesce(m.matched_tags, '') AS matched_tags
FROM playlist p
JOIN playlist_item pi ON pi.playlist_id = p.playlist_id
JOIN track t          ON t.track_id = pi.track_id
JOIN artist ar        ON ar.artist_id = t.artist_id
LEFT JOIN LATERAL (
    SELECT string_agg(mt.label, ', ' ORDER BY mt.label) AS matched_tags
    FROM v_session_mood sm
    JOIN v_track_tag_best tb ON tb.tag_id = sm.tag_id AND tb.track_id = pi.track_id
    JOIN mood_tag mt         ON mt.tag_id = sm.tag_id
    WHERE sm.session_id = p.session_id
) m ON true;

-- Personal feed: facts about artists/tracks the user has listened to, newest listening first.
CREATE VIEW v_user_feed AS
SELECT le.user_id, f.fact_id, f.fact_type, f.fact_text,
       s.name AS source_name, f.source_url,
       max(le.started_at) AS last_listened_at
FROM listening_event le
JOIN track t      ON t.track_id = le.track_id
JOIN track_fact f ON f.track_id = le.track_id OR f.artist_id = t.artist_id
JOIN data_source s ON s.source_id = f.source_id
GROUP BY le.user_id, f.fact_id, f.fact_type, f.fact_text, s.name, f.source_url;

-- Related genres of a track's artist (US-10); shows source so UI can label them as metadata associations.
CREATE VIEW v_artist_related_genres AS
SELECT ag.artist_id, g.name AS genre, r.relation_type, g2.name AS related_genre, s.name AS source_name
FROM artist_genre ag
JOIN genre g ON g.genre_id = ag.genre_id
JOIN genre_relation r ON r.parent_genre_id = g.genre_id OR r.child_genre_id = g.genre_id
JOIN genre g2 ON g2.genre_id = CASE WHEN r.parent_genre_id = g.genre_id THEN r.child_genre_id ELSE r.parent_genre_id END
JOIN data_source s ON s.source_id = r.source_id;

-- Tag coverage per genre: supports the "enough tagged tracks?" risk check (>= 3 tags per track).
CREATE MATERIALIZED VIEW mv_tag_coverage AS
SELECT g.code AS genre, count(*) AS tracks,
       count(*) FILTER (WHERE coalesce(tc.n, 0) >= 3) AS tracks_with_3plus_tags
FROM genre g
JOIN artist_genre ag ON ag.genre_id = g.genre_id
JOIN track t ON t.artist_id = ag.artist_id
LEFT JOIN (SELECT track_id, count(*) AS n FROM v_track_tag_best GROUP BY track_id) tc ON tc.track_id = t.track_id
GROUP BY g.code;
CREATE UNIQUE INDEX ux_mv_tag_coverage ON mv_tag_coverage(genre);

-- ---------- Ranking (business logic in the database) ----------
-- score = sum(mood_weight * track_tag_weight) * balance_multiplier
--   heard track : 0.5 + familiar_weight       (0.5 .. 1.5)
--   new track   : 1.5 - familiar_weight       (1.5 .. 0.5)
-- tie-break: higher score first, then lower track_id (deterministic, explainable).
-- Runs in ONE transaction: either the playlist and all its items exist, or nothing does.
CREATE FUNCTION generate_playlist(p_session_id bigint, p_limit integer DEFAULT 10)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE
    v_user bigint; v_weight numeric(3,2); v_playlist bigint;
    v_required integer; v_answered integer;
BEGIN
    IF p_limit NOT BETWEEN 1 AND 50 THEN
        RAISE EXCEPTION 'p_limit must be between 1 and 50' USING ERRCODE = '22023';
    END IF;

    SELECT user_id, familiar_weight INTO v_user, v_weight
    FROM quiz_session WHERE session_id = p_session_id FOR UPDATE;   -- serialise concurrent calls
    IF NOT FOUND THEN
        RAISE EXCEPTION 'quiz session % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;

    SELECT count(*) INTO v_required FROM quiz_question WHERE is_active;
    SELECT count(*) INTO v_answered
    FROM quiz_answer a JOIN quiz_question q USING (question_id)
    WHERE a.session_id = p_session_id AND q.is_active;
    IF v_answered < v_required THEN
        RAISE EXCEPTION 'quiz incomplete: % of % required questions answered', v_answered, v_required
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO playlist(session_id, familiar_weight) VALUES (p_session_id, v_weight)
    RETURNING playlist_id INTO v_playlist;

    INSERT INTO playlist_item(playlist_id, position, track_id, score, is_familiar)
    SELECT v_playlist, r.rn, r.track_id, r.final_score, r.heard
    FROM (
        SELECT s.track_id, s.heard,
               round(s.tag_score * CASE WHEN s.heard THEN 0.5 + v_weight ELSE 1.5 - v_weight END, 4) AS final_score,
               row_number() OVER (ORDER BY s.tag_score * CASE WHEN s.heard THEN 0.5 + v_weight ELSE 1.5 - v_weight END DESC,
                                           s.track_id) AS rn
        FROM (
            SELECT tb.track_id,
                   sum(sm.weight * tb.weight) AS tag_score,
                   EXISTS (SELECT 1 FROM listening_event le
                           WHERE le.user_id = v_user AND le.track_id = tb.track_id) AS heard
            FROM v_session_mood sm
            JOIN v_track_tag_best tb ON tb.tag_id = sm.tag_id
            WHERE sm.session_id = p_session_id
            GROUP BY tb.track_id
        ) s
    ) r
    WHERE r.rn <= p_limit;

    UPDATE quiz_session SET completed_at = coalesce(completed_at, now()) WHERE session_id = p_session_id;
    RETURN v_playlist;
END $$;

-- ---------- Retention (GDPR storage limitation) ----------
CREATE FUNCTION purge_old_listening_events(p_retention interval DEFAULT interval '12 months')
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_deleted bigint;
BEGIN
    DELETE FROM listening_event WHERE started_at < now() - p_retention;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END $$;

INSERT INTO schema_migration(version, description) VALUES ('002', 'triggers, views, ranking and retention functions');
COMMIT;
