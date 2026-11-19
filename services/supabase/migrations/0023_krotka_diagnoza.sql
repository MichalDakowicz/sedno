-- Krótka diagnoza na start: jedna sesja (format 'diagnoza') z 1–3 zadaniami z każdej z kilku
-- umiejętności. Odpowiedzi idą przez zwykłe nauka_odpowiedz i zasilają opanowanie jak rundy, z wagą
-- 0,9 za zadanie (dwa razy więcej niż w rundzie: to celowy sprawdzian bez podpowiedzi). Stan diagnozy
-- (trwa, gotowa, pominięta, podsumowanie obejrzane) jest w bazie, osobno dla każdego poziomu.
--
-- Sesja diagnozy nie ma jednej umiejętności: skill_id sesji jest pusty, a umiejętność ma każde zadanie.
-- Diagnoza nie rośnie po błędach, nie ma podpowiedzi, nie liczy się do limitu otwartych rund, nie ma
-- jej na liście „Ostatnio” i nie rozlicza wcześniejszych błędów jak dobra runda. Jej błędy trafiają
-- do Powtórek jak błędy z rund.
--
-- Przy okazji: koniec każdej sesji zapisuje dzienną migawkę opanowania (0022).

alter table private.learning_sessions alter column skill_id drop not null;
alter table private.learning_sessions drop constraint learning_sessions_format_check;
alter table private.learning_sessions add constraint learning_sessions_format_check
  check (format in ('szybka-runda', 'napraw-blad', 'sokratejski', 'diagnoza'));
alter table private.learning_sessions drop constraint learning_sessions_target_check;
alter table private.learning_sessions add constraint learning_sessions_target_check check (target between 1 and 24);
alter table private.learning_sessions add constraint learning_sessions_skill_check
  check ((format = 'diagnoza') = (skill_id is null));

alter table private.learning_session_items add column skill_id text references private.learning_skills (id);
alter table private.learning_session_items drop constraint learning_session_items_position_check;
alter table private.learning_session_items add constraint learning_session_items_position_check
  check (position between 1 and 24);

create table private.learning_diagnoses (
  user_id uuid not null references auth.users (id) on delete cascade,
  level text not null check (level in ('podstawowy', 'rozszerzony', 'dwujezyczny')),
  session_id uuid,
  started_at timestamptz,
  skipped_at timestamptz,
  seen_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, level)
);

alter table private.learning_diagnoses enable row level security;
revoke all on private.learning_diagnoses from public, anon, authenticated;

create or replace function private.learning_evidence(p_user uuid, p_level text)
returns table (
  skill_id text, source_id text, sheet_id text, question text, session_id uuid,
  score numeric, weight numeric, happened_at timestamptz, hint_level int, error_type text, difficulty numeric
)
language sql stable set search_path = '' as $$
  select c.skill_id, c.source_id, c.sheet_id, c.question, null::uuid, c.score, c.weight,
         c.happened_at, null::int, null::text, c.difficulty
  from private.cke_learning_evidence(p_user, p_level) c
  union all
  select coalesce(i.skill_id, s.skill_id), i.variant_id, null::text, i.position::text, s.id, i.correct::int::numeric,
         case s.format when 'sokratejski' then 0.55 when 'diagnoza' then 0.9 else 0.45 end / (1 + i.hint_level * 0.5),
         s.completed_at, i.hint_level, case when not i.correct then i.error_type end,
         case i.prompt->>'typ' when 'luka' then 1100 when 'napraw-blad' then 1050 else 950 end::numeric
  from private.learning_sessions s
  join private.learning_session_items i on (i.user_id, i.session_id) = (s.user_id, s.id)
  where s.user_id = p_user and s.level = p_level and s.completed_at is not null
    and i.answered_at is not null
$$;

create or replace function private.learning_review_success(p_user uuid, p_level text)
returns table (skill_id text, happened_at timestamptz)
language sql stable set search_path = '' as $$
  with arkusze as (
    select e.skill_id, max(e.happened_at) as happened_at
    from private.cke_learning_evidence(p_user, p_level) e
    join public.sheet_progress p on (p.user_id, p.sheet_id) = (p_user, e.sheet_id)
    where p.data->'sprawdzony' = 'true'::jsonb
    group by e.sheet_id, e.skill_id
    having count(*) >= 2 and sum(e.score * e.weight) >= 0.75 * (
      select sum(m.points) from private.cke_learning_map m
      where m.sheet_id = e.sheet_id and m.level = p_level and m.skill_id = e.skill_id
    )
  ), rundy as (
    -- Dobra runda rozlicza wcześniejsze błędy. Jej własne pomyłki trafiają do kolejki.
    -- Diagnoza ma 1–3 zadania na umiejętność, więc niczego nie rozlicza.
    select s.skill_id, min(i.answered_at) as happened_at
    from private.learning_sessions s
    join private.learning_session_items i on (i.user_id, i.session_id) = (s.user_id, s.id)
    where s.user_id = p_user and s.level = p_level and s.completed_at is not null and s.format <> 'diagnoza'
      and (s.result->'wynik'->>'poprawne')::numeric >= 0.75 * (s.result->'wynik'->>'wszystkich')::numeric
    group by s.id, s.skill_id
  )
  select r.skill_id, max(r.happened_at)
  from (select * from arkusze union all select * from rundy) r
  group by r.skill_id
$$;

create or replace function private.learning_review_mistakes(p_user uuid, p_level text)
returns table (
  skill_id text, source_id text, sheet_id text, question text, session_id uuid,
  happened_at timestamptz, error_type text
)
language sql stable set search_path = '' as $$
  with attempts as (
    select e.skill_id, e.source_id, e.sheet_id, e.question, null::uuid as session_id,
      e.happened_at, null::text as error_type, e.score = 1 as correct
    from private.cke_learning_evidence(p_user, p_level) e
    union all
    select coalesce(i.skill_id, s.skill_id), i.variant_id, null::text, i.position::text, s.id,
      i.answered_at, i.error_type, i.correct
    from private.learning_sessions s
    join private.learning_session_items i on (i.user_id, i.session_id) = (s.user_id, s.id)
    where s.user_id = p_user and s.level = p_level and i.answered_at is not null
  ), latest as (
    select distinct on (a.skill_id, a.source_id) a.*
    from attempts a
    order by a.skill_id, a.source_id, a.happened_at desc, a.correct desc, a.session_id
  )
  select e.skill_id, e.source_id, e.sheet_id, e.question, e.session_id, e.happened_at, e.error_type
  from latest e
  left join private.learning_review_success(p_user, p_level) s on s.skill_id = e.skill_id
  where not e.correct and e.happened_at >= coalesce(s.happened_at, '-infinity')
$$;

create or replace function private.learning_session_response(p_user uuid, p_session uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id, 'skill_id', s.skill_id, 'level', s.level, 'format', s.format, 'streak', s.streak,
    'created_at', s.created_at, 'updated_at', s.updated_at, 'completed_at', s.completed_at,
    'limit', s.target, 'result', s.result,
    'answers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', i.position, 'skill_id', coalesce(i.skill_id, s.skill_id), 'prompt', i.prompt,
        'answer', i.answer, 'correct', i.correct,
        'solutions', i.accepted, 'explanation', i.explanation,
        'error_type', case when not i.correct then i.error_type end, 'hint_level', i.hint_level
      ) order by i.position)
      from private.learning_session_items i
      where (i.user_id, i.session_id) = (s.user_id, s.id) and i.answered_at is not null
    ), '[]'::jsonb),
    'question', (
      select jsonb_build_object(
        'position', i.position, 'skill_id', coalesce(i.skill_id, s.skill_id), 'prompt', i.prompt,
        'hint_level', i.hint_level, 'hints', to_jsonb(i.hints[1:i.hint_level]),
        'hint_count', case when s.format in ('sokratejski', 'diagnoza') then 0 else cardinality(i.hints) end
      )
      from private.learning_session_items i
      where (i.user_id, i.session_id) = (s.user_id, s.id) and i.answered_at is null and s.completed_at is null
      order by i.position limit 1
    )
  )
  from private.learning_sessions s
  where (s.user_id, s.id) = (p_user, p_session)
$$;

create or replace function public.nauka_ostatnie(p_level text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
begin
  return coalesce((
    select jsonb_agg(to_jsonb(s) - 'user_id' - 'result' order by s.updated_at desc)
    from (
      select * from private.learning_sessions
      where user_id = u and level = l and completed_at is null and format <> 'diagnoza'
      order by updated_at desc, id limit 10
    ) s
  ), '[]'::jsonb);
end;
$$;

create or replace function public.nauka_podpowiedz(p_session uuid, p_position int, p_step int) returns jsonb
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
    or s.format in ('sokratejski', 'diagnoza') then
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

create or replace function public.nauka_odpowiedz(p_session uuid, p_position int, p_answer text) returns jsonb
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
  mapa jsonb;
begin
  if p_answer is null or length(p_answer) > 1000 or p_position is null or p_position not between 1 and 24 then
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
    if s.format <> 'diagnoza' then
      select case when m.score is not null then m.estimated end into before_score
        from private.learning_map(u, s.level) m where m.skill_id = s.skill_id;
    end if;
    select count(*) into zdobyte from private.learning_session_items
      where (user_id, session_id) = (u, p_session) and correct;
    update private.learning_sessions set completed_at = updated_at,
      result = jsonb_build_object('wynik', jsonb_build_object('poprawne', zdobyte, 'wszystkich', cel))
      where (user_id, id) = (u, p_session);

    select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) into mapa from private.learning_map(u, s.level) m;
    if s.format = 'diagnoza' then
      -- Wynik na umiejętność i ocena modelu po diagnozie (estimated działa już przy 1–2 próbach,
      -- score z mapy dopiero po trzech).
      update private.learning_sessions set result = result || jsonb_build_object(
        'umiejetnosci', (
          select jsonb_agg(jsonb_build_object(
            'skill_id', k.id, 'name', k.name, 'area', k.area,
            'poprawne', w.poprawne, 'wszystkich', w.wszystkich,
            'opanowanie', (x->>'estimated')::numeric, 'score', (x->>'score')::numeric
          ) order by w.pierwsza)
          from (
            select i2.skill_id, count(*) filter (where i2.correct) as poprawne, count(*) as wszystkich,
              min(i2.position) as pierwsza
            from private.learning_session_items i2
            where (i2.user_id, i2.session_id) = (u, p_session)
            group by i2.skill_id
          ) w
          join private.learning_skills k on k.id = w.skill_id
          left join jsonb_array_elements(mapa) x on x->>'skill_id' = w.skill_id
        ),
        'nastepny_krok', private.learning_recommendation_from(u, s.level, null, mapa)
      ) where (user_id, id) = (u, p_session);
    else
      select case when x->>'score' is not null then (x->>'estimated')::numeric end into after_score
        from jsonb_array_elements(mapa) x where x->>'skill_id' = s.skill_id;
      update private.learning_sessions set result = result || jsonb_build_object(
        'opanowanie_przed', before_score, 'opanowanie_po', after_score,
        'nastepny_krok', private.learning_recommendation_from(u, s.level, null, mapa)
      ) where (user_id, id) = (u, p_session);
    end if;
    perform private.learning_snapshot(u, s.level, mapa);
  end if;
  return private.learning_session_response(u, p_session);
end;
$$;

create function private.learning_diagnosis_state(p_user uuid, p_level text) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'level', p_level,
    'status', case
      when s.completed_at is not null then 'gotowa'
      when s.id is not null then 'trwa'
      when d.skipped_at is not null then 'pominieta'
      else 'brak' end,
    'started_at', d.started_at, 'skipped_at', d.skipped_at, 'seen_at', d.seen_at,
    'session', case when s.id is not null then private.learning_session_response(p_user, s.id) end
  )
  from (select 1) x
  left join private.learning_diagnoses d on (d.user_id, d.level) = (p_user, p_level)
  left join private.learning_sessions s on (s.user_id, s.id) = (p_user, d.session_id)
$$;

create function public.nauka_diagnoza(p_level text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
begin
  return private.learning_diagnosis_state(u, private.learning_level(u, p_level));
end;
$$;

-- p_skills null: wszystkie umiejętności oceniane automatycznie (bez samego pisania), które mają dość
-- zadań do szybkiej rundy. Kolejność zadań: obszar, umiejętność; w umiejętności najpierw niewidziane,
-- CKE przed własnymi, reszta losowo.
create function public.nauka_diagnoza_start(
  p_session uuid, p_level text default null, p_per_skill int default 2, p_skills text[] default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
  s private.learning_sessions%rowtype;
  d private.learning_diagnoses%rowtype;
  umiejetnosci text[];
  zadania int;
begin
  if p_session is null or p_per_skill is null or p_per_skill not between 1 and 3
    or (p_skills is not null and (cardinality(p_skills) not between 1 and 8
      or cardinality(p_skills) <> (select count(distinct v) from unnest(p_skills) v)
      or exists (select 1 from unnest(p_skills) v where not exists (select 1 from private.learning_skills k where k.id = v)))) then
    raise sqlstate 'PT400' using message = 'invalid_session';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('learning:' || u::text, 0));
  select * into s from private.learning_sessions where (user_id, id) = (u, p_session);
  if found then
    if s.format <> 'diagnoza' or s.level <> l then
      raise sqlstate 'PT409' using message = 'session_id_in_use';
    end if;
    return private.learning_diagnosis_state(u, l);
  end if;
  select * into d from private.learning_diagnoses where (user_id, level) = (u, l);
  if exists (select 1 from private.learning_sessions
             where (user_id, id) = (u, d.session_id) and completed_at is null) then
    raise sqlstate 'PT409' using message = 'diagnosis_in_progress';
  end if;

  select array_agg(k.id order by k.area, k.id) into umiejetnosci
  from private.learning_skills k
  where (p_skills is null and not k.codes <@ array['V']) or k.id = any(p_skills);

  insert into private.learning_sessions (user_id, id, skill_id, level, format, target)
  values (u, p_session, null, l, 'diagnoza', 1);

  insert into private.learning_session_items
    (user_id, session_id, position, variant_id, skill_id, prompt, accepted, explanation, hints, error_type)
  select u, p_session, row_number() over (order by w.area, w.skill_id, w.rank),
    w.id, w.skill_id, w.prompt, w.answers, w.explanation, coalesce(w.hints, '{}'), w.error_type
  from (
    select k.id as skill_id, k.area, v.*, row_number() over (partition by k.id order by
        exists (
          select 1 from private.learning_session_items i
          join private.learning_sessions p on (p.user_id, p.id) = (i.user_id, i.session_id)
          where i.user_id = u and p.level = l and i.variant_id = v.id
        ),
        v.prompt->>'typ' is distinct from 'cke', random(), v.id
      ) as rank
    from private.learning_skills k
    cross join lateral private.learning_variants(k.id, l, 'szybka-runda') v
    where k.id = any(umiejetnosci)
  ) w
  where w.rank <= p_per_skill;

  get diagnostics zadania = row_count;
  if zadania = 0 then
    raise sqlstate 'PT422' using message = 'no_exercises_for_format';
  end if;
  update private.learning_sessions set target = zadania where (user_id, id) = (u, p_session);

  insert into private.learning_diagnoses (user_id, level, session_id, started_at)
  values (u, l, p_session, now())
  on conflict (user_id, level) do update
    set session_id = excluded.session_id, started_at = excluded.started_at,
        skipped_at = null, seen_at = null, updated_at = now();

  return private.learning_diagnosis_state(u, l);
end;
$$;

-- 'pominieta': uczeń pominął diagnozę; 'obejrzana': widział podsumowanie; 'od-nowa': usuwa
-- niedokończoną sesję diagnozy i czyści stan (ukończona zostaje jako dowód w modelu).
create function public.nauka_diagnoza_oznacz(p_status text, p_level text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
  sesja uuid;
begin
  if p_status is null or p_status not in ('pominieta', 'obejrzana', 'od-nowa') then
    raise sqlstate 'PT400' using message = 'invalid_status';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('learning:' || u::text, 0));
  insert into private.learning_diagnoses (user_id, level) values (u, l) on conflict do nothing;
  select session_id into sesja from private.learning_diagnoses where (user_id, level) = (u, l) for update;
  if p_status = 'pominieta' then
    -- Pominięcie w trakcie porzuca niedokończoną sesję, żeby stan był jednoznaczny.
    delete from private.learning_sessions where (user_id, id) = (u, sesja) and completed_at is null;
    update private.learning_diagnoses set skipped_at = now(), updated_at = now(),
      session_id = case when exists (select 1 from private.learning_sessions where (user_id, id) = (u, sesja)) then sesja end
      where (user_id, level) = (u, l);
  elsif p_status = 'obejrzana' then
    update private.learning_diagnoses set seen_at = now(), updated_at = now() where (user_id, level) = (u, l);
  else
    delete from private.learning_sessions where (user_id, id) = (u, sesja) and completed_at is null;
    update private.learning_diagnoses
      set session_id = null, started_at = null, skipped_at = null, seen_at = null, updated_at = now()
      where (user_id, level) = (u, l);
  end if;
  return private.learning_diagnosis_state(u, l);
end;
$$;

revoke all on function private.learning_diagnosis_state(uuid, text) from public, anon, authenticated;
revoke all on function public.nauka_diagnoza(text), public.nauka_diagnoza_start(uuid, text, int, text[]),
  public.nauka_diagnoza_oznacz(text, text) from public, anon;
grant execute on function public.nauka_diagnoza(text), public.nauka_diagnoza_start(uuid, text, int, text[]),
  public.nauka_diagnoza_oznacz(text, text) to authenticated;

notify pgrst, 'reload schema';
