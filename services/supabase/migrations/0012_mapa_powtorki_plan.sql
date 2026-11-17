-- Odczyty dla Nauki, Mapy umiejętności, Powtórek i planu do matury.

create function public.nauka_katalog(p_level text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
begin
  return jsonb_build_object(
    'subject', 'angielski', 'level', l,
    'levels', array['podstawowy', 'rozszerzony', 'dwujezyczny'],
    'skills', (
      select jsonb_agg(jsonb_build_object(
        'id', k.id, 'area', k.area, 'name', k.name, 'description', k.description, 'codes', k.codes
      ) order by k.area, k.id)
      from private.learning_skills k
    )
  );
end;
$$;

create function public.nauka_mapa(p_level text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
begin
  return jsonb_build_object('subject', 'angielski', 'level', l, 'skills', (
    select jsonb_agg(to_jsonb(m) - 'estimated' - 'last_mistake_at' - 'last_success_at'
                     order by m.area, m.skill_id)
    from private.learning_map(u, l) m
  ));
end;
$$;

create function public.nauka_dowody(p_skill text, p_level text default null, p_limit int default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
begin
  if not exists (select 1 from private.learning_skills where id = p_skill) then
    raise sqlstate 'PT404' using message = 'skill_not_found';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(e) order by e.happened_at desc, e.source_id, e.session_id)
    from (
      select * from private.learning_evidence(u, l)
      where skill_id = p_skill
      order by happened_at desc, source_id, session_id
      limit least(100, greatest(1, coalesce(p_limit, 20)))
    ) e
  ), '[]'::jsonb);
end;
$$;

create function public.nauka_polec(p_level text default null, p_skill text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
begin
  return private.learning_recommendation(u, l, p_skill);
end;
$$;

create function public.nauka_powtorki(p_level text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
  kolejka jsonb;
begin
  with mapa as materialized (
    select * from private.learning_map(u, l)
    where 'szybka-runda' = any(formats)
  ), ostatnie_bledy as (
    select distinct on (e.skill_id) e.skill_id, e.session_id, e.sheet_id, e.question, e.error_type
    from private.learning_evidence(u, l) e
    join mapa m on m.skill_id = e.skill_id and e.happened_at = m.last_mistake_at
    where e.score < 1 and e.happened_at >= coalesce(m.last_success_at, '-infinity')
    order by e.skill_id, e.happened_at desc, e.source_id, e.session_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'skill_id', m.skill_id, 'name', m.name, 'due_at', m.due_at,
    'last_practiced_at', m.last_practiced_at, 'retention', m.retention,
    'format', case when b.skill_id is not null and 'napraw-blad' = any(m.formats)
      then 'napraw-blad' else 'szybka-runda' end,
    'mistake', to_jsonb(b) - 'skill_id'
  ) order by (1 + m.exam_points) * (1 - coalesce(m.retention, 1)) +
    case when b.skill_id is not null then 1 else 0 end desc, m.skill_id), '[]'::jsonb)
  into kolejka
  from mapa m left join ostatnie_bledy b on b.skill_id = m.skill_id
  where m.due_at <= now() or b.skill_id is not null;

  return jsonb_build_object('level', l, 'today', kolejka->0, 'queue', kolejka);
end;
$$;

create table private.learning_plan_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null check (level in ('podstawowy', 'rozszerzony', 'dwujezyczny')),
  weekdays int[] not null check (cardinality(weekdays) between 1 and 7),
  primary key (user_id, level)
);

alter table private.learning_plan_days enable row level security;

create function public.nauka_plan(p_level text default null) returns jsonb
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
    select * from private.learning_map(u, l) where 'szybka-runda' = any(formats)
  ), ranking as (
    select m.*, row_number() over (order by
      ((1 + ln(1 + m.exam_points)) *
        (1 - m.estimated + coalesce(1 - m.retention, 0) +
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

create function public.nauka_plan_dni(p_days int[], p_level text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
begin
  if p_days is null then
    delete from private.learning_plan_days where (user_id, level) = (u, l);
  else
    if cardinality(p_days) not between 1 and 7
      or exists (select 1 from unnest(p_days) as d(n) where n is null or n not between 1 and 7)
      or cardinality(p_days) <> (select count(distinct n) from unnest(p_days) as d(n)) then
      raise sqlstate 'PT400' using message = 'invalid_weekdays';
    end if;
    insert into private.learning_plan_days (user_id, level, weekdays)
      values (u, l, array(select n from unnest(p_days) as d(n) order by n))
      on conflict (user_id, level) do update set weekdays = excluded.weekdays;
  end if;
  return public.nauka_plan(l);
end;
$$;

revoke all on function
  public.nauka_katalog(text), public.nauka_mapa(text), public.nauka_dowody(text, text, int),
  public.nauka_polec(text, text), public.nauka_powtorki(text), public.nauka_plan(text), public.nauka_plan_dni(int[], text)
  from public, anon;
grant execute on function
  public.nauka_katalog(text), public.nauka_mapa(text), public.nauka_dowody(text, text, int),
  public.nauka_polec(text, text), public.nauka_powtorki(text), public.nauka_plan(text), public.nauka_plan_dni(int[], text)
  to authenticated;
