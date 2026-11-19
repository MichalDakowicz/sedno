-- Historia do wykresów: dzienne migawki opanowania, dni z arkuszami i odczyty aktywności.
-- Dni liczymy w strefie Europe/Warsaw. Tabele są prywatne (RLS bez polityk, bez uprawnień),
-- a odczyt idzie przez RPC, które zawsze filtrują po auth.uid().

create function private.learning_day(p_at timestamptz) returns date
language sql immutable set search_path = '' as $$
  select (p_at at time zone 'Europe/Warsaw')::date
$$;

-- Jeden wiersz na umiejętność i dzień: ostatni stan z tego dnia. estimated to ocena modelu bez zaniku
-- (jak w rozbiorze), score to wartość z mapy (z zanikiem, null przy zbyt małej liczbie prób).
create table private.learning_mastery_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  level text not null check (level in ('podstawowy', 'rozszerzony', 'dwujezyczny')),
  skill_id text not null references private.learning_skills (id),
  day date not null,
  estimated numeric not null check (estimated between 0 and 1),
  score numeric check (score between 0 and 1),
  evidence_count int,
  updated_at timestamptz not null default now(),
  primary key (user_id, level, skill_id, day)
);

-- Dni, w których uczeń zapisywał postęp w arkuszu. sheet_progress trzyma tylko ostatnią zmianę,
-- więc bez tego dziennika arkusz rozwiązywany przez kilka dni zostawiłby ślad tylko z ostatniego.
create table private.learning_activity_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  sheet_saves int not null default 0,
  primary key (user_id, day)
);

alter table private.learning_mastery_daily enable row level security;
alter table private.learning_activity_days enable row level security;
revoke all on private.learning_mastery_daily, private.learning_activity_days from public, anon, authenticated;

-- Migawka z gotowej mapy (jsonb z wierszy learning_map). Zapisuje tylko umiejętności z próbami.
create function private.learning_snapshot(p_user uuid, p_level text, p_map jsonb) returns void
language sql volatile set search_path = '' as $$
  insert into private.learning_mastery_daily as d (user_id, level, skill_id, day, estimated, score, evidence_count, updated_at)
  select p_user, p_level, m.skill_id, private.learning_day(now()), m.estimated, m.score, m.evidence_count, now()
  from jsonb_to_recordset(p_map) as m(skill_id text, estimated numeric, score numeric, evidence_count int)
  where m.evidence_count > 0 and m.estimated is not null
  on conflict (user_id, level, skill_id, day) do update
    set estimated = excluded.estimated, score = excluded.score,
        evidence_count = excluded.evidence_count, updated_at = excluded.updated_at
$$;

-- Zapis arkusza: dzień aktywności zawsze, a migawka opanowania tylko przy sprawdzeniu (wtedy zmienia
-- się ocena). Błąd liczenia mapy nie może zablokować zapisu postępu.
create function private.log_sheet_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  poziom text;
begin
  insert into private.learning_activity_days as a (user_id, day, sheet_saves)
  values (new.user_id, private.learning_day(now()), 1)
  on conflict (user_id, day) do update set sheet_saves = a.sheet_saves + 1;

  if tg_op = 'INSERT' or new.data->'sprawdzony' is distinct from old.data->'sprawdzony'
    or new.data->'sprawdzoneZadania' is distinct from old.data->'sprawdzoneZadania' then
    select m.level into poziom from private.cke_learning_map m where m.sheet_id = new.sheet_id limit 1;
    if poziom is not null then
      begin
        perform private.learning_snapshot(new.user_id, poziom,
          (select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) from private.learning_map(new.user_id, poziom) m));
      exception when others then
        null;
      end;
    end if;
  end if;
  return null;
end;
$$;

create trigger log_activity after insert or update on public.sheet_progress
  for each row execute function private.log_sheet_activity();

-- Dotychczasowa historia: wynik "po" z ukończonych rund (ostatnia runda dnia) i dni ostatnich zmian arkuszy.
insert into private.learning_mastery_daily (user_id, level, skill_id, day, estimated, score, updated_at)
select distinct on (s.user_id, s.level, s.skill_id, private.learning_day(s.completed_at))
  s.user_id, s.level, s.skill_id, private.learning_day(s.completed_at),
  (s.result->>'opanowanie_po')::numeric, (s.result->>'opanowanie_po')::numeric, s.completed_at
from private.learning_sessions s
where s.completed_at is not null and jsonb_typeof(s.result->'opanowanie_po') = 'number'
order by s.user_id, s.level, s.skill_id, private.learning_day(s.completed_at), s.completed_at desc;

insert into private.learning_activity_days (user_id, day, sheet_saves)
select p.user_id, private.learning_day(p.updated_at), count(*)
from public.sheet_progress p
group by 1, 2;

-- Opanowanie w czasie. Zapisuje też dzisiejszą migawkę z bieżącej mapy, żeby wykres kończył się
-- na stanie, który uczeń widzi na mapie.
create function public.nauka_historia(p_level text default null, p_days int default 90) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
  dni int := least(366, greatest(1, coalesce(p_days, 90)));
  dzis date := private.learning_day(now());
begin
  perform private.learning_snapshot(u, l,
    (select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) from private.learning_map(u, l) m));
  return jsonb_build_object(
    'level', l, 'from', dzis - (dni - 1), 'to', dzis,
    'skills', coalesce((
      select jsonb_agg(jsonb_build_object(
        'skill_id', k.id, 'name', k.name, 'area', k.area,
        'points', (
          select jsonb_agg(jsonb_build_object(
            'day', d.day, 'score', d.score, 'estimated', d.estimated, 'evidence_count', d.evidence_count
          ) order by d.day)
          from private.learning_mastery_daily d
          where (d.user_id, d.level, d.skill_id) = (u, l, k.id) and d.day > dzis - dni
        )
      ) order by k.area, k.id)
      from private.learning_skills k
      where exists (
        select 1 from private.learning_mastery_daily d
        where (d.user_id, d.level, d.skill_id) = (u, l, k.id) and d.day > dzis - dni
      )
    ), '[]'::jsonb)
  );
end;
$$;

-- Aktywność dzienna ze wszystkich poziomów: zadania z rund (i diagnozy), minuty z odstępów między
-- odpowiedziami (pojedyncza przerwa liczy się najwyżej 5 minut), ukończone rundy i dni z arkuszem.
-- Seria: kolejne dni z jakąkolwiek aktywnością, kończące się dziś albo wczoraj.
create function public.nauka_aktywnosc(p_days int default 28) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  dni int := least(366, greatest(1, coalesce(p_days, 28)));
  dzis date := private.learning_day(now());
  wynik jsonb;
begin
  with odpowiedzi as materialized (
    select private.learning_day(i.answered_at) as day, i.correct,
      least(300, greatest(0, extract(epoch from i.answered_at - coalesce(
        lag(i.answered_at) over (partition by i.session_id order by i.position), s.created_at)))) as sekundy
    from private.learning_sessions s
    join private.learning_session_items i on (i.user_id, i.session_id) = (s.user_id, s.id)
    where s.user_id = u and i.answered_at is not null
  ), rundy as (
    select private.learning_day(s.completed_at) as day, count(*) as ile
    from private.learning_sessions s
    where s.user_id = u and s.completed_at is not null
    group by 1
  ), dzienne as materialized (
    select coalesce(o.day, r.day, a.day) as day,
      coalesce(o.zadania, 0) as zadania, coalesce(o.poprawne, 0) as poprawne,
      coalesce(o.sekundy, 0) as sekundy, coalesce(r.ile, 0) as rundy, coalesce(a.sheet_saves, 0) as arkusze
    from (
      select day, count(*) as zadania, count(*) filter (where correct) as poprawne, sum(sekundy) as sekundy
      from odpowiedzi group by day
    ) o
    full join rundy r on r.day = o.day
    full join (select day, sheet_saves from private.learning_activity_days where user_id = u and sheet_saves > 0) a
      on a.day = coalesce(o.day, r.day)
  ), wyspy as (
    select day, day - (row_number() over (order by day))::int as grupa from dzienne
  ), serie as (
    select min(day) as od, max(day) as do_dnia, count(*) as dlugosc from wyspy group by grupa
  ), zakres as (
    select g::date as day from generate_series(dzis - (dni - 1), dzis, interval '1 day') g
  ), tygodnie as (
    select (date_trunc('week', g))::date as od from generate_series(dzis - 7 * 7, dzis, interval '1 week') g
  )
  select jsonb_build_object(
    'from', dzis - (dni - 1), 'to', dzis, 'timezone', 'Europe/Warsaw',
    'days', (
      select jsonb_agg(jsonb_build_object(
        'day', z.day, 'zadania', coalesce(d.zadania, 0), 'poprawne', coalesce(d.poprawne, 0),
        'minuty', round(coalesce(d.sekundy, 0) / 60, 1), 'rundy', coalesce(d.rundy, 0),
        'arkusze', coalesce(d.arkusze, 0), 'aktywny', d.day is not null
      ) order by z.day)
      from zakres z left join dzienne d on d.day = z.day
    ),
    'weeks', (
      select jsonb_agg(jsonb_build_object(
        'od', t.od,
        'minuty', round(coalesce((select sum(d.sekundy) from dzienne d where d.day between t.od and t.od + 6), 0) / 60, 1),
        'zadania', coalesce((select sum(d.zadania) from dzienne d where d.day between t.od and t.od + 6), 0),
        'dni_aktywne', (select count(*) from dzienne d where d.day between t.od and t.od + 6)
      ) order by t.od)
      from tygodnie t
    ),
    'streak', jsonb_build_object(
      'current', coalesce((select dlugosc from serie where do_dnia >= dzis - 1 order by do_dnia desc limit 1), 0),
      'longest', coalesce((select max(dlugosc) from serie), 0),
      'active_today', exists (select 1 from dzienne where day = dzis),
      'last_active', (select max(day) from dzienne)
    )
  ) into wynik;
  return wynik;
end;
$$;

revoke all on function private.learning_day(timestamptz), private.learning_snapshot(uuid, text, jsonb),
  private.log_sheet_activity() from public, anon, authenticated;
revoke all on function public.nauka_historia(text, int), public.nauka_aktywnosc(int) from public, anon;
grant execute on function public.nauka_historia(text, int), public.nauka_aktywnosc(int) to authenticated;

notify pgrst, 'reload schema';
