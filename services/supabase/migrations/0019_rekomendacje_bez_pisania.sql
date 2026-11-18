-- 1. Wypracowanie (kod V) nie jest oceniane automatycznie, więc pisanie ma sufit opanowania
--    i nie może wygrywać rankingu. Wyłączamy z automatycznego wyboru umiejętności, których kody
--    to wyłącznie V. Wskazane wprost (p_skill) działają jak dotąd.
-- 2. Próg "mało danych" liczy pełną wagę dowodów, żeby nie wracał po kilku dniach.
-- 3. Usunąć można tylko niedokończoną sesję.

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
    -- effective (z wiekiem) wpływa tylko na pewność. Próg danych i Elo liczą pełną wagę.
    select e.*, row_number() over (partition by e.skill_id order by e.n desc) as ordinal,
      e.weight * power(0.5::numeric, greatest(0, extract(epoch from (now() - e.happened_at))) /
        (86400 * k.half_life_days)) as effective
    from recent e
    join private.learning_skills k on k.id = e.skill_id
    where e.n <= 40
  ), stats as (
    select a.skill_id, count(*) as n, max(a.happened_at) as latest,
      sum(a.effective) as effective, sum(a.weight) as total
    from samples a
    group by a.skill_id
  ), elo (skill_id, ordinal, rating) as (
    select k.id, 0::bigint, 1000::numeric from private.learning_skills k
    union all
    select a.skill_id, a.ordinal, round(
      e.rating + 48 * a.weight * (a.score - 1 / (1 + power(10::numeric, (a.difficulty - e.rating) / 400))), 5)
    from elo e join samples a on a.skill_id = e.skill_id and a.ordinal = e.ordinal + 1
  ), mistakes as materialized (
    select m.skill_id, max(m.happened_at) as latest
    from private.learning_review_mistakes(p_user, p_level) m
    group by m.skill_id
  ), success as materialized (
    select * from private.learning_review_success(p_user, p_level)
  )
  select k.id, k.area, k.name, k.description, k.codes, coalesce(w.points, 0), coalesce(a.n, 0),
    a.latest, b.latest, p.happened_at,
    case when a.n >= 3 and a.total >= 1.2 then round(ocena.estimated * coalesce(zanik.retention, 1), 3) end,
    ocena.estimated,
    round(coalesce(a.effective, 0) / (2 + coalesce(a.effective, 0)), 3),
    round(zanik.retention, 3),
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
  cross join lateral (
    select case when a.latest is not null then
      power(0.5::numeric, greatest(0, extract(epoch from (now() - a.latest))) / (86400 * k.half_life_days))
    end as retention
  ) zanik
  left join mistakes b on b.skill_id = k.id
  left join success p on p.skill_id = k.id
  left join private.cke_learning_weights(p_level) w on w.skill_id = k.id
$$;

create or replace function private.learning_recommendation_from(p_user uuid, p_level text, p_skill text, p_map jsonb)
returns jsonb language sql stable set search_path = '' as $$
  with recommended as (
    select m.*
    from jsonb_to_recordset(p_map) as m(
      skill_id text, name text, codes text[], exam_points numeric, last_mistake_at timestamptz,
      score numeric, estimated numeric, retention numeric, due_at timestamptz, formats text[]
    )
    where (m.skill_id = p_skill or (p_skill is null and not m.codes <@ array['V']))
      and 'szybka-runda' = any(m.formats)
    order by
      (1 + ln(1 + m.exam_points)) *
      (1 - m.estimated * coalesce(m.retention, 1) +
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

create or replace function public.nauka_plan(p_level text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
  dzis date := (now() at time zone 'Europe/Warsaw')::date;
  profil jsonb := private.learning_profile(u);
  minuty int := case profil->>'czas' when '10' then 10 when '20' then 20 when '45' then 45 when 'wiecej' then 60 else 10 end;
  dni int[];
  plan jsonb;
  arkusze int;
  pokrycie numeric;
  prognoza numeric;
begin
  select weekdays into dni from private.learning_plan_days where (user_id, level) = (u, l);
  dni := coalesce(dni, array[1, 2, 3, 4, 5]);

  with mapa as (
    select * from private.learning_map(u, l)
    where 'szybka-runda' = any(formats) and not codes <@ array['V']
  ), ranking as (
    select m.*, row_number() over (order by
      ((1 + ln(1 + m.exam_points)) *
        (1 - m.estimated * coalesce(m.retention, 1) +
          case when private.learning_priority(profil, m.skill_id, m.name) then 0.35 else 0 end +
          case when m.due_at <= now() then 0.2 else 0 end)) desc, m.skill_id
    ) as n, count(*) over () as ile
    from mapa m
  ), terminy as (
    select d.data, s.slot, row_number() over (order by d.data, s.slot) as n
    from (select dzis + i as data from generate_series(0, 6) i) d
    cross join generate_series(1, least(3, minuty / 10)) s(slot)
    where extract(isodow from d.data)::int = any(dni)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', t.data, 'skill_id', r.skill_id, 'name', r.name,
    'minutes', 5,
    'format', case when r.last_mistake_at >= coalesce(r.last_success_at, '-infinity')
      and 'napraw-blad' = any(r.formats) then 'napraw-blad' else 'szybka-runda' end
  ) order by t.data, t.slot), '[]'::jsonb) into plan
  from terminy t
  join ranking r on r.n = 1 + (t.n - 1) % r.ile;

  -- Średnia z porównywalnych, obiektywnie ocenionych zadań CKE, ważona udziałem umiejętności.
  -- Krótkie rundy i samoocena pisania nie podnoszą prognozy.
  with aktualne as materialized (
    select e.sheet_id, e.skill_id, e.score, e.weight, true as answered
    from private.cke_learning_evidence(u, l) e
    join public.sheet_progress sp on (sp.user_id, sp.sheet_id) = (u, e.sheet_id)
    where e.happened_at >= now() - interval '180 days' and sp.data->'sprawdzony' = 'true'::jsonb
    union all
    select sp.sheet_id, m.skill_id, 0::numeric, m.points::numeric, false
    from public.sheet_progress sp
    join public.sheets s on s.id = sp.sheet_id
    join private.cke_learning_map m on m.sheet_id = sp.sheet_id and m.level = l and m.skill_id <> 'pisanie'
    where sp.user_id = u and sp.data->'sprawdzony' = 'true'::jsonb
      and private.cke_learning_date(sp.data #>> '{wynik,kiedy}', sp.updated_at) >= now() - interval '180 days'
      and jsonb_typeof(sp.data->'odpowiedzi') = 'object'
      and (
        not (sp.data->'odpowiedzi' ? m.question)
        or (jsonb_typeof(sp.data->'odpowiedzi'->m.question) = 'string'
            and sp.data->'odpowiedzi'->>m.question !~ '[^[:space:]]')
      )
  ), cale as (
    select a.sheet_id, sum(a.weight) as assessed, sum(a.weight) filter (where a.answered) as answered
    from aktualne a group by a.sheet_id
  ), dostepne as (
    select m.sheet_id, sum(m.points) as possible
    from private.cke_learning_map m where m.level = l and m.skill_id <> 'pisanie' group by m.sheet_id
  ), proby as materialized (
    select a.* from aktualne a join cale c on c.sheet_id = a.sheet_id
    join dostepne d on d.sheet_id = a.sheet_id
    where c.assessed >= 0.85 * d.possible and c.answered >= 0.35 * d.possible
  ), srednie as (
    select skill_id, sum(score * weight) / nullif(sum(weight), 0) as srednia
    from proby group by skill_id having count(*) >= 3 and count(distinct sheet_id) >= 2
  )
  select (select count(distinct sheet_id) from proby),
    round(sum(w.points) filter (where s.srednia is not null) / nullif(sum(w.points), 0), 3),
    round(sum(w.points * s.srednia) / nullif(sum(w.points) filter (where s.srednia is not null), 0), 3)
  into arkusze, pokrycie, prognoza
  from private.cke_learning_weights(l) w
  left join srednie s on s.skill_id = w.skill_id
  where w.skill_id <> 'pisanie';

  return jsonb_build_object(
    'subject', 'angielski', 'level', l, 'from', dzis, 'weekdays', dni,
    'available_minutes', minuty, 'goal', profil->'cele'->>'angielski', 'activities', plan,
    'forecast', jsonb_build_object(
      'score', case when arkusze >= 2 and pokrycie >= 0.6 then prognoza end,
      'coverage', coalesce(pokrycie, 0), 'sheet_count', arkusze, 'scope', 'zadania_obiektywnie_sprawdzalne'
    )
  );
end;
$$;

create or replace function public.nauka_usun(p_session uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
begin
  perform pg_advisory_xact_lock(hashtextextended('learning:' || u::text, 0));
  -- Ukończona runda jest dowodem w modelu, więc usunąć można tylko niedokończoną.
  delete from private.learning_sessions where (user_id, id) = (u, p_session) and completed_at is null;
  return found;
end;
$$;

notify pgrst, 'reload schema';
