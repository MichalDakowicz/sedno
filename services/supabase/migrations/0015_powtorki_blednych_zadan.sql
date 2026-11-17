-- Powtórki śledzą najnowszy wynik konkretnego pytania niezależnie od Elo.
alter table private.learning_sessions add column repeat_item text;

create function private.learning_review_success(p_user uuid, p_level text)
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
    select s.skill_id, min(i.answered_at) as happened_at
    from private.learning_sessions s
    join private.learning_session_items i on (i.user_id, i.session_id) = (s.user_id, s.id)
    where s.user_id = p_user and s.level = p_level and s.completed_at is not null
      and (s.result->'wynik'->>'poprawne')::numeric >= 0.75 * (s.result->'wynik'->>'wszystkich')::numeric
    group by s.id, s.skill_id
  )
  select r.skill_id, max(r.happened_at)
  from (select * from arkusze union all select * from rundy) r
  group by r.skill_id
$$;

create function private.learning_review_mistakes(p_user uuid, p_level text)
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
    select s.skill_id, i.variant_id, null::text, i.position::text, s.id,
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

create function private.learning_review_variants(p_skill text, p_level text)
returns table (id text, prompt jsonb, answers text[], explanation text, hints text[], error_type text)
language sql stable set search_path = '' as $$
  select * from private.cke_round_variants(p_skill, p_level)
  union all
  select e.id, e.prompt, e.answers, e.explanation, e.hints, e.error_type
  from private.learning_exercises e
  where e.skill_id = p_skill and e.level = p_level
$$;

create function private.learning_review_queue_items(p_user uuid, p_level text)
returns table (
  skill_id text, source_id text, sheet_id text, question text, session_id uuid,
  happened_at timestamptz, error_type text, repeat_id text
)
language sql stable set search_path = '' as $$
  with mistakes as materialized (
    select * from private.learning_review_mistakes(p_user, p_level)
  ), repeatable as (
    select s.skill_id, v.id
    from (select distinct m.skill_id from mistakes m) s
    cross join lateral private.learning_review_variants(s.skill_id, p_level) v
  )
  select m.*, r.id
  from mistakes m left join repeatable r on (r.skill_id, r.id) = (m.skill_id, m.source_id)
$$;

revoke all on function
  private.learning_review_success(uuid, text), private.learning_review_mistakes(uuid, text),
  private.learning_review_variants(text, text), private.learning_review_queue_items(uuid, text)
  from public, anon, authenticated;


create or replace function private.learning_map(p_user uuid, p_level text)
returns table (
  skill_id text, area text, name text, description text, codes text[],
  exam_points numeric, evidence_count bigint, last_practiced_at timestamptz,
  last_mistake_at timestamptz, last_success_at timestamptz,
  score numeric, estimated numeric, confidence numeric,
  retention numeric, due_at timestamptz, formats text[]
)
language sql stable set search_path = '' as $$
  with recursive unique_attempts as (
    -- Powtórka tego samego wariantu podmienia dowód w modelu, a pełna historia zostaje w rozbiorze.
    select distinct on (e.skill_id, e.source_id) e.*
    from private.learning_evidence(p_user, p_level) e
    order by e.skill_id, e.source_id, e.happened_at desc, e.session_id
  ), recent as (
    select e.*, row_number() over (
      partition by e.skill_id order by e.happened_at desc, e.session_id,
        case when e.session_id is not null then e.question::int end desc, e.source_id
    ) as n
    from unique_attempts e
  ), samples as (
    select e.*, row_number() over (partition by e.skill_id order by e.n desc) as ordinal,
      e.weight * power(0.5::numeric, greatest(0, extract(epoch from (now() - e.happened_at))) /
        (86400 * k.half_life_days)) as effective
    from recent e
    join private.learning_skills k on k.id = e.skill_id
    where e.n <= 40
  ), stats as (
    select a.skill_id, count(*) as n, max(a.happened_at) as latest,
      sum(a.effective) as effective
    from samples a
    group by a.skill_id
  ), elo (skill_id, ordinal, rating) as (
    select k.id, 0::bigint, 1000::numeric from private.learning_skills k
    union all
    select a.skill_id, a.ordinal, round(
      e.rating + 48 * a.effective * (a.score - 1 / (1 + power(10::numeric, (a.difficulty - e.rating) / 400))), 5)
    from elo e join samples a on a.skill_id = e.skill_id and a.ordinal = e.ordinal + 1
  ), mistakes as (
    select m.skill_id, max(m.happened_at) as latest
    from private.learning_review_mistakes(p_user, p_level) m
    group by m.skill_id
  )
  select k.id, k.area, k.name, k.description, k.codes, coalesce(w.points, 0), coalesce(a.n, 0),
    a.latest, b.latest, p.happened_at,
    case when a.n >= 3 and a.effective >= 1.2 then ocena.estimated end,
    ocena.estimated,
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
  join elo e on e.skill_id = k.id and e.ordinal = coalesce(a.n, 0)
  cross join lateral (select round(1 / (1 + power(10::numeric, (1000 - e.rating) / 400)), 3) as estimated) ocena
  left join mistakes b on b.skill_id = k.id
  left join private.learning_review_success(p_user, p_level) p on p.skill_id = k.id
  left join private.cke_learning_weights(p_level) w on w.skill_id = k.id
$$;

-- Nowa sygnatura ma oba ostatnie argumenty domyślne. Dotychczasowe wywołania zachowują działanie.
drop function public.nauka_start(uuid, text, text, text);

create function public.nauka_start(p_session uuid, p_skill text, p_format text, p_level text default null, p_item text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
  s private.learning_sessions%rowtype;
  warianty int;
  cel int := case when p_format = 'szybka-runda' then 6 else 3 end;
begin
  if p_session is null or not exists (select 1 from private.learning_skills where id = p_skill)
    or p_format is null or p_format not in ('szybka-runda', 'napraw-blad', 'sokratejski')
    or (p_item is not null and (p_format <> 'szybka-runda' or length(p_item) not between 1 and 200)) then
    raise sqlstate 'PT400' using message = 'invalid_session';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('learning:' || u::text, 0));
  select * into s from private.learning_sessions where (user_id, id) = (u, p_session);
  if found then
    if (s.skill_id, s.format, s.level, s.repeat_item) is distinct from (p_skill, p_format, l, p_item) then
      raise sqlstate 'PT409' using message = 'session_id_in_use';
    end if;
    return private.learning_session_response(u, p_session);
  end if;
  if (select count(*) from private.learning_sessions where user_id = u and completed_at is null) >= 10 then
    raise sqlstate 'PT409' using message = 'too_many_open_sessions';
  end if;

  if p_item is not null and not exists (
    select 1 from private.learning_review_mistakes(u, l) m
    where m.skill_id = p_skill and m.source_id = p_item
  ) then
    raise sqlstate 'PT409' using message = 'review_item_unavailable';
  end if;

  insert into private.learning_sessions (user_id, id, skill_id, level, format, target, repeat_item)
  values (u, p_session, p_skill, l, p_format, cel, p_item);

  with available as materialized (
    select * from private.learning_variants(p_skill, l, p_format)
  ), candidates as (
    select * from available
    union all
    select v.* from private.learning_review_variants(p_skill, l) v
    where p_item is not null and v.id = p_item
      and not exists (select 1 from available a where a.id = p_item)
  )
  insert into private.learning_session_items (user_id, session_id, position, variant_id, prompt, accepted, explanation, hints, error_type)
  select u, p_session, row_number() over (order by v.unpinned, v.original_variant, v.last_seen nulls first, v.shuffle, v.id),
    v.id, v.prompt, v.answers, v.explanation, coalesce(v.hints, '{}'), v.error_type
  from (
    select v.*, random() as shuffle,
      v.id is distinct from p_item as unpinned, v.prompt->>'typ' is distinct from 'cke' as original_variant,
      greatest(
        (
          -- Pierwsze nieukończone zadanie było już zwrócone klientowi.
          select max(coalesce(i.answered_at, previous.updated_at))
          from private.learning_sessions previous
          join private.learning_session_items i on (i.user_id, i.session_id) = (previous.user_id, previous.id)
          where previous.user_id = u and previous.level = l and previous.skill_id = p_skill and i.variant_id = v.id
            and (i.answered_at is not null or (previous.completed_at is null and i.position = (
              select min(next.position)
              from private.learning_session_items next
              where (next.user_id, next.session_id) = (i.user_id, i.session_id) and next.answered_at is null
            )))
        ),
        (
          select p.updated_at
          from public.sheet_progress p
          where (p.user_id, p.sheet_id) = (u, v.prompt->>'sheet_id')
            and (nullif(btrim(p.data -> 'odpowiedzi' ->> (v.prompt->>'question')), '') is not null
              or p.data->'sprawdzony' = 'true'::jsonb
              or p.data->'sprawdzoneZadania' @> jsonb_build_array(v.prompt->'task_nr'))
        )
      ) as last_seen
    from candidates v
    order by unpinned, original_variant, last_seen nulls first, shuffle, v.id
    limit case when p_format = 'szybka-runda' then 8 else cel end
  ) v;

  get diagnostics warianty = row_count;
  if p_item is not null and not exists (
    select 1 from private.learning_session_items
    where (user_id, session_id, position, variant_id) = (u, p_session, 1, p_item)
  ) then
    raise sqlstate 'PT409' using message = 'review_item_unavailable';
  end if;
  if warianty < (case when p_format = 'szybka-runda' then 5 else cel end) then
    raise sqlstate 'PT422' using message = 'no_exercises_for_format';
  end if;
  if warianty < cel then
    update private.learning_sessions set target = warianty where (user_id, id) = (u, p_session);
  end if;

  return private.learning_session_response(u, p_session);
end;
$$;

revoke all on function public.nauka_start(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.nauka_start(uuid, text, text, text, text) to authenticated;

create or replace function public.nauka_powtorki(p_level text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
  kolejka jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'skill_id', m.skill_id, 'name', m.name, 'due_at', m.due_at,
    'last_practiced_at', m.last_practiced_at, 'retention', m.retention,
    'format', case when b.skill_id is not null and b.repeat_id is null and 'napraw-blad' = any(m.formats)
      then 'napraw-blad' else 'szybka-runda' end,
    'mistake', to_jsonb(b) - 'skill_id'
  ) order by (1 + m.exam_points) * (1 - coalesce(m.retention, 1)) +
    case when b.skill_id is not null then 1 else 0 end desc, m.skill_id, b.happened_at desc, b.source_id), '[]'::jsonb)
  into kolejka
  from private.learning_map(u, l) m
  left join private.learning_review_queue_items(u, l) b on b.skill_id = m.skill_id
  where 'szybka-runda' = any(m.formats)
    and (m.due_at <= now() or b.skill_id is not null);

  return jsonb_build_object('level', l, 'today', kolejka->0, 'queue', kolejka);
end;
$$;

create or replace function private.learning_recommendation(p_user uuid, p_level text, p_skill text default null)
returns jsonb language sql stable set search_path = '' as $$
  with recommended as (
    select m.*
    from private.learning_map(p_user, p_level) m
    where (p_skill is null or m.skill_id = p_skill) and 'szybka-runda' = any(m.formats)
    order by
      (1 + ln(1 + m.exam_points)) *
      (1 - m.estimated + coalesce(1 - m.retention, 0) +
        case when private.learning_priority(private.learning_profile(p_user), m.skill_id, m.name) then 0.35 else 0 end +
        case when m.last_mistake_at is not null then 0.3 else 0 end) desc,
      m.skill_id
    limit 1
  )
  select jsonb_build_object(
    'skill_id', m.skill_id,
    'format', case when b.repeat_id is null and m.last_mistake_at is not null
      and 'napraw-blad' = any(m.formats) then 'napraw-blad' else 'szybka-runda' end,
    'repeat_id', b.repeat_id,
    'minutes', 5,
    'reason', case
      when b.repeat_id is not null then 'Wróć do błędnego zadania.'
      when m.last_mistake_at is not null then 'Poćwicz umiejętność, w której pojawił się błąd.'
      when m.due_at <= now() then 'Od ostatniej próby minęło dość czasu na powtórkę.'
      when private.learning_priority(private.learning_profile(p_user), m.skill_id, m.name) then 'Ta umiejętność pasuje do Twoich priorytetów.'
      when m.score is null then 'Krótka runda pokaże, co już umiesz.'
      else 'Poćwicz umiejętność, która wymaga jeszcze pracy.' end
  )
  from recommended m
  left join lateral (
    select b.repeat_id
    from private.learning_review_queue_items(p_user, p_level) b
    where b.skill_id = m.skill_id and b.repeat_id is not null
    order by b.happened_at desc, b.source_id
    limit 1
  ) b on m.last_mistake_at is not null
$$;

notify pgrst, 'reload schema';
