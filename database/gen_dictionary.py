import json, subprocess, re, collections
def q(sql):
    r=subprocess.run(['su','postgres','-c',f'psql -d musicmood -At -c "{sql}"'],capture_output=True,text=True)
    return json.loads(r.stdout.strip())
cols=q("""select json_agg(x) from (select c.relname t,a.attnum n,a.attname col,format_type(a.atttypid,a.atttypmod) typ,a.attnotnull nn,a.attidentity idn,pg_get_expr(d.adbin,d.adrelid) def from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace s on s.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where s.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped order by c.relname,a.attnum) x""")
cons=q("""select json_agg(x) from (select conrelid::regclass::text t,contype ty,conname nm,(select array_agg(a.attname order by k.ord) from unnest(conkey) with ordinality k(attnum,ord) join pg_attribute a on a.attrelid=conrelid and a.attnum=k.attnum) cols,pg_get_constraintdef(oid) def,confrelid::regclass::text ref,confdeltype dt from pg_constraint where connamespace='public'::regnamespace) x""")
purpose={
'schema_migration':'Version history of applied migration scripts (database versioning).',
'data_source':'Where metadata, tags, facts, lyrics links and playback come from; used for source attribution.',
'genre':'The five supported genres: blues, country, jazz, rock, metal.',
'genre_relation':'Directed relations between genres (root, subgenre, related); labelled in the UI as metadata associations.',
'mood_tag':'Controlled vocabulary of mood tags used by the quiz and by track tagging.',
'quiz_question':'Quiz questions (3-5 active at a time).',
'quiz_option':'Answer options of a question.',
'quiz_option_tag':'Mapping from an answer option to mood tags with a weight (the quiz-to-tag rule).',
'artist':'Artists and bands in the cached catalogue.',
'artist_genre':'Many-to-many link between artists and genres.',
'track':'Cached tracks with identifiers for official embedded playback; no audio is stored.',
'track_tag':'Mood tags of a track with a weight and the source that provided them.',
'track_fact':'Source-attributed facts about either a track or an artist.',
'lyric_access':'Link to a licensed lyrics provider and an optional excerpt of at most 200 characters.',
'app_user':'Registered listeners: e-mail, bcrypt hash, consent flag for listening history (GDPR).',
'quiz_session':'One quiz attempt by a user, with the familiar/discovery balance value.',
'quiz_answer':'The option chosen for each question in a session (one answer per question).',
'playlist':'A generated playlist for a session; stores the 1-5 mood-fit rating used for KPI-02.',
'playlist_item':'Ranked tracks of a playlist with score and familiar flag.',
'listening_event':'Listening history: which user played which track, when and for how long.'}
by=collections.defaultdict(list)
for c in cols: by[c['t']].append(c)
cc=collections.defaultdict(list)
for k in cons: cc[k['t']].append(k)
out=["# Data Dictionary\n","Generated from the live PostgreSQL 16 catalog after running migrations 001-004 (script: `gen_dictionary.py`). Do not edit by hand; regenerate after each migration.\n",
"## General data-quality expectations\n",
"- Every table has a primary key; every relationship is a foreign key with an explicit `ON DELETE` rule (CASCADE for owned child rows, RESTRICT for catalogue rows referenced by history).",
"- Text codes are lowercase slugs; e-mail is stored lowercase and validated by pattern; password hashes must be bcrypt with work factor 12 or higher.",
"- Weights are in the range (0, 1]; the familiar/discovery balance and ratings have fixed ranges (0-1 and 1-5).",
"- Timestamps are `timestamptz`; years are `smallint` with a plausible range; identifiers are identity columns.",
"- A fact belongs to exactly one of track or artist; lyric excerpts never exceed 200 characters; audio is never stored.\n"]
for t in sorted(by, key=lambda x:(x=='schema_migration',)):
    out.append(f"## {t}\n\n{purpose.get(t,'')}\n")
    pk=[k for k in cc[t] if k['ty']=='p']; pkc=set(pk[0]['cols']) if pk else set()
    fks={}; 
    for k in cc[t]:
        if k['ty']=='f': 
            for c in k['cols']: fks.setdefault(c,[]).append((k['ref'],len(k['cols'])>1))
    uq=collections.defaultdict(list)
    for k in cc[t]:
        if k['ty']=='u':
            for c in k['cols']: uq[c].append(k['cols'])
    out.append("| Column | Type | Null | Key | Rules / data quality |\n|---|---|---|---|---|")
    for c in by[t]:
        key=[]
        if c['col'] in pkc: key.append('PK'+(' (composite)' if len(pkc)>1 else ''))
        for ref,comp in fks.get(c['col'],[]): key.append('FK→'+ref+(' (composite)' if comp else ''))
        for u in uq.get(c['col'],[]): key.append('UNIQUE'+('' if len(u)==1 else ' with '+', '.join(x for x in u if x!=c['col'])))
        rules=[]
        if c['idn']: rules.append('identity')
        if c['def'] and not c['idn']: rules.append('default '+c['def'].replace('|','\\|'))
        for k in cc[t]:
            if k['ty']=='c' and c['col'] in re.findall(r'\b\w+\b',k['def']):
                d=k['def'].replace('CHECK ','',1).replace('|','\\|')
                rules.append('CHECK '+d)
        out.append(f"| `{c['col']}` | {c['typ']} | {'NO' if c['nn'] else 'yes'} | {'; '.join(key)} | {'; '.join(rules)} |")
    out.append("")
out.append("## Views, materialized view, functions, triggers\n")
out.append("| Object | Purpose |\n|---|---|")
for o,p in [('v_app_user_masked','Users with masked e-mail (j***@domain); the only user view readable by app_read'),
('v_track_tag_best','One weight per (track, tag): the highest across sources'),
('v_session_mood','Mood profile of a quiz session (sum of option→tag weights)'),
('v_playlist_explained','Playlist with title, artist, score and matched mood tags (explainable ranking)'),
('v_user_feed','Facts for artists/tracks the user has listened to (personal feed)'),
('v_artist_related_genres','Related genres/roots of an artist with source'),
('mv_tag_coverage','Materialized: tracks per genre and how many have 3+ tags (data-coverage risk check)'),
('generate_playlist(session, limit)','Ranking in one transaction: score = Σ(mood weight × track tag weight) × balance multiplier; tie-break by track_id'),
('purge_old_listening_events(interval)','Deletes listening history older than the retention period (default 12 months)'),
('mask_email(text)','Masks an e-mail address'),
('enforce_history_consent() trigger','Rejects listening_event rows for users without history consent'),
('touch_updated_at() trigger','Maintains updated_at on app_user and track')]:
    out.append(f"| `{o}` | {p} |")
open('/mnt/user-data/outputs/database/DATA_DICTIONARY.md','w').write("\n".join(out)+"\n")

# ---------- ER diagram ----------
blocks={'Sources and taxonomy':('#DCE9F7',['data_source','genre','genre_relation','mood_tag']),
 'Quiz definition':('#FDE9C9',['quiz_question','quiz_option','quiz_option_tag']),
 'Music catalogue':('#DDF0DD',['artist','artist_genre','track','track_tag','track_fact','lyric_access']),
 'Users and activity':('#F7D9DC',['app_user','quiz_session','quiz_answer','playlist','playlist_item','listening_event'])}
dot=['digraph G {','rankdir=LR; fontname="Helvetica"; nodesep=0.35; ranksep=1.1; compound=true;','node [shape=plain fontname="Helvetica" fontsize=12]; edge [color="#444444" arrowhead=tee arrowtail=crow dir=both];']
for i,(name,(col,ts)) in enumerate(blocks.items()):
    dot.append(f'subgraph cluster_{i} {{ label="{name}"; fontsize=18; style="filled,rounded"; fillcolor="{col}"; color="#888888";')
    for t in ts:
        pk=set(next((k['cols'] for k in cc[t] if k['ty']=='p'),[])); fk=set(c for k in cc[t] if k['ty']=='f' for c in k['cols'])
        rows=''.join(f'<TR><TD ALIGN="LEFT" BGCOLOR="white">{"<B>PK </B>" if c in pk else ""}{"FK " if c in fk else ""}{c}</TD></TR>' for c in [x['col'] for x in by[t]] if c in pk or c in fk)
        extra=len(by[t])-sum(1 for x in by[t] if x['col'] in pk or x['col'] in fk)
        more=f'<TR><TD ALIGN="LEFT" BGCOLOR="white"><I>+ {extra} more columns</I></TD></TR>' if extra else ''
        dot.append(f'{t} [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="4"><TR><TD BGCOLOR="#222222"><FONT COLOR="white"><B>{t}</B></FONT></TD></TR>{rows}{more}</TABLE>>];')
    dot.append('}')
seen=set()
for t,ks in cc.items():
    for k in ks:
        if k['ty']=='f' and (t,k['ref']) not in seen and t!=k['ref']:
            seen.add((t,k['ref'])); dot.append(f'{t} -> {k["ref"]};')
dot.append('}')
open('/tmp/er.dot','w').write('\n'.join(dot))
