-- Jedno wyszukiwanie kotwic dla wszystkich miejsc cytowanych w materiałach danego utworu.
create or replace function public.pestka_lektury_kotwice(p_utwor text, p_miejsca text[])
returns table (miejsce text, url text)
language sql stable security definer
set search_path = pg_catalog
as $$
  with szukane as (
    select distinct m as miejsce, private.klucz_miejsca(m) as klucz, private.wspolrzedne_lektury(m) as wspolrzedne
    from unnest(p_miejsca[1:200]) as m
    where length(m) between 1 and 240
  )
  select s.miejsce, f.zrodlo_url
  from szukane s
  cross join lateral (
    select f.zrodlo_url
    from private.lektury_fragmenty f
    where f.utwor = p_utwor and strpos(f.zrodlo_url, '#') > 0 and s.klucz <> ''
      and (f.miejsce_klucz = s.klucz or (
        cardinality(s.wspolrzedne) > 0 and private.wspolrzedne_lektury(f.miejsce) = s.wspolrzedne))
    order by (f.miejsce_klucz = s.klucz) desc, f.nr
    limit 1
  ) f
$$;

revoke all on function public.pestka_lektury_kotwice(text, text[]) from public, anon, authenticated;
grant execute on function public.pestka_lektury_kotwice(text, text[]) to service_role;
notify pgrst, 'reload schema';
