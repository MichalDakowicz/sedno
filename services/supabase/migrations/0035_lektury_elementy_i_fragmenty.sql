-- Wiedza o lekturach klucz po kluczu `utwor` (id z katalogu lektur): elementy opracowane ręcznie
-- (wydarzenia, postaci, motywy, utwory zbiorów) oraz fragmenty pełnego tekstu utworów z domeny publicznej.
-- Elementy wypełnia migracja generowana z services/supabase/lektury/*.json, fragmenty ładuje skrypt
-- services/supabase/lektury/wgraj-teksty.ts (tekstów nie ma w repozytorium). Wyszukiwanie zawsze
-- zawęża się do jednego utworu rozpoznanego przez bramkę.
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists vector with schema extensions;
set local search_path = pg_catalog, public, extensions;

-- Zapis bez polskich znaków, małymi literami, same litery i cyfry rozdzielone spacją.
create function private.norm(tekst text) returns text
language sql immutable parallel safe
set search_path = pg_catalog, extensions
as $$
  select trim(regexp_replace(lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(tekst, ''))),
    '[^a-z0-9]+', ' ', 'g'))
$$;

-- Klucz miejsca w utworze: bez numerów wersów, żeby wydarzenie ("t. I, rozdz. 7, w. 10–20")
-- trafiło do fragmentu ("t. I, rozdz. 7").
create function private.klucz_miejsca(miejsce text) returns text
language sql immutable parallel safe
set search_path = pg_catalog
as $$
  select trim(regexp_replace(regexp_replace(lower(coalesce(miejsce, '')), ',?\s*w\.\s.*$', ''), '\s+', ' ', 'g'))
$$;

-- Słowa pytania jako zapytanie prefiksowe: pierwsze 5 liter znosi polską fleksję (Wokulskiego, Wokulski).
create function private.zapytanie_prefiksowe(pytanie text) returns tsquery
language sql immutable parallel safe
set search_path = pg_catalog, extensions
as $$
  select to_tsquery('simple', nullif(string_agg(left(slowo, 5) || ':*', ' | '), ''))
  from (
    select distinct slowo
    from regexp_split_to_table(private.norm(left(pytanie, 450)), ' ') as slowo
    where length(slowo) >= 4
      and slowo <> all (array['jaki', 'jakie', 'jaka', 'jakim', 'kiedy', 'ktory', 'ktora', 'ktore', 'czyli', 'albo',
        'utwor', 'lektura', 'lekturze', 'opisz', 'podaj', 'jest', 'byl', 'byla', 'bylo', 'oraz', 'dlaczego',
        'gdzie', 'czemu', 'kogo', 'tego', 'tych', 'tam', 'czym', 'ktorym', 'zrobil', 'zrobila', 'powiedz'])
    limit 12
  ) s
$$;

create table private.lektury_elementy (
  id bigint generated always as identity primary key,
  utwor text not null,
  rodzaj text not null check (rodzaj in ('wydarzenie', 'postac', 'motyw', 'utwor', 'zrodlo', 'weryfikacja')),
  nr integer not null check (nr >= 1),
  miejsce text not null default '',
  miejsce_klucz text generated always as (private.klucz_miejsca(miejsce)) stored,
  tekst text not null check (length(tekst) between 1 and 4000),
  dane jsonb not null,
  zrodlo_url text check (zrodlo_url is null or zrodlo_url like 'https://%'),
  tsv tsvector generated always as (to_tsvector('simple', private.norm(tekst))) stored,
  unique (utwor, rodzaj, nr)
);
create index lektury_elementy_tsv on private.lektury_elementy using gin (tsv);

create table private.lektury_fragmenty (
  id bigint generated always as identity primary key,
  utwor text not null,
  nr integer not null check (nr >= 1),
  czesc integer not null default 1 check (czesc >= 1),
  miejsce text not null,
  miejsce_klucz text generated always as (private.klucz_miejsca(miejsce)) stored,
  tytul_czesci text not null default '',
  tekst text not null check (length(tekst) between 1 and 12000),
  slowa integer not null check (slowa >= 1),
  zrodlo_url text not null check (zrodlo_url like 'https://wolnelektury.pl/%'),
  norm text generated always as (private.norm(tekst)) stored,
  tsv tsvector generated always as (
    setweight(to_tsvector('simple', private.norm(tytul_czesci || ' ' || miejsce)), 'A') ||
    setweight(to_tsvector('simple', private.norm(tekst)), 'B')
  ) stored,
  unique (utwor, nr)
);
create index lektury_fragmenty_tsv on private.lektury_fragmenty using gin (tsv);
create index lektury_fragmenty_norm on private.lektury_fragmenty using gin (norm extensions.gin_trgm_ops);
create index lektury_fragmenty_miejsce on private.lektury_fragmenty (utwor, miejsce_klucz);

-- Miejsce na osadzenia (embeddingi). Klucz naturalny, więc przeładowanie elementów lub fragmentów
-- nie osieraca wektorów. Kolumna `wektor` nie ma wymiaru: ustala go model wybrany przy wdrożeniu,
-- a indeks ANN powstaje osobno dla modelu (np. hnsw na (wektor::vector(768)) z warunkiem model = '...').
-- `tresc_hash` pozwala wypełniającemu skryptowi znaleźć wiersze zmienione od ostatniego liczenia.
create table private.lektury_osadzenia (
  zrodlo text not null check (zrodlo in ('element', 'fragment')),
  utwor text not null,
  rodzaj text not null default '',
  nr integer not null,
  czesc integer not null default 1,
  model text not null,
  tresc_hash text not null,
  wektor extensions.vector not null,
  primary key (zrodlo, utwor, rodzaj, nr, czesc, model)
);

create function public.pestka_lektury_elementy(
  p_utwor text, p_rodzaje text[], p_pytanie text, p_limit integer default 8, p_kolejnosc boolean default false
) returns table (utwor text, rodzaj text, nr integer, miejsce text, tekst text, dane jsonb, zrodlo_url text)
language sql stable security definer
set search_path = pg_catalog, public, extensions
as $$
  with q as (select private.zapytanie_prefiksowe(p_pytanie) as q)
  select e.utwor, e.rodzaj, e.nr, e.miejsce, e.tekst, e.dane,
    coalesce(
      (select f.zrodlo_url from private.lektury_fragmenty f
       where e.miejsce_klucz <> '' and f.utwor = e.utwor and f.miejsce_klucz = e.miejsce_klucz order by f.nr limit 1),
      e.zrodlo_url)
  from private.lektury_elementy e cross join q
  where e.utwor = p_utwor and e.rodzaj = any (p_rodzaje)
    and (p_kolejnosc or q.q is null or e.tsv @@ q.q)
  order by (case when p_kolejnosc or q.q is null then 0 else ts_rank(e.tsv, q.q) end) desc, e.rodzaj, e.nr
  limit least(greatest(coalesce(p_limit, 8), 1), 60)
$$;

-- Fragmenty tekstu: najpierw dokładna fraza (cytat), a gdy jej nie ma, ranking słów pytania.
create function public.pestka_lektury_fragmenty(
  p_utwor text, p_pytanie text, p_fraza text default null, p_limit integer default 3
) returns table (utwor text, nr integer, czesc integer, miejsce text, tytul_czesci text, tekst text, zrodlo_url text, trafienie text)
language sql stable security definer
set search_path = pg_catalog, public, extensions
as $$
  with fraza as (select nullif(private.norm(left(p_fraza, 300)), '') as f),
  q as (select private.zapytanie_prefiksowe(p_pytanie) as q),
  dokladne as (
    select f.utwor, f.nr, f.czesc, f.miejsce, f.tytul_czesci, f.tekst, f.zrodlo_url, 'fraza'::text as trafienie
    from private.lektury_fragmenty f cross join fraza
    where f.utwor = p_utwor and length(coalesce(fraza.f, '')) >= 8 and f.norm like '%' || fraza.f || '%'
    order by f.nr limit 3
  ), slowa as (
    select f.utwor, f.nr, f.czesc, f.miejsce, f.tytul_czesci, f.tekst, f.zrodlo_url, 'slowa'::text as trafienie
    from private.lektury_fragmenty f cross join q
    where f.utwor = p_utwor and q.q is not null and f.tsv @@ q.q and not exists (select 1 from dokladne)
    order by ts_rank_cd(f.tsv, q.q, 1) desc, f.nr
    limit least(greatest(coalesce(p_limit, 3), 1), 5)
  )
  select * from dokladne union all select * from slowa
$$;

revoke all on function public.pestka_lektury_elementy(text, text[], text, integer, boolean) from public, anon, authenticated;
grant execute on function public.pestka_lektury_elementy(text, text[], text, integer, boolean) to service_role;
revoke all on function public.pestka_lektury_fragmenty(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.pestka_lektury_fragmenty(text, text, text, integer) to service_role;
revoke all on private.lektury_elementy, private.lektury_fragmenty, private.lektury_osadzenia from public, anon, authenticated;
