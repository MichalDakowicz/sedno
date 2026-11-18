-- Rozbiór rundy porównuje ocenę modelu przed i po rundzie. Zanik (retencja) zostaje tylko w mapie,
-- inaczej "przed" byłoby zaniżone przerwą, a "po" nie. Reguła "mało danych" działa jak w mapie.
-- Plan porządkuje umiejętności tak samo jak rekomendacja.

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
    select case when m.score is not null then m.estimated end into before_score
      from private.learning_map(u, s.level) m where m.skill_id = s.skill_id;
    select count(*) into zdobyte from private.learning_session_items
      where (user_id, session_id) = (u, p_session) and correct;
    update private.learning_sessions set completed_at = updated_at,
      result = jsonb_build_object('wynik', jsonb_build_object('poprawne', zdobyte, 'wszystkich', cel))
      where (user_id, id) = (u, p_session);

    select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) into mapa from private.learning_map(u, s.level) m;
    select case when x->>'score' is not null then (x->>'estimated')::numeric end into after_score
      from jsonb_array_elements(mapa) x where x->>'skill_id' = s.skill_id;
    update private.learning_sessions set result = result || jsonb_build_object(
      'opanowanie_przed', before_score, 'opanowanie_po', after_score,
      'nastepny_krok', private.learning_recommendation_from(u, s.level, null, mapa)
    ) where (user_id, id) = (u, p_session);
  end if;
  return private.learning_session_response(u, p_session);
end;
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
    select * from private.learning_map(u, l) where 'szybka-runda' = any(formats)
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

notify pgrst, 'reload schema';
