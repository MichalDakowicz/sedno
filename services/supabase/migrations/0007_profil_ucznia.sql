-- Profil ucznia na koncie: sposób nauki, czas dziennie, cele z przedmiotów, priorytety i ukryte wnioski.
-- Obiekt z kluczami, które zna klient; brakujące klucze to brak odpowiedzi. Wszystko dobrowolne i do usunięcia przez ucznia.
-- RLS bez zmian: profiles dopuszcza odczyt i zapis tylko właścicielowi wiersza (auth.uid() = id).

alter table public.profiles
  add column learning jsonb not null default '{}'::jsonb
  check (jsonb_typeof(learning) = 'object' and pg_column_size(learning) <= 8192);

grant update (learning) on public.profiles to authenticated;
