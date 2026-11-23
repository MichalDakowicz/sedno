set local search_path = pg_catalog, public, extensions;

create table private.pamiec_rozmow_pestki (
  user_id uuid not null,
  rozmowa text not null,
  numer integer not null,
  skrot text not null,
  wektor vector(512) not null,
  primary key (user_id, rozmowa, numer),
  foreign key (user_id, rozmowa) references public.tutor_chats (user_id, id) on update cascade on delete cascade
);

revoke all on private.pamiec_rozmow_pestki from public, anon, authenticated;

create function private.indeksuj_rozmowe_pestki(p_user uuid, p_rozmowa text, p_wiadomosci jsonb)
returns void
language sql
set search_path = pg_catalog, public, extensions
as $$
  with wiadomosci as materialized (
    select m.numer::integer as numer, left(m.wpis ->> 'text', 1800) as tekst
    from jsonb_array_elements(p_wiadomosci) with ordinality as m(wpis, numer)
    where (m.numer > 1 or m.wpis ->> 'from' = 'student')
      and m.wpis ->> 'from' in ('student', 'tutor')
      and jsonb_typeof(m.wpis -> 'text') = 'string'
      and length(btrim(m.wpis ->> 'text')) >= 16
      and not exists (
        select 1
        from jsonb_array_elements(p_wiadomosci) as sprawdzenie(wpis)
        where sprawdzenie.wpis -> 'pestka' ? 'sprawdzenie'
           or (sprawdzenie.wpis ->> 'from' = 'student' and sprawdzenie.wpis ->> 'text' like 'Sprawdź odwołanie do lektury' || chr(10) || '%')
      )
  ), usuniete as (
    delete from private.pamiec_rozmow_pestki i
    where i.user_id = p_user and i.rozmowa = p_rozmowa
      and not exists (select 1 from wiadomosci w where w.numer = i.numer)
  ), zmienione as materialized (
    select w.numer, w.tekst, md5(w.tekst) as skrot
    from wiadomosci w
    left join private.pamiec_rozmow_pestki i
      on i.user_id = p_user and i.rozmowa = p_rozmowa and i.numer = w.numer
    where i.skrot is distinct from md5(w.tekst)
  )
  insert into private.pamiec_rozmow_pestki (user_id, rozmowa, numer, skrot, wektor)
  select p_user, p_rozmowa, z.numer, z.skrot, private.wiedza_wektor(z.tekst)
  from zmienione z
  on conflict (user_id, rozmowa, numer) do update
    set skrot = excluded.skrot, wektor = excluded.wektor;
$$;

revoke all on function private.indeksuj_rozmowe_pestki(uuid, text, jsonb) from public, anon, authenticated;

create function private.aktualizuj_pamiec_rozmowy_pestki()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, private
as $$
begin
  if tg_op = 'INSERT' or new.messages is distinct from old.messages then
    perform private.indeksuj_rozmowe_pestki(new.user_id, new.id, new.messages);
  end if;
  return new;
end
$$;

revoke all on function private.aktualizuj_pamiec_rozmowy_pestki() from public, anon, authenticated;

create trigger pamiec_pestki after insert or update of messages on public.tutor_chats
  for each row execute function private.aktualizuj_pamiec_rozmowy_pestki();

do $$
declare
  rozmowa record;
begin
  for rozmowa in select user_id, id, messages from public.tutor_chats loop
    perform private.indeksuj_rozmowe_pestki(rozmowa.user_id, rozmowa.id, rozmowa.messages);
  end loop;
end
$$;

create function public.pestka_wyszukaj_rozmowy(p_user uuid, p_biezaca text, p_pytanie text)
returns table (od text, tekst text)
language sql stable security definer
set search_path = pg_catalog, public, extensions
as $$
  with pytanie as (
    select private.wiedza_wektor(p_pytanie) as wektor where p_pytanie is not null
  ), wyniki as (
    select i.rozmowa, i.numer, c.updated_at, i.wektor <=> p.wektor as dystans
    from private.pamiec_rozmow_pestki i
    join public.tutor_chats c on c.user_id = i.user_id and c.id = i.rozmowa
    left join pytanie p on true
    where i.user_id = p_user and i.rozmowa <> p_biezaca
      and (i.wektor <=> p.wektor <= 0.82
        or (p_pytanie is null and i.rozmowa = (
          select n.id from public.tutor_chats n
          where n.user_id = p_user and n.id <> p_biezaca
            and exists (select 1 from private.pamiec_rozmow_pestki ni where ni.user_id = p_user and ni.rozmowa = n.id)
          order by n.updated_at desc, n.id
          limit 1
        )))
    order by dystans nulls last, c.updated_at desc, i.numer desc
    limit 4
  )
  select m.wpis ->> 'from', left(m.wpis ->> 'text', 1800)
  from wyniki w
  join public.tutor_chats c on c.user_id = p_user and c.id = w.rozmowa
  cross join lateral (select c.messages -> (w.numer - 1) as wpis) m
  order by w.dystans nulls last, w.updated_at desc, w.numer
$$;

revoke all on function public.pestka_wyszukaj_rozmowy(uuid, text, text) from public, anon, authenticated;
grant execute on function public.pestka_wyszukaj_rozmowy(uuid, text, text) to service_role;
