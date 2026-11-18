-- Opanowanie wyświetlane w mapie to ocena modelu Elo pomnożona przez retencję, czyli zanika
-- z czasem od ostatniej próby. Sam model nie starzeje już wag, więc ocena nie wraca do 50%.

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
    -- effective (z wiekiem) decyduje tylko o progu danych i pewności. Elo liczy pełną wagę.
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
    case when a.n >= 3 and a.effective >= 1.2 then round(ocena.estimated * coalesce(zanik.retention, 1), 3) end,
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

-- Rekomendacja z gotowej mapy (jsonb z wierszy learning_map), żeby nie liczyć mapy drugi raz.
create function private.learning_recommendation_from(p_user uuid, p_level text, p_skill text, p_map jsonb)
returns jsonb language sql stable set search_path = '' as $$
  with recommended as (
    select m.*
    from jsonb_to_recordset(p_map) as m(
      skill_id text, name text, exam_points numeric, last_mistake_at timestamptz,
      score numeric, estimated numeric, retention numeric, due_at timestamptz, formats text[]
    )
    where (p_skill is null or m.skill_id = p_skill) and 'szybka-runda' = any(m.formats)
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

create or replace function private.learning_recommendation(p_user uuid, p_level text, p_skill text default null)
returns jsonb language sql stable set search_path = '' as $$
  select private.learning_recommendation_from(p_user, p_level, p_skill,
    (select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) from private.learning_map(p_user, p_level) m))
$$;

revoke all on function private.learning_recommendation_from(uuid, text, text, jsonb)
  from public, anon, authenticated;

-- Koniec rundy liczy mapę dwa razy (przed i po) zamiast trzech. Wynik "po" i rekomendacja
-- korzystają z tej samej migawki.
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
    select m.score into before_score from private.learning_map(u, s.level) m where m.skill_id = s.skill_id;
    select count(*) into zdobyte from private.learning_session_items
      where (user_id, session_id) = (u, p_session) and correct;
    update private.learning_sessions set completed_at = updated_at,
      result = jsonb_build_object('wynik', jsonb_build_object('poprawne', zdobyte, 'wszystkich', cel))
      where (user_id, id) = (u, p_session);

    select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) into mapa from private.learning_map(u, s.level) m;
    select (x->>'score')::numeric into after_score
      from jsonb_array_elements(mapa) x where x->>'skill_id' = s.skill_id;
    update private.learning_sessions set result = result || jsonb_build_object(
      'opanowanie_przed', before_score, 'opanowanie_po', after_score,
      'nastepny_krok', private.learning_recommendation_from(u, s.level, null, mapa)
    ) where (user_id, id) = (u, p_session);
  end if;
  return private.learning_session_response(u, p_session);
end;
$$;

-- Kolejka: umiejętności z błędami idą pierwsze, od tej z najświeższą pomyłką. W grupie najnowsze
-- błędy są pierwsze. Potem umiejętności do odświeżenia według pilności. "today" to pierwszy wiersz.
create or replace function public.nauka_powtorki(p_level text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  l text := private.learning_level(u, p_level);
  kolejka jsonb;
begin
  with mapa as materialized (
    select * from private.learning_map(u, l)
    where 'szybka-runda' = any(formats)
  ), wiersze as (
    select m.skill_id, m.name, m.due_at, m.last_practiced_at, m.retention, m.formats, m.exam_points,
      b.skill_id is not null as ma_blad, b.repeat_id, b.happened_at as blad_at, b.source_id,
      case when b.skill_id is not null then to_jsonb(b) - 'skill_id' end as blad,
      max(b.happened_at) over (partition by m.skill_id) as ostatni_blad
    from mapa m
    left join private.learning_review_queue_items(u, l) b on b.skill_id = m.skill_id
    where m.due_at <= now() or b.skill_id is not null
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'skill_id', w.skill_id, 'name', w.name, 'due_at', w.due_at,
    'last_practiced_at', w.last_practiced_at, 'retention', w.retention,
    'format', case when w.ma_blad and w.repeat_id is null and 'napraw-blad' = any(w.formats)
      then 'napraw-blad' else 'szybka-runda' end,
    'mistake', w.blad
  ) order by w.ma_blad desc, w.ostatni_blad desc nulls last,
    case when not w.ma_blad then (1 + w.exam_points) * (1 - coalesce(w.retention, 1)) end desc nulls last,
    w.skill_id, w.blad_at desc, w.source_id), '[]'::jsonb)
  into kolejka
  from wiersze w;

  return jsonb_build_object('level', l, 'today', kolejka->0, 'queue', kolejka);
end;
$$;

notify pgrst, 'reload schema';
