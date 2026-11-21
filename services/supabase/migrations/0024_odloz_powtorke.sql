-- Odłożenie powtórki: umiejętność zostaje w kolejce (jej pilność dalej rośnie), ale do czasu
-- odlozone_do idzie na koniec. Zapis tylko przez nauka_odloz.
create table private.powtorka_odlozona (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_id text not null references private.learning_skills (id),
  odlozone_do timestamptz not null,
  primary key (user_id, skill_id)
);
alter table private.powtorka_odlozona enable row level security;
revoke all on private.powtorka_odlozona from public, anon, authenticated;

create function public.nauka_odloz(p_skills text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := private.learning_user();
begin
  insert into private.powtorka_odlozona (user_id, skill_id, odlozone_do)
  select u, s, now() + interval '1 day' from unnest(p_skills) s
  on conflict (user_id, skill_id) do update set odlozone_do = excluded.odlozone_do;
end;
$$;

revoke all on function public.nauka_odloz(text[]) from public, anon;
grant execute on function public.nauka_odloz(text[]) to authenticated;

-- Kolejka jak w 0017; jedyna zmiana: odłożone umiejętności (błędy i odświeżenia) za nieodłożonymi.
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
      max(b.happened_at) over (partition by m.skill_id) as ostatni_blad,
      o.skill_id is not null as odlozona
    from mapa m
    left join private.learning_review_queue_items(u, l) b on b.skill_id = m.skill_id
    left join private.powtorka_odlozona o
      on o.user_id = u and o.skill_id = m.skill_id and o.odlozone_do > now()
    where m.due_at <= now() or b.skill_id is not null
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'skill_id', w.skill_id, 'name', w.name, 'due_at', w.due_at,
    'last_practiced_at', w.last_practiced_at, 'retention', w.retention,
    'format', case when w.ma_blad and w.repeat_id is null and 'napraw-blad' = any(w.formats)
      then 'napraw-blad' else 'szybka-runda' end,
    'mistake', w.blad
  ) order by w.odlozona, w.ma_blad desc, w.ostatni_blad desc nulls last,
    case when not w.ma_blad then (1 + w.exam_points) * (1 - coalesce(w.retention, 1)) end desc nulls last,
    w.skill_id, w.blad_at desc, w.source_id), '[]'::jsonb)
  into kolejka
  from wiersze w;

  return jsonb_build_object('level', l, 'today', kolejka->0, 'queue', kolejka);
end;
$$;

notify pgrst, 'reload schema';
