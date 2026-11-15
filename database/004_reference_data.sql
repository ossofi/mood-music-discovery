-- =====================================================================
-- 004_reference_data.sql | Fixed reference data (idempotent re-run is NOT supported; run once)
-- =====================================================================
BEGIN;

INSERT INTO data_source(name, kind, base_url) VALUES
 ('MusicBrainz',        'metadata', 'https://musicbrainz.org'),
 ('Last.fm',            'tags',     'https://www.last.fm'),
 ('Wikidata',           'facts',    'https://www.wikidata.org'),
 ('Licensed lyrics provider', 'lyrics', NULL),
 ('Spotify embed',      'playback', 'https://open.spotify.com'),
 ('Deezer embed',       'playback', 'https://www.deezer.com'),
 ('Manual curation',    'manual',   NULL);

INSERT INTO genre(code, name) VALUES
 ('blues','Blues'), ('country','Country'), ('jazz','Jazz'), ('rock','Rock'), ('metal','Metal');

INSERT INTO genre_relation(parent_genre_id, child_genre_id, relation_type, source_id)
SELECT p.genre_id, c.genre_id, x.rel, (SELECT source_id FROM data_source WHERE name = 'Manual curation')
FROM (VALUES ('blues','rock','root_of'), ('blues','jazz','root_of'), ('rock','metal','subgenre_of'),
             ('country','rock','related_to'), ('jazz','blues','related_to')) AS x(parent, child, rel)
JOIN genre p ON p.code = x.parent JOIN genre c ON c.code = x.child;

INSERT INTO mood_tag(code, label, category) VALUES
 ('calm','Calm','energy'), ('relaxed','Relaxed','energy'), ('energetic','Energetic','energy'), ('focused','Focused','energy'),
 ('melancholic','Melancholic','valence'), ('uplifting','Uplifting','valence'), ('hopeful','Hopeful','valence'),
 ('nostalgic','Nostalgic','valence'), ('dark','Dark','valence'),
 ('angry','Angry','character'), ('rebellious','Rebellious','character');

INSERT INTO quiz_question(code, prompt, position) VALUES
 ('energy',      'How is your energy right now?', 1),
 ('target-mood', 'How do you want to feel?',      2),
 ('setting',     'What are you doing?',           3),
 ('pace',        'What pace suits you?',          4);

-- options: (question code, position, label)
INSERT INTO quiz_option(question_id, position, label)
SELECT q.question_id, o.pos, o.label
FROM (VALUES
 ('energy',1,'Low and tired'), ('energy',2,'Steady'), ('energy',3,'Up for it'), ('energy',4,'Wired and restless'),
 ('target-mood',1,'Comforted'), ('target-mood',2,'Lifted'), ('target-mood',3,'Challenged'), ('target-mood',4,'Let it all out'),
 ('setting',1,'Winding down'), ('setting',2,'Working or studying'), ('setting',3,'Driving or moving'), ('setting',4,'Late at night'),
 ('pace',1,'Slow burn'), ('pace',2,'Mid-tempo'), ('pace',3,'Driving'), ('pace',4,'Pounding')
) AS o(qcode, pos, label) JOIN quiz_question q ON q.code = o.qcode;

-- option -> mood tag mapping: (question code, option position, tag code, weight)
INSERT INTO quiz_option_tag(option_id, tag_id, weight)
SELECT qo.option_id, mt.tag_id, m.w
FROM (VALUES
 ('energy',1,'calm',0.80), ('energy',1,'melancholic',0.40),
 ('energy',2,'focused',0.60), ('energy',2,'relaxed',0.50),
 ('energy',3,'energetic',0.80), ('energy',3,'uplifting',0.40),
 ('energy',4,'energetic',0.90), ('energy',4,'rebellious',0.50),
 ('target-mood',1,'nostalgic',0.70), ('target-mood',1,'relaxed',0.50),
 ('target-mood',2,'uplifting',0.80), ('target-mood',2,'hopeful',0.50),
 ('target-mood',3,'rebellious',0.70), ('target-mood',3,'dark',0.40),
 ('target-mood',4,'angry',0.80), ('target-mood',4,'dark',0.50),
 ('setting',1,'relaxed',0.70), ('setting',1,'calm',0.60),
 ('setting',2,'focused',0.80), ('setting',2,'calm',0.40),
 ('setting',3,'energetic',0.60), ('setting',3,'hopeful',0.40),
 ('setting',4,'dark',0.60), ('setting',4,'melancholic',0.60),
 ('pace',1,'calm',0.50), ('pace',1,'melancholic',0.50),
 ('pace',2,'relaxed',0.40), ('pace',2,'nostalgic',0.40),
 ('pace',3,'energetic',0.60), ('pace',3,'rebellious',0.30),
 ('pace',4,'angry',0.50), ('pace',4,'dark',0.50)
) AS m(qcode, pos, tcode, w)
JOIN quiz_question q ON q.code = m.qcode
JOIN quiz_option qo  ON qo.question_id = q.question_id AND qo.position = m.pos
JOIN mood_tag mt     ON mt.code = m.tcode;

INSERT INTO schema_migration(version, description) VALUES ('004', 'reference data: sources, genres, tags, quiz');
COMMIT;
