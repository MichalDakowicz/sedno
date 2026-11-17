-- Taksonomia i przypisania pytań z głównych arkuszy angielskiego w Formule 2023.
-- Źródła: tabele „Wymagania szczegółowe” w zasadach oceniania CKE, wersje
-- standardowe z maja 2023–2026, wszystkie trzy poziomy. Kody I i V oznaczają
-- odpowiednio środki językowe i wypowiedź pisemną. Dla czytania i słuchania
-- używamy kodu rozumienia, także gdy CKE podaje dodatkowy wymóg przetwarzania.
-- https://cke.gov.pl/egzamin-maturalny/egzamin-maturalny-w-formule-2023/arkusze/
-- Nazwy grup i okresy zaniku to parametry Sedna do przeglądu przed wdrożeniem.

create table private.learning_skills (
  id text primary key,
  area text not null,
  name text not null,
  description text not null,
  codes text[] not null,
  half_life_days numeric not null check (half_life_days > 0)
);

insert into private.learning_skills (id, area, name, description, codes, half_life_days) values
  ('sluchanie-sens', 'słuchanie', 'Uchwyć sens nagrania', 'Rozpoznaj temat wypowiedzi, intencję mówiącego i sytuację.', '{II.2,II.3,II.4}', 28),
  ('sluchanie-szczegoly', 'słuchanie', 'Usłysz szczegóły', 'Znajdź w nagraniu potrzebne informacje i ułóż je w kolejności.', '{II.5,II.6}', 28),
  ('sluchanie-wnioskowanie', 'słuchanie', 'Wnioskuj z nagrania', 'Odczytaj to, czego mówiący nie powiedział wprost.', '{II.7,II.9}', 28),
  ('czytanie-sens', 'czytanie', 'Uchwyć sens tekstu', 'Rozpoznaj główną myśl, intencję autora i kontekst.', '{III.1,III.2,III.3}', 28),
  ('czytanie-szczegoly', 'czytanie', 'Znajdź szczegóły w tekście', 'Odszukaj informację, także gdy pytanie opisuje ją innymi słowami.', '{III.4}', 28),
  ('czytanie-wnioskowanie', 'czytanie', 'Wyciągaj wnioski z tekstu', 'Rozpoznaj ukryte znaczenie i odróżnij fakty od opinii.', '{III.7,III.8,III.9}', 28),
  ('czytanie-spojnosc', 'czytanie', 'Połącz części tekstu', 'Rozpoznaj związki między zdaniami i uporządkuj informacje.', '{III.5,III.6}', 28),
  ('srodki-jezykowe', 'środki językowe', 'Dobieraj słownictwo i gramatykę', 'Uzupełniaj luki i przekształcaj zdania, zachowując sens, gramatykę i pisownię.', '{I}', 21),
  ('pisanie', 'pisanie', 'Napisz tekst zgodnie z poleceniem', 'Rozwiń wymagane punkty, uporządkuj tekst i dobierz styl do odbiorcy.', '{V}', 35);

create table private.cke_learning_map (
  sheet_id text not null,
  level text not null check (level in ('podstawowy', 'rozszerzony', 'dwujezyczny')),
  question text not null,
  requirement text not null,
  skill_id text not null references private.learning_skills (id),
  points smallint not null check (points > 0),
  primary key (sheet_id, question)
);

-- Każdy wiersz to zadanie. Kody są w kolejności podpunktów, 1 punkt za
-- podpunkt. Wiersz wypowiedzi ma jeden wpis, bez numeru podpunktu.
insert into private.cke_learning_map (sheet_id, level, question, requirement, skill_id, points)
select concat('angielski-', a.level, '-', a.rok, '-maj'), a.level,
       case when r.code = 'V' then a.zadanie::text else concat(a.zadanie, '.', r.nr) end,
       r.code, k.id, a.points
from (values
  (2023, 'dwujezyczny', 1, 'II.5 II.5 II.5 II.5 II.5', 1),
  (2023, 'dwujezyczny', 2, 'II.5 II.5 II.2 II.9 II.5 II.3', 1),
  (2023, 'dwujezyczny', 3, 'II.5 II.5 II.5 II.2', 1),
  (2023, 'dwujezyczny', 4, 'III.4 III.4 III.7 III.1 III.4 III.1 III.4 III.7', 1),
  (2023, 'dwujezyczny', 5, 'III.5 III.5 III.5 III.5', 1),
  (2023, 'dwujezyczny', 6, 'III.4 III.4 III.1 III.4', 1),
  (2023, 'dwujezyczny', 7, 'I I I I I', 1),
  (2023, 'dwujezyczny', 8, 'I I I I', 1),
  (2023, 'dwujezyczny', 9, 'I I I I I', 1),
  (2023, 'dwujezyczny', 10, 'V', 15),
  (2023, 'podstawowy', 1, 'II.5 II.5 II.5 II.5 II.5', 1),
  (2023, 'podstawowy', 2, 'II.2 II.4 II.2 II.3 II.2', 1),
  (2023, 'podstawowy', 3, 'II.6 II.3 II.5 II.5 II.4', 1),
  (2023, 'podstawowy', 4, 'III.1 III.1 III.1 III.1', 1),
  (2023, 'podstawowy', 5, 'III.1 III.7 III.3 III.4 III.4 III.4 III.4', 1),
  (2023, 'podstawowy', 6, 'III.4 III.4 III.4 III.4 III.1', 1),
  (2023, 'podstawowy', 7, 'III.5 III.5 III.5 III.5', 1),
  (2023, 'podstawowy', 8, 'I I I', 1),
  (2023, 'podstawowy', 9, 'I I I I', 1),
  (2023, 'podstawowy', 10, 'I I I', 1),
  (2023, 'podstawowy', 11, 'I I I', 1),
  (2023, 'podstawowy', 12, 'V', 12),
  (2023, 'rozszerzony', 1, 'II.7 II.9 II.5 II.5 II.5 II.2', 1),
  (2023, 'rozszerzony', 2, 'II.5 II.5 II.5 II.5 II.5', 1),
  (2023, 'rozszerzony', 3, 'II.5 II.5 II.5 II.5', 1),
  (2023, 'rozszerzony', 4, 'III.4 III.4 III.4 III.4 III.4', 1),
  (2023, 'rozszerzony', 5, 'III.5 III.5 III.5 III.5 III.5', 1),
  (2023, 'rozszerzony', 6, 'III.7 III.4 III.8 III.7 III.7 III.4 III.4 III.4', 1),
  (2023, 'rozszerzony', 7, 'I I I I I I', 1),
  (2023, 'rozszerzony', 8, 'I I I I', 1),
  (2023, 'rozszerzony', 9, 'I I I I', 1),
  (2023, 'rozszerzony', 10, 'V', 13),
  (2024, 'dwujezyczny', 1, 'II.5 II.5 II.2 II.5 II.5', 1),
  (2024, 'dwujezyczny', 2, 'II.5 II.9 II.5 II.2 II.5 II.5', 1),
  (2024, 'dwujezyczny', 3, 'II.5 II.5 II.5 II.5', 1),
  (2024, 'dwujezyczny', 4, 'III.1 III.4 III.4 III.7 III.1 III.4 III.4 III.1', 1),
  (2024, 'dwujezyczny', 5, 'III.5 III.5 III.5 III.5', 1),
  (2024, 'dwujezyczny', 6, 'III.4 III.4 III.4 III.4', 1),
  (2024, 'dwujezyczny', 7, 'I I I I I', 1),
  (2024, 'dwujezyczny', 8, 'I I I I', 1),
  (2024, 'dwujezyczny', 9, 'I I I I I', 1),
  (2024, 'dwujezyczny', 10, 'V', 15),
  (2024, 'podstawowy', 1, 'II.5 II.5 II.5 II.5 II.5', 1),
  (2024, 'podstawowy', 2, 'II.4 II.2 II.3 II.3 II.7', 1),
  (2024, 'podstawowy', 3, 'II.5 II.4 II.5 II.5 II.3', 1),
  (2024, 'podstawowy', 4, 'III.1 III.1 III.1 III.1', 1),
  (2024, 'podstawowy', 5, 'III.3 III.7 III.1 III.4 III.4 III.4 III.4', 1),
  (2024, 'podstawowy', 6, 'III.4 III.4 III.4 III.4 III.1', 1),
  (2024, 'podstawowy', 7, 'III.5 III.5 III.5 III.5', 1),
  (2024, 'podstawowy', 8, 'I I I', 1),
  (2024, 'podstawowy', 9, 'I I I I', 1),
  (2024, 'podstawowy', 10, 'I I I', 1),
  (2024, 'podstawowy', 11, 'I I I', 1),
  (2024, 'podstawowy', 12, 'V', 12),
  (2024, 'rozszerzony', 1, 'II.7 II.2 II.5 II.5 II.5 II.3', 1),
  (2024, 'rozszerzony', 2, 'II.5 II.5 II.5 II.5 II.5', 1),
  (2024, 'rozszerzony', 3, 'II.5 II.5 II.5 II.5', 1),
  (2024, 'rozszerzony', 4, 'III.4 III.4 III.4 III.9 III.4', 1),
  (2024, 'rozszerzony', 5, 'III.5 III.5 III.5 III.5 III.5', 1),
  (2024, 'rozszerzony', 6, 'III.4 III.4 III.7 III.1 III.7 III.4 III.4 III.4', 1),
  (2024, 'rozszerzony', 7, 'I I I I I I', 1),
  (2024, 'rozszerzony', 8, 'I I I I', 1),
  (2024, 'rozszerzony', 9, 'I I I I', 1),
  (2024, 'rozszerzony', 10, 'V', 13),
  (2025, 'dwujezyczny', 1, 'II.5 II.5 II.5 II.5 II.2', 1),
  (2025, 'dwujezyczny', 2, 'II.5 II.5 II.2 II.5 II.5 II.7', 1),
  (2025, 'dwujezyczny', 3, 'II.5 II.2 II.5 II.9', 1),
  (2025, 'dwujezyczny', 4, 'III.5 III.4 III.7 III.4 III.4 III.4 III.1 III.4', 1),
  (2025, 'dwujezyczny', 5, 'III.5 III.5 III.5 III.5', 1),
  (2025, 'dwujezyczny', 6, 'III.4 III.4 III.4 III.4', 1),
  (2025, 'dwujezyczny', 7, 'I I I I I', 1),
  (2025, 'dwujezyczny', 8, 'I I I I', 1),
  (2025, 'dwujezyczny', 9, 'I I I I I', 1),
  (2025, 'dwujezyczny', 10, 'V', 15),
  (2025, 'podstawowy', 1, 'II.2 II.7 II.3 II.2 II.4', 1),
  (2025, 'podstawowy', 2, 'II.2 II.5 II.5 II.5 II.5 II.7', 1),
  (2025, 'podstawowy', 3, 'II.5 II.5 II.5 II.5', 1),
  (2025, 'podstawowy', 4, 'III.1 III.1 III.1 III.1', 1),
  (2025, 'podstawowy', 5, 'III.4 III.7 III.2 III.7 III.4 III.4 III.4', 1),
  (2025, 'podstawowy', 6, 'III.4 III.4 III.7 III.7 III.1', 1),
  (2025, 'podstawowy', 7, 'III.5 III.5 III.5 III.5', 1),
  (2025, 'podstawowy', 8, 'I I I', 1),
  (2025, 'podstawowy', 9, 'I I I I', 1),
  (2025, 'podstawowy', 10, 'I I I', 1),
  (2025, 'podstawowy', 11, 'I I I', 1),
  (2025, 'podstawowy', 12, 'V', 12),
  (2025, 'rozszerzony', 1, 'II.2 II.7 II.5 II.5 II.5 II.3', 1),
  (2025, 'rozszerzony', 2, 'II.5 II.5 II.5 II.5 II.5', 1),
  (2025, 'rozszerzony', 3, 'II.5 II.5 II.5 II.5', 1),
  (2025, 'rozszerzony', 4, 'III.7 III.4 III.4 III.4 III.4', 1),
  (2025, 'rozszerzony', 5, 'III.5 III.5 III.5 III.5 III.5', 1),
  (2025, 'rozszerzony', 6, 'III.4 III.4 III.4 III.7 III.7 III.4 III.4 III.4', 1),
  (2025, 'rozszerzony', 7, 'I I I I I I', 1),
  (2025, 'rozszerzony', 8, 'I I I I', 1),
  (2025, 'rozszerzony', 9, 'I I I I', 1),
  (2025, 'rozszerzony', 10, 'V', 13),
  (2026, 'dwujezyczny', 1, 'II.5 II.5 II.7 II.5 II.5', 1),
  (2026, 'dwujezyczny', 2, 'II.2 II.5 II.2 II.7 II.5 II.3', 1),
  (2026, 'dwujezyczny', 3, 'II.5 II.5 II.5 II.5', 1),
  (2026, 'dwujezyczny', 4, 'III.4 III.4 III.4 III.6 III.1 III.4 III.4 III.4', 1),
  (2026, 'dwujezyczny', 5, 'III.5 III.5 III.5 III.5', 1),
  (2026, 'dwujezyczny', 6, 'III.4 III.4 III.4 III.4', 1),
  (2026, 'dwujezyczny', 7, 'I I I I I', 1),
  (2026, 'dwujezyczny', 8, 'I I I I', 1),
  (2026, 'dwujezyczny', 9, 'I I I I I', 1),
  (2026, 'dwujezyczny', 10, 'V', 15),
  (2026, 'podstawowy', 1, 'II.3 II.4 II.4 II.2 II.2', 1),
  (2026, 'podstawowy', 2, 'II.2 II.7 II.5 II.5 II.5 II.3', 1),
  (2026, 'podstawowy', 3, 'II.5 II.5 II.5 II.5', 1),
  (2026, 'podstawowy', 4, 'III.1 III.1 III.1 III.1', 1),
  (2026, 'podstawowy', 5, 'III.1 III.1 III.4 III.4 III.4 III.4 III.4', 1),
  (2026, 'podstawowy', 6, 'III.4 III.4 III.4 III.4 III.1', 1),
  (2026, 'podstawowy', 7, 'III.5 III.5 III.5 III.5', 1),
  (2026, 'podstawowy', 8, 'I I I', 1),
  (2026, 'podstawowy', 9, 'I I I I', 1),
  (2026, 'podstawowy', 10, 'I I I', 1),
  (2026, 'podstawowy', 11, 'I I I', 1),
  (2026, 'podstawowy', 12, 'V', 12),
  (2026, 'rozszerzony', 1, 'II.7 II.2 II.5 II.5 II.5 II.3', 1),
  (2026, 'rozszerzony', 2, 'II.5 II.5 II.5 II.5 II.5', 1),
  (2026, 'rozszerzony', 3, 'II.5 II.5 II.5 II.5', 1),
  (2026, 'rozszerzony', 4, 'III.4 III.4 III.4 III.7 III.1', 1),
  (2026, 'rozszerzony', 5, 'III.5 III.5 III.5 III.5 III.5', 1),
  (2026, 'rozszerzony', 6, 'III.4 III.4 III.4 III.1 III.4 III.4 III.7 III.4', 1),
  (2026, 'rozszerzony', 7, 'I I I I I I', 1),
  (2026, 'rozszerzony', 8, 'I I I I', 1),
  (2026, 'rozszerzony', 9, 'I I I I', 1),
  (2026, 'rozszerzony', 10, 'V', 13)
) as a (rok, level, zadanie, codes, points)
cross join lateral unnest(string_to_array(a.codes, ' ')) with ordinality as r (code, nr)
join private.learning_skills k on r.code = any(k.codes);

-- Średnia liczba punktów w jednym arkuszu, także przed zaimportowaniem PDF-ów.
create function private.cke_learning_weights(p_level text)
returns table (skill_id text, points numeric)
language sql stable set search_path = ''
as $$
  select m.skill_id, sum(m.points)::numeric / (select count(distinct all_m.sheet_id)
                                           from private.cke_learning_map all_m
                                           where all_m.level = p_level) as points
  from private.cke_learning_map m
  where m.level = p_level
  group by m.skill_id;
$$;

-- To samo porównanie pisowni co w sprawdzaniu otwartych zadań z angielskiego.
create function private.cke_learning_normalize(p_text text)
returns text
language sql immutable strict set search_path = ''
as $$
  select btrim(regexp_replace(
    regexp_replace(lower(translate(p_text, U&'\2019\2018\0060\00B4\201C\201D\201E\00A0\202F\FEFF',
                                  $zamiana$''''"""   $zamiana$)),
                   '[[:space:]]+', ' ', 'g'),
    '^["''[:space:]]+|["''.,!?;:[:space:]]+$', '', 'g'));
$$;

-- Klucz z arkusza w bazie jest źródłem oceny. Lista odpowiedzi otwartych
-- CKE jest przykładowa, więc brak dopasowania nie jest porażką.
create function private.cke_learning_score(p_question jsonb, p_answer text)
returns numeric
language plpgsql immutable strict set search_path = ''
as $$
declare
  answer text := regexp_replace(translate(p_answer, U&'\00A0\202F\FEFF', '   '), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  key text := p_question ->> 'poprawna';
begin
  if answer = '' or length(answer) > 4096 then
    return null;
  end if;

  if p_question ->> 'typ' = 'zamkniete' then
    if key is null or key !~ '^[A-HT]$' or answer !~ '^[A-HT]$' then
      return null;
    end if;
    if jsonb_typeof(p_question -> 'litery') = 'array'
       and not ((p_question -> 'litery') ? key and (p_question -> 'litery') ? answer) then
      return null;
    end if;
    return (answer = key)::int;
  end if;
  if (p_question ->> 'typ') is distinct from 'otwarte' then
    return null;
  end if;

  answer := private.cke_learning_normalize(answer);
  if answer = '' then
    return null;
  end if;
  return (
    select max(case when r.field = 'odrzucone' then 0 else 1 end)
    from (values ('oczekiwane'), ('akceptowane'), ('odrzucone')) as r (field)
    cross join lateral jsonb_array_elements(case
      when jsonb_typeof(p_question -> r.field) = 'array' then p_question -> r.field
      else '[]'::jsonb
    end) as v (entry)
    where jsonb_typeof(v.entry) = 'string'
      and private.cke_learning_normalize(v.entry #>> '{}') = answer
  );
end;
$$;

-- W starszym zapisie i przy sprawdzeniu pojedynczych zadań jedyną datą
-- jest aktualizacja postępu. Korekta samooceny nie odmładza pełnej próby.
create function private.cke_learning_date(p_completed text, p_updated timestamptz)
returns timestamptz
language plpgsql stable set search_path = ''
as $$
begin
  if p_completed ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?Z$' then
    return least(p_completed::timestamptz, p_updated, now());
  end if;
  return least(p_updated, now());
exception
  when invalid_datetime_format or datetime_field_overflow then
    return least(p_updated, now());
end;
$$;

create function private.cke_learning_evidence(p_user uuid, p_level text)
returns table (
  skill_id text, source_id text, sheet_id text, question text,
  score numeric, weight numeric, happened_at timestamptz, difficulty numeric
)
language sql stable set search_path = ''
as $$
  with postep as materialized (
    select p.sheet_id, p.data, p.updated_at, s.data -> 'zadania' as zadania
    from public.sheet_progress p
    join public.sheets s on s.id = p.sheet_id
    where p.user_id = p_user and exists (
      select 1 from private.cke_learning_map m
      where m.sheet_id = p.sheet_id and m.level = p_level
    )
  ), oceny as materialized (
    select m.skill_id, m.sheet_id, m.question, m.points,
           private.cke_learning_score(q.pytanie, p.data -> 'odpowiedzi' ->> m.question) as score,
           private.cke_learning_date(p.data #>> '{wynik,kiedy}', p.updated_at) as happened_at,
           case q.pytanie->>'typ' when 'zamkniete' then 950 else 1100 end
             + 40 * (m.points - 1) as difficulty
    from postep p
    cross join lateral jsonb_array_elements(case when jsonb_typeof(p.zadania) = 'array'
      then p.zadania else '[]'::jsonb end) as z (zadanie)
    cross join lateral jsonb_array_elements(case when jsonb_typeof(z.zadanie -> 'pytania') = 'array'
      then z.zadanie -> 'pytania' else '[]'::jsonb end) as q (pytanie)
    join private.cke_learning_map m
      on m.sheet_id = p.sheet_id and m.level = p_level and m.question = q.pytanie ->> 'nr'
    where (p.data -> 'sprawdzony' = 'true'::jsonb
       or (jsonb_typeof(p.data -> 'sprawdzoneZadania') = 'array'
           and (p.data -> 'sprawdzoneZadania') @> jsonb_build_array(z.zadanie -> 'nr')))
      and jsonb_typeof(p.data -> 'odpowiedzi' -> m.question) = 'string'
  )
  select o.skill_id, concat(o.sheet_id, ':', o.question), o.sheet_id, o.question,
         o.score, o.points::numeric, o.happened_at, o.difficulty::numeric
  from oceny o
  where o.score is not null;
$$;

revoke all on private.learning_skills, private.cke_learning_map from public, anon, authenticated;
revoke all on function private.cke_learning_weights(text),
  private.cke_learning_normalize(text), private.cke_learning_score(jsonb, text),
  private.cke_learning_date(text, timestamptz), private.cke_learning_evidence(uuid, text)
  from public, anon, authenticated;
