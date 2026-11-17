-- Układ pulpitu na koncie: które widgety są włączone i w jakiej kolejności, osobno dla „Wszystkie” i każdego przedmiotu.
-- Obiekt z kluczami, które zna klient (id przedmiotu albo „wszystkie”); brak klucza to układ domyślny „Nauka”.
-- RLS bez zmian: profiles dopuszcza odczyt i zapis tylko właścicielowi wiersza (auth.uid() = id).

alter table public.profiles
  add column dashboard jsonb not null default '{}'::jsonb
  check (jsonb_typeof(dashboard) = 'object' and pg_column_size(dashboard) <= 8192);

grant update (dashboard) on public.profiles to authenticated;
