-- Opanowanie bez sufitu. Elo liczone od 1000 w oknie 40 prób z zadaniami o stałej trudności 950
-- rosło coraz wolniej i przy samych bezbłędnych rundach stawało na ok. 67%, a jedna próba na wariant
-- (distinct on) zatrzymywała je jeszcze niżej przy małej puli zadań.
--
-- Teraz opanowanie to średnia krocząca poprawności: każda próba przesuwa ocenę w stronę swojego wyniku
-- o krok 1 - 0,8^(waga · mnożnik trudności). Start 0,5, okno 60 najnowszych prób.
-- - Trudność: sukces w trudniejszym zadaniu i błąd w łatwiejszym ważą więcej (10^(±(trudność - 1000) / 800)).
-- - Waga błędów: przy wysokiej ocenie błąd zabiera dużo (krok liczony od całej oceny), sukces dodaje mało.
-- - Powtórki: każda próba wariantu się liczy, ale każda starsza próba tego samego wariantu waży 0,85 poprzedniej,
--   żeby powtarzanie znanego zadania nie pompowało wyniku.
-- - Zanik z czasem bez zmian: mapa mnoży ocenę przez retencję, rozbiór porównuje ocenę bez zaniku.
-- Bezbłędne rundy (5 zadań, pula 13 wariantów): 68% → 79% → 86% → 90% → 93% → 95% → 96% → 97% → 98%.

create or replace function private.learning_map(p_user uuid, p_level text)
returns table (
  skill_id text, area text, name text, description text, codes text[],
  exam_points numeric, evidence_count bigint, last_practiced_at timestamptz,
  last_mistake_at timestamptz, last_success_at timestamptz,
  score numeric, estimated numeric, confidence numeric,
  retention numeric, due_at timestamptz, formats text[]
)
language sql stable set search_path = '' as $$
  with recursive attempts as (
    select e.*, row_number() over (
      partition by e.skill_id, e.source_id order by e.happened_at desc, e.session_id
    ) as repeat_n
    from private.learning_evidence(p_user, p_level) e
  ), recent as (
    select e.*, e.weight * power(0.85::numeric, e.repeat_n - 1) as w,
      row_number() over (
        partition by e.skill_id order by e.happened_at desc, e.session_id,
          case when e.session_id is not null then e.question::int end desc, e.source_id
      ) as n
    from attempts e
  ), samples as (
    -- effective (z wiekiem) wpływa tylko na pewność. Próg danych i model liczą pełną wagę.
    select e.*, row_number() over (partition by e.skill_id order by e.n desc) as ordinal,
      e.w * power(0.5::numeric, greatest(0, extract(epoch from (now() - e.happened_at))) /
        (86400 * k.half_life_days)) as effective
    from recent e
    join private.learning_skills k on k.id = e.skill_id
    where e.n <= 60
  ), stats as (
    select a.skill_id, count(*) as n, max(a.happened_at) as latest,
      sum(a.effective) as effective, sum(a.w) as total
    from samples a
    group by a.skill_id
  ), model (skill_id, ordinal, p) as (
    select k.id, 0::bigint, 0.5::numeric from private.learning_skills k
    union all
    select a.skill_id, a.ordinal, round(
      m.p + (a.score - m.p) * (1 - power(0.8::numeric, a.w * power(10::numeric,
        (case when a.score >= 0.5 then a.difficulty - 1000 else 1000 - a.difficulty end) / 800))), 5)
    from model m join samples a on a.skill_id = m.skill_id and a.ordinal = m.ordinal + 1
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
  join model e on e.skill_id = k.id and e.ordinal = coalesce(a.n, 0)
  cross join lateral (select round(e.p, 3) as estimated) ocena
  cross join lateral (
    select case when a.latest is not null then
      power(0.5::numeric, greatest(0, extract(epoch from (now() - a.latest))) / (86400 * k.half_life_days))
    end as retention
  ) zanik
  left join mistakes b on b.skill_id = k.id
  left join success p on p.skill_id = k.id
  left join private.cke_learning_weights(p_level) w on w.skill_id = k.id
$$;

notify pgrst, 'reload schema';
