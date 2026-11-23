create schema if not exists extensions;
create extension if not exists vector with schema extensions;
create extension if not exists unaccent with schema extensions;
set local search_path = pg_catalog, public, extensions;

-- Wektory cech leksykalnych. Polskie odmiany często zachowują wspólny rdzeń.
-- Oba końce wyszukiwania używają tej samej funkcji, bez zewnętrznego klucza.
create function private.wiedza_wektor(tresc text) returns vector
language sql stable
set search_path = pg_catalog, public, extensions
as $$
  with slowa as (
    select distinct slowo
    from regexp_split_to_table(lower(unaccent(tresc)), '[^a-z0-9]+') as slowo
    where length(slowo) >= 4
      and slowo not in ('jaki', 'jakie', 'jaka', 'kiedy', 'jakim', 'ktory', 'ktora', 'czyli', 'albo', 'utwor', 'lektura', 'opisz', 'podaj', 'jest', 'oraz')
  ), cechy as (
    select distinct substr(slowo, pozycja, 4) as cecha
    from slowa cross join lateral generate_series(1, length(slowo) - 3) as pozycja
  ), kosze as (
    select (hashtext(cecha)::bigint & 2147483647) % 512 as kosz, count(*)::real as waga
    from cechy group by 1
  )
  select array_agg(coalesce(waga, 0) order by nr)::vector
  from generate_series(0, 511) nr left join kosze on kosz = nr
$$;

create table private.wiedza_pestki (
  przedmiot text not null,
  utwor text not null,
  sekcja text not null,
  tytul text not null,
  tekst text not null check (length(tekst) between 1 and 7000),
  hasla text not null,
  zrodlo_url text not null check (zrodlo_url like 'https://%'),
  zrodlo_rodzaj text not null check (zrodlo_rodzaj in ('utwór', 'opracowanie')),
  warunki text not null,
  wektor vector(512) not null,
  primary key (przedmiot, utwor, sekcja)
);

create function private.wiedza_aktualizuj_wektor() returns trigger
language plpgsql set search_path = pg_catalog, private
as $$
begin
  new.wektor := private.wiedza_wektor(new.hasla || ' ' || new.tekst);
  return new;
end
$$;

create trigger wiedza_wektor before insert or update of tekst, hasla
  on private.wiedza_pestki for each row execute function private.wiedza_aktualizuj_wektor();

create function public.pestka_wyszukaj_wiedze(
  p_przedmiot text, p_utwor text, p_sekcja text, p_pytanie text
) returns table (utwor text, sekcja text, tytul text, tekst text, zrodlo_url text, zrodlo_rodzaj text)
language sql stable security definer
set search_path = pg_catalog, public, extensions
as $$
  with pytanie as (
    select private.wiedza_wektor(left(p_pytanie, 450)) as wektor
  )
  select w.utwor, w.sekcja, w.tytul, w.tekst, w.zrodlo_url, w.zrodlo_rodzaj
  from private.wiedza_pestki w cross join pytanie p
  where w.przedmiot = p_przedmiot
    and (p_utwor is null or w.utwor = p_utwor)
    and (p_sekcja is null or w.sekcja = p_sekcja)
    and (w.wektor <=> p.wektor <= 0.83 or (p_utwor is not null and w.sekcja = p_sekcja))
  order by w.wektor <=> p.wektor nulls last, w.utwor, w.sekcja
  limit 3
$$;

revoke all on function public.pestka_wyszukaj_wiedze(text, text, text, text) from public, anon, authenticated;
grant execute on function public.pestka_wyszukaj_wiedze(text, text, text, text) to service_role;
revoke all on private.wiedza_pestki from public, anon, authenticated;
