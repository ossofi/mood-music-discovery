-- =====================================================================
-- 005_test_data.sql | DEMO / TEST DATA ONLY (never load into production)
-- Accounts: alice@example.com, bob@example.com, carol@example.com  (password: TestPass123!)
-- Tag weights are illustrative values assigned for testing, not measured data.
-- =====================================================================
BEGIN;

INSERT INTO app_user(email, password_hash, display_name, history_consent, history_consent_at) VALUES
 ('alice@example.com', '$2b$12$IpD12WZtnsRWApGMWh3qAeZVRQlaeHTABrnJd2LkgM0PXKNwuhcJ2', 'Alice', true,  now()),
 ('bob@example.com',   '$2b$12$IpD12WZtnsRWApGMWh3qAeZVRQlaeHTABrnJd2LkgM0PXKNwuhcJ2', 'Bob',   false, NULL),    -- edge case: no history consent
 ('carol@example.com', '$2b$12$IpD12WZtnsRWApGMWh3qAeZVRQlaeHTABrnJd2LkgM0PXKNwuhcJ2', 'Carol', true,  now());

INSERT INTO artist(name, origin_country, formed_year) VALUES
 ('Muddy Waters','US',NULL), ('Johnny Cash','US',NULL), ('Miles Davis','US',NULL), ('Led Zeppelin','GB',1968),
 ('Black Sabbath','GB',1968), ('Metallica','US',1981), ('Nirvana','US',1987), ('B.B. King','US',NULL),
 ('The Dave Brubeck Quartet','US',NULL), ('The Rolling Stones','GB',1962), ('Willie Nelson','US',NULL),
 ('Pink Floyd','GB',1965), ('Iron Maiden','GB',1975), ('Hank Williams','US',NULL),
 ('Creedence Clearwater Revival','US',1968), ('John Coltrane','US',NULL), ('Deep Purple','GB',1968);

INSERT INTO artist_genre(artist_id, genre_id)
SELECT a.artist_id, g.genre_id
FROM (VALUES ('Muddy Waters','blues'), ('Johnny Cash','country'), ('Johnny Cash','rock'), ('Miles Davis','jazz'),
 ('Led Zeppelin','rock'), ('Led Zeppelin','blues'), ('Black Sabbath','metal'), ('Black Sabbath','rock'),
 ('Metallica','metal'), ('Nirvana','rock'), ('B.B. King','blues'), ('The Dave Brubeck Quartet','jazz'),
 ('The Rolling Stones','rock'), ('The Rolling Stones','blues'), ('Willie Nelson','country'), ('Pink Floyd','rock'),
 ('Iron Maiden','metal'), ('Hank Williams','country'), ('Creedence Clearwater Revival','rock'),
 ('John Coltrane','jazz'), ('Deep Purple','rock'), ('Deep Purple','metal')) AS x(an, gc)
JOIN artist a ON a.name = x.an JOIN genre g ON g.code = x.gc;

INSERT INTO track(artist_id, title, release_year)
SELECT a.artist_id, x.title, x.yr
FROM (VALUES ('Muddy Waters','Hoochie Coochie Man',1954), ('Johnny Cash','Folsom Prison Blues',1955),
 ('Miles Davis','So What',1959), ('Led Zeppelin','Whole Lotta Love',1969), ('Black Sabbath','Paranoid',1970),
 ('Metallica','Master of Puppets',1986), ('Nirvana','Smells Like Teen Spirit',1991), ('B.B. King','The Thrill Is Gone',1969),
 ('The Dave Brubeck Quartet','Take Five',1959), ('The Rolling Stones','Paint It Black',1966),
 ('Willie Nelson','On the Road Again',1980), ('Pink Floyd','Wish You Were Here',1975),
 ('Iron Maiden','The Trooper',1983), ('Hank Williams','I''m So Lonesome I Could Cry',1949),
 ('Creedence Clearwater Revival','Fortunate Son',1969), ('John Coltrane','Naima',1960),
 ('Deep Purple','Smoke on the Water',1972),
 ('Pink Floyd','Time',1973)) AS x(an, title, yr)     -- last one: edge case, no tags
JOIN artist a ON a.name = x.an;

INSERT INTO track_tag(track_id, tag_id, source_id, weight)
SELECT t.track_id, mt.tag_id, (SELECT source_id FROM data_source WHERE name='Manual curation'), x.w
FROM (VALUES
 ('Hoochie Coochie Man','dark',0.7), ('Hoochie Coochie Man','rebellious',0.5), ('Hoochie Coochie Man','nostalgic',0.6),
 ('Folsom Prison Blues','rebellious',0.7), ('Folsom Prison Blues','nostalgic',0.6), ('Folsom Prison Blues','dark',0.4),
 ('So What','calm',0.8), ('So What','focused',0.8), ('So What','relaxed',0.6),
 ('Whole Lotta Love','energetic',0.9), ('Whole Lotta Love','rebellious',0.6),
 ('Paranoid','angry',0.7), ('Paranoid','energetic',0.8), ('Paranoid','dark',0.5),
 ('Master of Puppets','angry',0.9), ('Master of Puppets','dark',0.7), ('Master of Puppets','energetic',0.8),
 ('Smells Like Teen Spirit','angry',0.7), ('Smells Like Teen Spirit','rebellious',0.9), ('Smells Like Teen Spirit','energetic',0.8),
 ('The Thrill Is Gone','melancholic',0.9), ('The Thrill Is Gone','dark',0.4), ('The Thrill Is Gone','calm',0.4),
 ('Take Five','relaxed',0.8), ('Take Five','focused',0.7), ('Take Five','calm',0.6),
 ('Paint It Black','dark',0.8), ('Paint It Black','angry',0.5), ('Paint It Black','melancholic',0.4),
 ('On the Road Again','uplifting',0.8), ('On the Road Again','hopeful',0.7), ('On the Road Again','energetic',0.4),
 ('Wish You Were Here','melancholic',0.8), ('Wish You Were Here','nostalgic',0.8), ('Wish You Were Here','calm',0.6),
 ('The Trooper','energetic',0.9), ('The Trooper','rebellious',0.4),
 ('I''m So Lonesome I Could Cry','melancholic',0.9), ('I''m So Lonesome I Could Cry','nostalgic',0.6), ('I''m So Lonesome I Could Cry','dark',0.3),
 ('Fortunate Son','angry',0.6), ('Fortunate Son','rebellious',0.8), ('Fortunate Son','energetic',0.7),
 ('Naima','calm',0.8), ('Naima','focused',0.6), ('Naima','melancholic',0.5),
 ('Smoke on the Water','energetic',0.7), ('Smoke on the Water','rebellious',0.5)
) AS x(title, tcode, w)
JOIN track t ON t.title = x.title JOIN mood_tag mt ON mt.code = x.tcode;

-- Facts: some on tracks, some on artists; most artists have none (edge case: page must stay usable).
INSERT INTO track_fact(track_id, artist_id, fact_type, fact_text, source_id, source_url)
SELECT t.track_id, NULL, x.ft, x.txt, (SELECT source_id FROM data_source WHERE name='Manual curation'), x.url
FROM (VALUES
 ('Smoke on the Water','history','Inspired by a 1971 fire at the Montreux Casino during a Frank Zappa concert.','https://en.wikipedia.org/wiki/Smoke_on_the_Water'),
 ('Take Five','creation','Composed by saxophonist Paul Desmond and written in 5/4 time.','https://en.wikipedia.org/wiki/Take_Five'),
 ('So What','history','Opens the 1959 album Kind of Blue.','https://en.wikipedia.org/wiki/So_What_(Miles_Davis_composition)'),
 ('Hoochie Coochie Man','creation','Written by Willie Dixon for Muddy Waters.','https://en.wikipedia.org/wiki/Hoochie_Coochie_Man'),
 ('The Trooper','influence','Inspired by the Charge of the Light Brigade in the Crimean War.','https://en.wikipedia.org/wiki/The_Trooper')
) AS x(title, ft, txt, url) JOIN track t ON t.title = x.title;

INSERT INTO track_fact(track_id, artist_id, fact_type, fact_text, source_id, source_url)
SELECT NULL, a.artist_id, 'history', x.txt, (SELECT source_id FROM data_source WHERE name='Manual curation'), x.url
FROM (VALUES
 ('Metallica','Formed in Los Angeles in 1981.','https://en.wikipedia.org/wiki/Metallica'),
 ('Black Sabbath','Formed in Birmingham, England, in 1968.','https://en.wikipedia.org/wiki/Black_Sabbath')
) AS x(an, txt, url) JOIN artist a ON a.name = x.an;

-- Lyrics: link to a licensed provider only; no excerpts are stored in the test data.
INSERT INTO lyric_access(track_id, source_id, url)
SELECT t.track_id, (SELECT source_id FROM data_source WHERE name='Licensed lyrics provider'), 'https://lyrics.example.org/track/' || t.track_id
FROM track t WHERE t.title IN ('Paranoid','Wish You Were Here');

-- ---------- Activity: alice has history, then two quiz sessions with different balance ----------
CREATE FUNCTION pg_temp.answer(p_session bigint, p_q text, p_pos integer) RETURNS void LANGUAGE sql AS $$
    INSERT INTO quiz_answer(session_id, question_id, option_id)
    SELECT p_session, q.question_id, o.option_id
    FROM quiz_question q JOIN quiz_option o ON o.question_id = q.question_id AND o.position = p_pos
    WHERE q.code = p_q
$$;

DO $$
DECLARE s1 bigint; s2 bigint; s3 bigint; s4 bigint; pl bigint;
BEGIN
    -- history first (alice listened to calm/jazz-like tracks)
    INSERT INTO listening_event(user_id, track_id, started_at, listened_seconds)
    SELECT u.user_id, t.track_id, now() - interval '3 days', 240
    FROM app_user u, track t WHERE u.email='alice@example.com' AND t.title IN ('So What','Wish You Were Here');

    -- alice, session 1: balance 0.5 (neutral). Calm, comforted, winding down, slow burn.
    INSERT INTO quiz_session(user_id, familiar_weight) SELECT user_id, 0.50 FROM app_user WHERE email='alice@example.com' RETURNING session_id INTO s1;
    PERFORM pg_temp.answer(s1,'energy',1); PERFORM pg_temp.answer(s1,'target-mood',1);
    PERFORM pg_temp.answer(s1,'setting',1); PERFORM pg_temp.answer(s1,'pace',1);
    pl := generate_playlist(s1, 10);
    UPDATE playlist SET mood_fit_rating = 5, rated_at = now() WHERE playlist_id = pl;

    -- alice, session 2: same answers, balance 1.0 (maximum familiar)
    INSERT INTO quiz_session(user_id, familiar_weight) SELECT user_id, 1.00 FROM app_user WHERE email='alice@example.com' RETURNING session_id INTO s2;
    PERFORM pg_temp.answer(s2,'energy',1); PERFORM pg_temp.answer(s2,'target-mood',1);
    PERFORM pg_temp.answer(s2,'setting',1); PERFORM pg_temp.answer(s2,'pace',1);
    PERFORM generate_playlist(s2, 10);

    -- bob: angry/loud session, no consent => no history
    INSERT INTO quiz_session(user_id) SELECT user_id FROM app_user WHERE email='bob@example.com' RETURNING session_id INTO s3;
    PERFORM pg_temp.answer(s3,'energy',4); PERFORM pg_temp.answer(s3,'target-mood',4);
    PERFORM pg_temp.answer(s3,'setting',3); PERFORM pg_temp.answer(s3,'pace',4);
    PERFORM generate_playlist(s3, 10);

    -- carol: incomplete quiz (2 of 4 answers) - generate_playlist must refuse (tested in 006)
    INSERT INTO quiz_session(user_id) SELECT user_id FROM app_user WHERE email='carol@example.com' RETURNING session_id INTO s4;
    PERFORM pg_temp.answer(s4,'energy',2); PERFORM pg_temp.answer(s4,'setting',2);
END $$;

REFRESH MATERIALIZED VIEW mv_tag_coverage;
INSERT INTO schema_migration(version, description) VALUES ('005-test', 'demo/test data');
COMMIT;
