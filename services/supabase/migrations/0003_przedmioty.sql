-- Przedmioty, które konto zdaje na maturze: [{ "id": "angielski", "poziom": "rozszerzony" }, ...].
-- Pulpit, Pestka i lista arkuszy biorą je stąd zamiast z danych przykładowych.

alter table public.profiles
  add column subjects jsonb not null default '[]'::jsonb
  check (jsonb_typeof(subjects) = 'array' and jsonb_array_length(subjects) <= 12);

grant update (subjects) on public.profiles to authenticated;
