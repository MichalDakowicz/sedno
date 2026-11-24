create or replace function private.numer_miejsca_lektury(s text) returns int
language sql immutable strict parallel safe
set search_path = pg_catalog
as $$
  select case
    when s ~ '^[0-9]{1,4}$' then s::int
    when s ~ '^[ivxlc]{1,8}$' then (
      select sum(case when n < nastepna then -n else n end)::int
      from (
        select n, lead(n, 1, 0) over (order by i) as nastepna
        from (
          select i, (array[1,5,10,50,100])[strpos('ivxlc', substr(s, i, 1))] as n
          from generate_series(1, length(s)) i
        ) cyfry
      ) wartosci
    )
    else array_position(array['pierwsza','druga','trzecia','czwarta','piata','szosta','siodma','osma',
      'dziewiata','dziesiata','jedenasta','dwunasta','trzynasta','czternasta'], s)
  end
$$;

-- Stary loader pomijał akty zapisane słowami i powielał kotwicę pierwszej sceny o danym numerze.
-- Granice aktów bierzemy z kolejności pełnego tekstu, a numery s… z nagłówków czytnika.
with akty(utwor, kotwice) as (
  values ('makbet', array[1,9,14,21,25,33]), ('zemsta', array[1,10,20,28,42])
), stare as (
  select f.id, f.utwor, f.nr, f.czesc, a.kotwice,
    private.numer_miejsca_lektury(substring(private.norm(f.miejsce) from '^sc ([a-z0-9]+)')) as scena
  from private.lektury_fragmenty f join akty a using (utwor)
  where f.miejsce like 'sc. %'
), z_aktami as (
  select s.*, count(*) filter (where scena = 1 and czesc = 1) over (partition by utwor order by nr)::int as akt
  from stare s
), sprawdzone as (
  select a.*, max(akt) over (partition by utwor) as liczba_aktow
  from z_aktami a
)
update private.lektury_fragmenty f
set miejsce = format('akt %s, sc. %s%s', a.akt, a.scena, coalesce(substring(f.miejsce from ', w\..*$'), '')),
    zrodlo_url = split_part(f.zrodlo_url, '#', 1) || '#s' || (a.kotwice[a.akt] + a.scena)
from sprawdzone a
where f.id = a.id and a.liczba_aktow = cardinality(a.kotwice) - 1
  and a.scena > 0 and a.kotwice[a.akt] + a.scena < a.kotwice[a.akt + 1];

-- Różna numeracja i skróty dają ten sam klucz. Zakres prowadzi do swojego początku.
create or replace function private.wspolrzedne_lektury(miejsce text) returns text[]
language sql immutable parallel safe
set search_path = pg_catalog
as $$
  select coalesce(array_agg(typ || ':' || nr order by typ), array[]::text[])
  from (
    select distinct on (typ) typ, nr
    from (
      select case
        when m[1] in ('t', 'tom') then 't'
        when m[1] in ('cz', 'czesc') then 'cz'
        when m[1] in ('rozdz', 'rozdzial') then 'rozdz'
        when m[1] in ('sc', 'scena') then 'sc'
        when m[1] in ('ks', 'ksiega') then 'ks'
        else m[1] end as typ,
        private.numer_miejsca_lektury(m[2]) as nr, i
      from regexp_matches(private.norm(private.klucz_miejsca(miejsce)),
        '\m(t|tom|cz|czesc|rozdz|rozdzial|akt|sc|scena|ks|ksiega) ([a-z0-9]+)\M', 'g')
        with ordinality as skladnik(m, i)
    ) z
    where nr > 0
    order by typ, i
  ) pierwsze
$$;

create index if not exists lektury_fragmenty_wspolrzedne
  on private.lektury_fragmenty (utwor, private.wspolrzedne_lektury(miejsce))
  where strpos(zrodlo_url, '#') > 0;

create or replace function public.pestka_lektury_elementy(
  p_utwor text, p_rodzaje text[], p_pytanie text, p_limit integer, p_kolejnosc boolean, p_od_konca boolean
) returns table (utwor text, rodzaj text, nr integer, miejsce text, tekst text, dane jsonb, zrodlo_url text)
language sql stable security definer
set search_path = pg_catalog
as $$
  with q as (select private.zapytanie_prefiksowe(p_pytanie) as q)
  select e.utwor, e.rodzaj, e.nr, e.miejsce, e.tekst, e.dane,
    coalesce(
      (select f.zrodlo_url from private.lektury_fragmenty f
       where e.miejsce_klucz <> '' and f.utwor = e.utwor and strpos(f.zrodlo_url, '#') > 0
         and (f.miejsce_klucz = e.miejsce_klucz or (
           cardinality(k.miejsce) > 0 and private.wspolrzedne_lektury(f.miejsce) = k.miejsce))
       order by (f.miejsce_klucz = e.miejsce_klucz) desc, f.nr limit 1),
      e.zrodlo_url)
  from private.lektury_elementy e cross join q
  cross join lateral (select private.wspolrzedne_lektury(e.miejsce) as miejsce) k
  where e.utwor = p_utwor and e.rodzaj = any (p_rodzaje)
    and (p_kolejnosc or p_od_konca or q.q is null or e.tsv @@ q.q)
  order by (case when p_kolejnosc or p_od_konca or q.q is null then 0 else ts_rank(e.tsv, q.q) end) desc,
    e.rodzaj, case when p_od_konca then -e.nr else e.nr end
  limit least(greatest(coalesce(p_limit, 8), 1), 60)
$$;

create or replace function public.pestka_lektury_fragmenty_miejsca(
  p_utwor text, p_miejsce text, p_limit integer
) returns table (utwor text, nr integer, czesc integer, miejsce text, tytul_czesci text, tekst text, zrodlo_url text, trafienie text)
language sql stable security definer
set search_path = pg_catalog
as $$
  with szukane as (
    select private.wspolrzedne_lektury(left(p_miejsce, 200)) as klucz, least(greatest(coalesce(p_limit, 7), 2), 7) as ile
  ), pasujace as (
    select f.*, row_number() over (order by f.nr) as pozycja, count(*) over () as n
    from private.lektury_fragmenty f cross join szukane s
    where f.utwor = p_utwor and cardinality(s.klucz) > 0
      and private.wspolrzedne_lektury(f.miejsce) @> s.klucz
  )
  select p.utwor, p.nr, p.czesc, p.miejsce, p.tytul_czesci, p.tekst, p.zrodlo_url, 'miejsce'::text
  from pasujace p cross join szukane s
  where p.n <= s.ile or exists (
    select 1 from generate_series(0, s.ile - 1) i
    where p.pozycja = 1 + round(i * (p.n - 1)::numeric / (s.ile - 1))
  )
  order by p.nr
$$;

revoke all on function public.pestka_lektury_fragmenty_miejsca(text, text, integer) from public, anon, authenticated;
grant execute on function public.pestka_lektury_fragmenty_miejsca(text, text, integer) to service_role;
notify pgrst, 'reload schema';
