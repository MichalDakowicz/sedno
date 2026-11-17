-- Sesje nauki dla angielskiego. Klucze wariantów i zapis prób są dostępne tylko przez RPC.
create table private.learning_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  skill_id text not null references private.learning_skills (id),
  level text not null check (level in ('podstawowy', 'rozszerzony', 'dwujezyczny')),
  format text not null check (format in ('szybka-runda', 'napraw-blad', 'sokratejski')),
  target int not null check (target between 3 and 8),
  streak int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  result jsonb,
  primary key (user_id, id)
);

create index learning_sessions_by_skill
  on private.learning_sessions (user_id, level, skill_id, completed_at desc);

create table private.learning_session_items (
  user_id uuid not null,
  session_id uuid not null,
  position int not null check (position between 1 and 8),
  variant_id text not null,
  prompt jsonb not null,
  accepted text[] not null check (cardinality(accepted) > 0),
  explanation text not null,
  hints text[] not null,
  error_type text,
  hint_level int not null default 0 check (hint_level between 0 and cardinality(hints)),
  answer text,
  correct boolean,
  answered_at timestamptz,
  primary key (user_id, session_id, position),
  unique (user_id, session_id, variant_id),
  foreign key (user_id, session_id) references private.learning_sessions (user_id, id) on delete cascade
);

alter table private.learning_sessions enable row level security;
alter table private.learning_session_items enable row level security;

create function private.learning_user() returns uuid
language plpgsql stable set search_path = '' as $$
declare
  u uuid := auth.uid();
begin
  if u is null then
    raise sqlstate '28000' using message = 'not_signed_in';
  end if;
  return u;
end;
$$;

create function private.learning_level(p_user uuid, p_level text) returns text
language plpgsql stable set search_path = '' as $$
declare
  level text := p_level;
begin
  if level is null then
    select s.item->>'poziom' into level
    from public.profiles p
    cross join lateral jsonb_array_elements(p.subjects) with ordinality as s(item, n)
    where p.id = p_user and s.item->>'id' = 'angielski'
      and s.item->>'poziom' in ('podstawowy', 'rozszerzony', 'dwujezyczny')
    order by s.n
    limit 1;
    level := coalesce(level, 'podstawowy');
  end if;
  if level not in ('podstawowy', 'rozszerzony', 'dwujezyczny') then
    raise sqlstate 'PT400' using message = 'invalid_level';
  end if;
  return level;
end;
$$;

create function private.learning_evidence(p_user uuid, p_level text)
returns table (
  skill_id text, source_id text, sheet_id text, question text, session_id uuid,
  score numeric, weight numeric, happened_at timestamptz, hint_level int, error_type text
)
language sql stable set search_path = '' as $$
  select c.skill_id, c.source_id, c.sheet_id, c.question, null::uuid, c.score, c.weight,
         c.happened_at, null::int, null::text
  from private.cke_learning_evidence(p_user, p_level) c
  union all
  select s.skill_id, i.variant_id, null::text, i.position::text, s.id, i.correct::int::numeric,
         case s.format when 'sokratejski' then 0.55 else 0.45 end / (1 + i.hint_level * 0.5),
         s.completed_at, i.hint_level, case when not i.correct then i.error_type end
  from private.learning_sessions s
  join private.learning_session_items i on (i.user_id, i.session_id) = (s.user_id, s.id)
  where s.user_id = p_user and s.level = p_level and s.completed_at is not null
    and i.answered_at is not null
$$;

-- Przejrzysty wynik to średnia ważona najświeższymi dowodami. Estymator Beta(1,1)
-- służy do sortowania sugestii. Liczbę pokazujemy od 3 dowodów i 1,2 ich łącznej wagi po zaniku.
create function private.learning_map(p_user uuid, p_level text)
returns table (
  skill_id text, area text, name text, description text, codes text[],
  exam_points numeric, evidence_count bigint, last_practiced_at timestamptz,
  last_mistake_at timestamptz, last_success_at timestamptz,
  score numeric, estimated numeric, confidence numeric,
  retention numeric, due_at timestamptz, formats text[]
)
language sql stable set search_path = '' as $$
  with unique_attempts as (
    -- Powtórka tego samego wariantu podmienia dowód w modelu, a pełna historia zostaje w rozbiorze.
    select distinct on (e.skill_id, e.source_id) e.*
    from private.learning_evidence(p_user, p_level) e
    order by e.skill_id, e.source_id, e.happened_at desc, e.session_id
  ), recent as (
    select e.*, row_number() over (
      partition by e.skill_id order by e.happened_at desc, e.source_id, e.session_id
    ) as n
    from unique_attempts e
  ), samples as (
    select e.*, power(0.5::numeric, greatest(0, extract(epoch from (now() - e.happened_at))) /
      (86400 * k.half_life_days)) as freshness
    from recent e
    join private.learning_skills k on k.id = e.skill_id
    where e.n <= 40
  ), stats as (
    select a.skill_id, count(*) as n, max(a.happened_at) as latest,
      max(a.happened_at) filter (where a.score < 1) as mistake,
      sum(a.score * a.weight * a.freshness) as got,
      sum(a.weight * a.freshness) as effective
    from samples a
    group by a.skill_id
  ), passed as (
    select s.skill_id, max(s.completed_at) as latest
    from private.learning_sessions s
    where s.user_id = p_user and s.level = p_level and s.completed_at is not null
      and (s.result->'wynik'->>'poprawne')::numeric >= 0.75 * (s.result->'wynik'->>'wszystkich')::numeric
    group by s.skill_id
  )
  select k.id, k.area, k.name, k.description, k.codes, coalesce(w.points, 0), coalesce(a.n, 0),
    a.latest, a.mistake, p.latest,
    case when a.n >= 3 and a.effective >= 1.2 then round(a.got / a.effective, 3) end,
    round((1 + coalesce(a.got, 0)) / (2 + coalesce(a.effective, 0)), 3),
    round(coalesce(a.effective, 0) / (2 + coalesce(a.effective, 0)), 3),
    case when a.latest is not null then
      round(power(0.5::numeric, greatest(0, extract(epoch from (now() - a.latest))) / (86400 * k.half_life_days)), 3)
    end,
    a.latest + k.half_life_days::double precision / 2 * interval '1 day',
    array(
      select f.format
      from (values ('szybka-runda', 5), ('napraw-blad', 3), ('sokratejski', 3)) f(format, minimum)
      where (select count(*) from private.learning_variants(k.id, p_level, f.format)) >= f.minimum
      order by f.format
    )
  from private.learning_skills k
  left join stats a on a.skill_id = k.id
  left join passed p on p.skill_id = k.id
  left join private.cke_learning_weights(p_level) w on w.skill_id = k.id
$$;

-- Odczyt działa również na bazie sprzed migracji dodającej profiles.learning.
create function private.learning_profile(p_user uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce((select to_jsonb(p)->'learning' from public.profiles p where p.id = p_user), '{}'::jsonb)
$$;

create function private.learning_priority(p_learning jsonb, p_skill text, p_name text) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1
    from jsonb_array_elements(case when jsonb_typeof(p_learning->'priorytety') = 'array'
      then p_learning->'priorytety' else '[]'::jsonb end) p(item)
    where lower(p.item->>'tekst') ~ case
      when p_skill like 'sluchanie-%' then 'słuch|sluch|listening'
      when p_skill like 'czytanie-%' then 'czyt|reading'
      when p_skill = 'pisanie' then 'pisan|wypracowan|writing|essay'
      when p_skill = 'srodki-jezykowe' then 'gramaty|słown|slown|vocab|grammar'
      else '$^'
    end or strpos(lower(p.item->>'tekst'), lower(p_name)) > 0
  )
$$;

create function private.learning_recommendation(p_user uuid, p_level text, p_skill text default null)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'skill_id', m.skill_id,
    'format', case when m.last_mistake_at >= coalesce(m.last_success_at, '-infinity')
      and 'napraw-blad' = any(m.formats) then 'napraw-blad' else 'szybka-runda' end,
    'minutes', 5,
    'reason', case
      when m.last_mistake_at >= coalesce(m.last_success_at, '-infinity') then 'Wróć do ostatniego błędu.'
      when m.due_at <= now() then 'Od ostatniej próby minęło dość czasu na powtórkę.'
      when private.learning_priority(private.learning_profile(p_user), m.skill_id, m.name) then 'Ta umiejętność pasuje do Twoich priorytetów.'
      when m.score is null then 'Krótka runda pokaże, co już umiesz.'
      else 'Poćwicz umiejętność, która wymaga jeszcze pracy.' end
  )
  from private.learning_map(p_user, p_level) m
  where (p_skill is null or m.skill_id = p_skill) and 'szybka-runda' = any(m.formats)
  order by
    (1 + ln(1 + m.exam_points)) *
    (1 - m.estimated + coalesce(1 - m.retention, 0) +
      case when private.learning_priority(private.learning_profile(p_user), m.skill_id, m.name) then 0.35 else 0 end +
      case when m.last_mistake_at >= coalesce(m.last_success_at, '-infinity') then 0.3 else 0 end) desc,
    m.skill_id
  limit 1
$$;

create function private.learning_session_response(p_user uuid, p_session uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id, 'skill_id', s.skill_id, 'level', s.level, 'format', s.format, 'streak', s.streak,
    'created_at', s.created_at, 'updated_at', s.updated_at, 'completed_at', s.completed_at,
    'limit', s.target, 'result', s.result,
    'answers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', i.position, 'prompt', i.prompt, 'answer', i.answer, 'correct', i.correct,
        'solutions', i.accepted, 'explanation', i.explanation,
        'error_type', case when not i.correct then i.error_type end, 'hint_level', i.hint_level
      ) order by i.position)
      from private.learning_session_items i
      where (i.user_id, i.session_id) = (s.user_id, s.id) and i.answered_at is not null
    ), '[]'::jsonb),
    'question', (
      select jsonb_build_object(
        'position', i.position, 'prompt', i.prompt, 'hint_level', i.hint_level,
        'hints', to_jsonb(i.hints[1:i.hint_level]), 'hint_count', case when s.format = 'sokratejski' then 0 else cardinality(i.hints) end
      )
      from private.learning_session_items i
      where (i.user_id, i.session_id) = (s.user_id, s.id) and i.answered_at is null and s.completed_at is null
      order by i.position limit 1
    )
  )
  from private.learning_sessions s
  where (s.user_id, s.id) = (p_user, p_session)
$$;

create function public.nauka_sesja(p_session uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select private.learning_session_response(private.learning_user(), p_session)
$$;

create function public.nauka_ostatnie(p_level text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
begin
  return coalesce((
    select jsonb_agg(to_jsonb(s) - 'user_id' - 'result' order by s.updated_at desc)
    from (
      select * from private.learning_sessions
      where user_id = u and level = l and completed_at is null
      order by updated_at desc, id limit 10
    ) s
  ), '[]'::jsonb);
end;
$$;

create function public.nauka_start(p_session uuid, p_skill text, p_format text, p_level text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
  s private.learning_sessions%rowtype;
  warianty int;
  cel int := case when p_format = 'szybka-runda' then 6 else 3 end;
begin
  if p_session is null or not exists (select 1 from private.learning_skills where id = p_skill)
    or p_format is null or p_format not in ('szybka-runda', 'napraw-blad', 'sokratejski') then
    raise sqlstate 'PT400' using message = 'invalid_session';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('learning:' || u::text, 0));
  select * into s from private.learning_sessions where (user_id, id) = (u, p_session);
  if found then
    if (s.skill_id, s.format, s.level) is distinct from (p_skill, p_format, l) then
      raise sqlstate 'PT409' using message = 'session_id_in_use';
    end if;
    return private.learning_session_response(u, p_session);
  end if;
  if (select count(*) from private.learning_sessions where user_id = u and completed_at is null) >= 10 then
    raise sqlstate 'PT409' using message = 'too_many_open_sessions';
  end if;

  insert into private.learning_sessions (user_id, id, skill_id, level, format, target)
  values (u, p_session, p_skill, l, p_format, cel);

  insert into private.learning_session_items (user_id, session_id, position, variant_id, prompt, accepted, explanation, hints, error_type)
  select u, p_session, row_number() over (order by v.last_seen nulls first, v.shuffle, v.id),
    v.id, v.prompt, v.answers, v.explanation, coalesce(v.hints, '{}'), v.error_type
  from (
    select v.*, random() as shuffle, (
      select max(i.answered_at)
      from private.learning_sessions previous
      join private.learning_session_items i on (i.user_id, i.session_id) = (previous.user_id, previous.id)
      where previous.user_id = u and previous.level = l and previous.skill_id = p_skill and i.variant_id = v.id
    ) as last_seen
    from private.learning_variants(p_skill, l, p_format) v
    order by last_seen nulls first, shuffle, v.id
    limit case when p_format = 'szybka-runda' then 8 else cel end
  ) v;

  get diagnostics warianty = row_count;
  if warianty < (case when p_format = 'szybka-runda' then 5 else cel end) then
    raise sqlstate 'PT422' using message = 'no_exercises_for_format';
  end if;
  if warianty < cel then
    update private.learning_sessions set target = warianty where (user_id, id) = (u, p_session);
  end if;

  return private.learning_session_response(u, p_session);
end;
$$;

create function public.nauka_podpowiedz(p_session uuid, p_position int, p_step int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  s private.learning_sessions%rowtype;
  i private.learning_session_items%rowtype;
begin
  select * into s from private.learning_sessions where (user_id, id) = (u, p_session) for update;
  if not found then
    raise sqlstate 'PT404' using message = 'session_not_found';
  end if;
  select * into i from private.learning_session_items
    where (user_id, session_id) = (u, p_session) and answered_at is null order by position limit 1;
  if s.completed_at is not null or i.position is distinct from p_position or i.position is null then
    raise sqlstate 'PT409' using message = 'question_changed';
  end if;
  if p_step is null or p_step < 1 or p_step > least(i.hint_level + 1, cardinality(i.hints))
    or s.format = 'sokratejski' then
    raise sqlstate 'PT400' using message = 'invalid_hint_step';
  end if;
  if p_step > i.hint_level then
    update private.learning_session_items set hint_level = p_step
      where (user_id, session_id, position) = (u, p_session, p_position);
    update private.learning_sessions set updated_at = now() where (user_id, id) = (u, p_session);
  end if;
  return private.learning_session_response(u, p_session);
end;
$$;

create function private.learning_normalize(p_value text) returns text
language sql immutable strict set search_path = '' as $$
  select lower(btrim(regexp_replace(translate(p_value, '’‘', ''''''), '[[:space:]]+', ' ', 'g')))
$$;

create function public.nauka_odpowiedz(p_session uuid, p_position int, p_answer text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  s private.learning_sessions%rowtype;
  i private.learning_session_items%rowtype;
  good boolean;
  series int;
  cel int;
  zdobyte int;
  before_score numeric;
  after_score numeric;
begin
  if p_answer is null or length(p_answer) > 1000 or p_position is null or p_position not between 1 and 8 then
    raise sqlstate 'PT400' using message = 'invalid_answer';
  end if;

  -- Sesje jednego konta mogą kończyć się jednocześnie. Migawka opanowania obejmuje zapisane wyniki.
  perform pg_advisory_xact_lock(hashtextextended('learning:' || u::text, 0));
  select * into s from private.learning_sessions where (user_id, id) = (u, p_session) for update;
  if not found then
    raise sqlstate 'PT404' using message = 'session_not_found';
  end if;

  select * into i from private.learning_session_items
    where (user_id, session_id, position) = (u, p_session, p_position);
  if i.answered_at is not null and i.answer = p_answer then
    return private.learning_session_response(u, p_session);
  end if;
  if not found or s.completed_at is not null or i.answered_at is not null or exists (
    select 1 from private.learning_session_items
    where (user_id, session_id) = (u, p_session) and position < p_position and answered_at is null
  ) then
    raise sqlstate 'PT409' using message = 'question_changed';
  end if;

  good := exists (select 1 from unnest(i.accepted) as a(value)
                 where private.learning_normalize(a.value) = private.learning_normalize(p_answer));
  series := case when good then s.streak + 1 else 0 end;
  cel := s.target;
  if s.format = 'szybka-runda' then
    if not good then
      cel := least(cel + 1, (select count(*) from private.learning_session_items
                          where (user_id, session_id) = (u, p_session)));
    elsif series >= 4 then
      cel := least(cel, greatest(5, p_position));
    end if;
  end if;

  update private.learning_session_items set answer = p_answer, correct = good, answered_at = clock_timestamp()
    where (user_id, session_id, position) = (u, p_session, p_position);
  update private.learning_sessions set updated_at = clock_timestamp(), target = cel, streak = series
    where (user_id, id) = (u, p_session);

  if p_position = cel then
    select m.score into before_score from private.learning_map(u, s.level) m where m.skill_id = s.skill_id;
    select count(*) into zdobyte from private.learning_session_items
      where (user_id, session_id) = (u, p_session) and correct;
    update private.learning_sessions set completed_at = updated_at,
      result = jsonb_build_object('wynik', jsonb_build_object('poprawne', zdobyte, 'wszystkich', cel))
      where (user_id, id) = (u, p_session);

    select m.score into after_score from private.learning_map(u, s.level) m where m.skill_id = s.skill_id;
    update private.learning_sessions set result = result || jsonb_build_object(
      'opanowanie_przed', before_score, 'opanowanie_po', after_score,
      'nastepny_krok', private.learning_recommendation(u, s.level)
    ) where (user_id, id) = (u, p_session);
  end if;
  return private.learning_session_response(u, p_session);
end;
$$;

create function public.nauka_usun(p_session uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
begin
  perform pg_advisory_xact_lock(hashtextextended('learning:' || u::text, 0));
  delete from private.learning_sessions where (user_id, id) = (u, p_session);
  return found;
end;
$$;

revoke all on function
  public.nauka_start(uuid, text, text, text), public.nauka_sesja(uuid), public.nauka_ostatnie(text),
  public.nauka_podpowiedz(uuid, int, int), public.nauka_odpowiedz(uuid, int, text), public.nauka_usun(uuid)
  from public, anon;
grant execute on function
  public.nauka_start(uuid, text, text, text), public.nauka_sesja(uuid), public.nauka_ostatnie(text),
  public.nauka_podpowiedz(uuid, int, int), public.nauka_odpowiedz(uuid, int, text), public.nauka_usun(uuid)
  to authenticated;

revoke all on function
  private.learning_user(), private.learning_level(uuid, text), private.learning_evidence(uuid, text),
  private.learning_map(uuid, text), private.learning_profile(uuid), private.learning_priority(jsonb, text, text),
  private.learning_recommendation(uuid, text, text), private.learning_session_response(uuid, uuid),
  private.learning_normalize(text)
  from public, anon, authenticated;
