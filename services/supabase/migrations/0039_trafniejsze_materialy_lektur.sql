-- Uzupełnij linki fragmentów już wgranych przez loader, gdy czytnik miał przypis w nagłówku
-- albo udostępniał kotwicę przed nagłówkiem.
update private.lektury_fragmenty f
set zrodlo_url = e.zrodlo_url
from (
  select distinct miejsce_klucz, zrodlo_url
  from private.lektury_elementy
  where utwor = 'lalka' and zrodlo_url like '%#wl-e%'
) e
where f.utwor = 'lalka' and f.miejsce_klucz = e.miejsce_klucz
  and f.zrodlo_url is distinct from e.zrodlo_url;

update private.lektury_fragmenty
set zrodlo_url = zrodlo_url || '#s6'
where utwor = 'dziady-iii' and lower(tytul_czesci) = 'improwizacja'
  and zrodlo_url = 'https://wolnelektury.pl/katalog/lektura/dziady-dziady-poema-dziady-czesc-iii.html';

create or replace function public.pestka_lektury_elementy(
  p_utwor text, p_rodzaje text[], p_pytanie text, p_limit integer, p_kolejnosc boolean, p_od_konca boolean
) returns table (utwor text, rodzaj text, nr integer, miejsce text, tekst text, dane jsonb, zrodlo_url text)
language sql stable security definer
set search_path = pg_catalog
as $$
  with q as (select private.zapytanie_prefiksowe(p_pytanie) as q)
  select e.utwor, e.rodzaj, e.nr, e.miejsce, e.tekst, e.dane,
    coalesce(
      case when e.zrodlo_url like '%#%' then e.zrodlo_url end,
      (select f.zrodlo_url from private.lektury_fragmenty f
       where e.miejsce_klucz <> '' and f.utwor = e.utwor and f.miejsce_klucz = e.miejsce_klucz order by f.nr limit 1),
      e.zrodlo_url)
  from private.lektury_elementy e cross join q
  where e.utwor = p_utwor and e.rodzaj = any (p_rodzaje)
    and (p_kolejnosc or p_od_konca or q.q is null or e.tsv @@ q.q)
  order by (case when p_kolejnosc or p_od_konca or q.q is null then 0 else ts_rank(e.tsv, q.q) end) desc,
    e.rodzaj, case when p_od_konca then -e.nr else e.nr end
  limit least(greatest(coalesce(p_limit, 8), 1), 60)
$$;

-- Starsza wersja bramki wywołuje RPC bez dodatkowego parametru.
create or replace function public.pestka_lektury_elementy(
  p_utwor text, p_rodzaje text[], p_pytanie text, p_limit integer default 8, p_kolejnosc boolean default false
) returns table (utwor text, rodzaj text, nr integer, miejsce text, tekst text, dane jsonb, zrodlo_url text)
language sql stable
set search_path = pg_catalog
as $$
  select * from public.pestka_lektury_elementy(p_utwor, p_rodzaje, p_pytanie, p_limit, p_kolejnosc, false)
$$;

create or replace function public.pestka_lektury_fragmenty(
  p_utwor text, p_pytanie text, p_fraza text, p_limit integer, p_poczatek boolean
) returns table (utwor text, nr integer, czesc integer, miejsce text, tytul_czesci text, tekst text, zrodlo_url text, trafienie text)
language sql stable security definer
set search_path = pg_catalog
as $$
  with fraza as (select nullif(private.norm(left(p_fraza, 300)), '') as f),
  q as (select private.zapytanie_prefiksowe(p_pytanie) as q),
  naglowek as (
    select f.utwor, f.nr, f.czesc, f.miejsce, f.tytul_czesci, f.tekst, f.zrodlo_url, 'naglowek'::text as trafienie
    from private.lektury_fragmenty f cross join q
    cross join lateral (select to_tsvector('simple', private.norm(f.tytul_czesci)) as tsv) t
    where p_poczatek and f.utwor = p_utwor and f.czesc = 1 and t.tsv @@ q.q
    order by ts_rank(t.tsv, q.q) desc, f.nr
    limit 1
  ), dokladne as (
    select f.utwor, f.nr, f.czesc, f.miejsce, f.tytul_czesci, f.tekst, f.zrodlo_url, 'fraza'::text as trafienie
    from private.lektury_fragmenty f cross join fraza
    where f.utwor = p_utwor and length(coalesce(fraza.f, '')) >= 8 and f.norm like '%' || fraza.f || '%'
      and not exists (select 1 from naglowek)
    order by f.nr limit 3
  ), slowa as (
    select f.utwor, f.nr, f.czesc, f.miejsce, f.tytul_czesci, f.tekst, f.zrodlo_url, 'slowa'::text as trafienie
    from private.lektury_fragmenty f cross join q
    where f.utwor = p_utwor and q.q is not null and f.tsv @@ q.q
      and not exists (select 1 from naglowek) and not exists (select 1 from dokladne)
    order by ts_rank_cd(f.tsv, q.q, 1) desc, f.nr
    limit least(greatest(coalesce(p_limit, 3), 1), 5)
  )
  select * from naglowek union all select * from dokladne union all select * from slowa
$$;

create or replace function public.pestka_lektury_fragmenty(
  p_utwor text, p_pytanie text, p_fraza text default null, p_limit integer default 3
) returns table (utwor text, nr integer, czesc integer, miejsce text, tytul_czesci text, tekst text, zrodlo_url text, trafienie text)
language sql stable
set search_path = pg_catalog
as $$
  select * from public.pestka_lektury_fragmenty(p_utwor, p_pytanie, p_fraza, p_limit, false)
$$;

revoke all on function public.pestka_lektury_elementy(text, text[], text, integer, boolean, boolean) from public, anon, authenticated;
grant execute on function public.pestka_lektury_elementy(text, text[], text, integer, boolean, boolean) to service_role;
revoke all on function public.pestka_lektury_fragmenty(text, text, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.pestka_lektury_fragmenty(text, text, text, integer, boolean) to service_role;

notify pgrst, 'reload schema';
