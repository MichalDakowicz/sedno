-- Ustawienia aplikacji zapisane na koncie: motyw, rozmiar tekstu, dostępność i zachowanie Pestki.
-- Obiekt z kluczami, które zna klient; brakujące klucze to wartości domyślne.

alter table public.profiles
  add column settings jsonb not null default '{}'::jsonb
  check (jsonb_typeof(settings) = 'object' and pg_column_size(settings) <= 4096);

grant update (settings) on public.profiles to authenticated;
