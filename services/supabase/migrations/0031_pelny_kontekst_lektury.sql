-- Utwór wskazany przez katalog ma tylko sześć notatek. Słowa pytania ustalają ich kolejność.
set local search_path = pg_catalog, public, extensions;

create or replace function public.pestka_wyszukaj_wiedze(
  p_przedmiot text, p_utwor text, p_sekcja text, p_pytanie text
) returns table (utwor text, sekcja text, tytul text, tekst text, zrodlo_url text, zrodlo_rodzaj text)
language sql stable security definer
set search_path = pg_catalog, public, extensions
as $$
  with pytanie as (
    select private.wiedza_wektor(left(p_pytanie, 450)) as wektor
  ), powiazania(glowna, pomocnicza) as (
    values
      ('streszczenie', 'wydarzenia'), ('streszczenie', 'bohaterowie'),
      ('wydarzenia', 'streszczenie'), ('wydarzenia', 'bohaterowie'),
      ('bohaterowie', 'streszczenie'), ('bohaterowie', 'wydarzenia'),
      ('geneza', 'konteksty'),
      ('konteksty', 'geneza'), ('konteksty', 'motywy'),
      ('motywy', 'wydarzenia'), ('motywy', 'konteksty')
  ), pasujace as (
    select w.*, w.wektor <=> p.wektor as dystans,
      case when p_utwor is not null and w.sekcja = p_sekcja then 0
           when p_utwor is not null and s.pomocnicza is not null then 1
           else 2 end as priorytet
    from private.wiedza_pestki w cross join pytanie p
    left join powiazania s on s.glowna = p_sekcja and s.pomocnicza = w.sekcja and w.przedmiot = 'polski'
    where w.przedmiot = p_przedmiot
      and (p_utwor is null or w.utwor = p_utwor)
      and (p_utwor is not null or p_sekcja is null or w.sekcja = p_sekcja)
  )
  select w.utwor, w.sekcja, w.tytul, w.tekst, w.zrodlo_url, w.zrodlo_rodzaj
  from pasujace w
  where p_utwor is not null or w.dystans <= 0.83
  order by w.priorytet, w.dystans nulls last, w.utwor, w.sekcja
$$;
