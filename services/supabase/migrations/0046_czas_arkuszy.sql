-- Minuty nauki liczyły tylko odpowiedzi w rundach, więc tydzień z samymi arkuszami pokazywał kilka minut.
-- Teraz dochodzi czas nad zadaniami arkusza (sheet_progress.data.czasZadan, ms na zadanie), dopisywany
-- przy każdym zapisie jako przyrost względem poprzedniego zapisu. Wcześniejszych dni nie da się odtworzyć.
alter table private.learning_activity_days add column sheet_seconds int not null default 0;

create function private.suma_czasu(dane jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select coalesce(sum(case when jsonb_typeof(v) = 'number' then (v #>> '{}')::numeric else 0 end), 0)
  from jsonb_each(case when jsonb_typeof(dane->'czasZadan') = 'object' then dane->'czasZadan' else '{}'::jsonb end) as e(k, v)
$$;

create or replace function private.log_sheet_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  poziom text;
  przyrost int;
begin
  -- Przyrost czasu nad zadaniami (czasZadan, ms) od poprzedniego zapisu; pojedynczy zapis najwyżej godzina.
  przyrost := least(3600, greatest(0, round((private.suma_czasu(new.data) - case when tg_op = 'UPDATE' then private.suma_czasu(old.data) else 0 end) / 1000)))::int;
  insert into private.learning_activity_days as a (user_id, day, sheet_saves, sheet_seconds)
  values (new.user_id, private.learning_day(now()), 1, przyrost)
  on conflict (user_id, day) do update set sheet_saves = a.sheet_saves + 1, sheet_seconds = a.sheet_seconds + excluded.sheet_seconds;

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


create or replace function public.nauka_aktywnosc(p_days int default 28) returns jsonb
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
      coalesce(o.sekundy, 0) + coalesce(a.sheet_seconds, 0) as sekundy, coalesce(r.ile, 0) as rundy, coalesce(a.sheet_saves, 0) as arkusze
    from (
      select day, count(*) as zadania, count(*) filter (where correct) as poprawne, sum(sekundy) as sekundy
      from odpowiedzi group by day
    ) o
    full join rundy r on r.day = o.day
    full join (select day, sheet_saves, sheet_seconds from private.learning_activity_days where user_id = u and sheet_saves > 0) a
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

revoke all on function private.suma_czasu(jsonb), private.log_sheet_activity() from public, anon, authenticated;
revoke all on function public.nauka_aktywnosc(int) from public, anon;
grant execute on function public.nauka_aktywnosc(int) to authenticated;

notify pgrst, 'reload schema';
