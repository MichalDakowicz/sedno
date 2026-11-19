-- Rotacja zadań w rundach i limit otwartych rund na poziom.
--
-- 1. Przy umiejętnościach z 5–7 wariantami CKE własne ćwiczenia wypadały z puli (warunek < 5),
--    a kolejność po last_seen dawała w każdej rundzie ten sam zestaw w tej samej kolejności.
--    Teraz własne ćwiczenia dopełniają pulę szybkiej rundy, dopóki CKE nie wystarcza na dwie pełne
--    rundy bez powtórek (< 16). Runda wybiera najpierw zadania niewidziane, potem te z błędną ostatnią
--    odpowiedzią, potem najdawniej widziane. Zadania jednej rundy (albo jednego dnia w arkuszu) są
--    sobie równe i losowane, a przy remisie CKE ma pierwszeństwo przed własnymi. Kolejność w rundzie
--    jest losowa: osobno w części podstawowej i w zapasie, który dochodzi po błędach.
--    Gdy pula jest mniejsza niż cel, runda jest krótsza (jak dotąd).
-- 2. Limit 10 otwartych rund liczy tylko bieżący poziom, tak jak lista „Ostatnio” (nauka_ostatnie).

create or replace function private.learning_variants(p_skill text, p_level text, p_format text)
returns table (id text, prompt jsonb, answers text[], explanation text, hints text[], error_type text)
language sql stable set search_path = '' as $$
  with cke as materialized (
    select * from private.cke_round_variants(p_skill, p_level) where p_format = 'szybka-runda'
  )
  select * from cke
  union all
  select e.id, e.prompt, e.answers, e.explanation, e.hints, e.error_type
  from private.learning_exercises e
  where e.skill_id = p_skill
    and e.level = p_level
    and e.format = case p_format when 'sokratejski' then 'szybka-runda' else p_format end
    and (p_format <> 'szybka-runda' or (select count(*) from cke) < 16);
$$;

create or replace function public.nauka_start(p_session uuid, p_skill text, p_format text, p_level text default null, p_item text default null) returns jsonb
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
  if (select count(*) from private.learning_sessions
      where user_id = u and level = l and completed_at is null and format <> 'diagnoza') >= 10 then
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
  ), seen as (
    select v.*, v.id is not distinct from p_item as pinned,
      v.prompt->>'typ' is distinct from 'cke' as original_variant,
      r.at as round_at, r.round_start, r.correct, sp.at as sheet_at
    from candidates v
    left join lateral (
      -- Identyfikator wariantu wskazuje umiejętność, więc liczą się też próby z diagnozy.
      -- Pierwsze nieukończone zadanie otwartej rundy było już zwrócone klientowi.
      select coalesce(i.answered_at, previous.updated_at) as at, previous.created_at as round_start, i.correct
      from private.learning_sessions previous
      join private.learning_session_items i on (i.user_id, i.session_id) = (previous.user_id, previous.id)
      where previous.user_id = u and previous.level = l and i.variant_id = v.id
        and (i.answered_at is not null or (previous.completed_at is null and i.position = (
          select min(next.position)
          from private.learning_session_items next
          where (next.user_id, next.session_id) = (i.user_id, i.session_id) and next.answered_at is null
        )))
      order by coalesce(i.answered_at, previous.updated_at) desc
      limit 1
    ) r on true
    left join lateral (
      select p.updated_at as at
      from public.sheet_progress p
      where (p.user_id, p.sheet_id) = (u, v.prompt->>'sheet_id')
        and (nullif(btrim(p.data -> 'odpowiedzi' ->> (v.prompt->>'question')), '') is not null
          or p.data->'sprawdzony' = 'true'::jsonb
          or p.data->'sprawdzoneZadania' @> jsonb_build_array(v.prompt->'task_nr'))
    ) sp on true
  ), chosen as (
    select w.*, row_number() over (order by
        w.pinned desc,
        case when w.round_at is null and w.sheet_at is null then 0
          when w.correct is false and w.round_at >= coalesce(w.sheet_at, '-infinity') then 1
          else 2 end,
        greatest(w.round_start, date_trunc('day', w.sheet_at)) nulls first,
        w.original_variant, random(), w.id
      ) as rank
    from seen w
    order by rank
    limit case when p_format = 'szybka-runda' then 8 else cel end
  )
  insert into private.learning_session_items (user_id, session_id, position, variant_id, prompt, accepted, explanation, hints, error_type)
  select u, p_session, row_number() over (order by v.pinned desc, v.rank > cel, random(), v.id),
    v.id, v.prompt, v.answers, v.explanation, coalesce(v.hints, '{}'), v.error_type
  from chosen v;

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

notify pgrst, 'reload schema';
