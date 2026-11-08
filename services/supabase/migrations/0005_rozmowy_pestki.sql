-- Ogólne rozmowy z Pestką (czat poza arkuszami) na koncie zamiast tylko w przeglądarce.
-- Rozmowy przy omawianiu błędów zostają w postępie arkusza (sheet_progress).

create table public.tutor_chats (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  id text not null check (id ~ '^[a-z0-9]{1,40}$'),
  title text not null check (length(title) between 1 and 120),
  messages jsonb not null check (jsonb_typeof(messages) = 'array' and pg_column_size(messages) <= 262144),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index tutor_chats_recent on public.tutor_chats (user_id, updated_at desc);

alter table public.tutor_chats enable row level security;

create policy "rozmowy: własne" on public.tutor_chats
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.tutor_chats from anon, authenticated;
grant select, insert, update, delete on public.tutor_chats to authenticated;

create trigger touch before update on public.tutor_chats
  for each row execute function private.touch_updated_at();
