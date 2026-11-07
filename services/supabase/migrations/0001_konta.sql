-- Konta, zapis postępu i bramka AI per konto.
-- Klucze AI są przypisane do konta, nie do aplikacji: każdy użytkownik ma własne
-- dostawców (OpenAI, Ollama...) i sam decyduje, który obsługuje ważne, a który lekkie zadania.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Profil ----------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (length(display_name) <= 80),
  avatar_url text check (length(avatar_url) <= 500),
  -- Dostęp do Ollamy na serwerze nadaje tylko administrator (SQL), nie użytkownik.
  server_ollama boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profil: odczyt własnego" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profil: zmiana własnego" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), 80),
    left(new.raw_user_meta_data ->> 'avatar_url', 500)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Postęp w arkuszach -----------------------------------------------------------

create table public.sheet_progress (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  sheet_id text not null check (sheet_id ~ '^[a-z0-9._-]{1,120}$'),
  data jsonb not null check (pg_column_size(data) <= 1048576),
  updated_at timestamptz not null default now(),
  primary key (user_id, sheet_id)
);

alter table public.sheet_progress enable row level security;

create policy "postęp: własny" on public.sheet_progress
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.sheet_progress from anon, authenticated;
grant select, insert, update, delete on public.sheet_progress to authenticated;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch before update on public.sheet_progress
  for each row execute function private.touch_updated_at();
create trigger touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- Klucze AI (per konto) --------------------------------------------------------
-- Klucz jest szyfrowany w Edge Function (AES-GCM); aplikacja nigdy nie widzi key_cipher.

create table public.ai_credential (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider ~ '^[a-z0-9_-]{1,32}$'),
  base_url text not null check (base_url ~ '^https?://' and length(base_url) <= 300),
  model text not null check (length(model) between 1 and 100),
  key_cipher text not null check (length(key_cipher) <= 4096),
  key_last4 text not null check (length(key_last4) <= 4),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.ai_credential enable row level security;

create policy "klucze: odczyt własnych" on public.ai_credential
  for select to authenticated using (user_id = (select auth.uid()));
create policy "klucze: usuwanie własnych" on public.ai_credential
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.ai_credential from anon, authenticated;
-- Bez key_cipher: zapis idzie wyłącznie przez funkcję ai-klucz.
grant select (user_id, provider, base_url, model, key_last4, updated_at) on public.ai_credential to authenticated;
grant delete on public.ai_credential to authenticated;

-- Który dostawca obsługuje który poziom zadań (ważne / lekkie).
create table public.ai_routing (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  tier text not null check (tier in ('wazne', 'lekkie')),
  provider text not null,
  model text check (length(model) between 1 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, tier),
  foreign key (user_id, provider) references public.ai_credential (user_id, provider) on delete cascade
);

create index ai_routing_credential on public.ai_routing (user_id, provider);

alter table public.ai_routing enable row level security;

create policy "routing: własny" on public.ai_routing
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.ai_routing from anon, authenticated;
grant select, insert, update, delete on public.ai_routing to authenticated;

create trigger touch before update on public.ai_routing
  for each row execute function private.touch_updated_at();

-- Zużycie: skala porównania między dostawcami i poziomami.
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  tier text not null,
  task text check (length(task) <= 60),
  provider text not null,
  model text not null,
  ok boolean not null,
  status int,
  prompt_tokens int,
  completion_tokens int,
  duration_ms int not null,
  created_at timestamptz not null default now()
);

create index ai_usage_user_time on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

create policy "zużycie: odczyt własnego" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;

-- Limit zapytań (okno przesuwne w kubełkach) ------------------------------------

create table private.rate_token (
  user_id uuid not null,
  bucket text not null,
  window_start timestamptz not null,
  used int not null,
  primary key (user_id, bucket)
);

create function public.take_rate_token(p_user uuid, p_bucket text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  ok boolean;
begin
  insert into private.rate_token as r (user_id, bucket, window_start, used)
  values (p_user, p_bucket, now(), 1)
  on conflict (user_id, bucket) do update
    set used = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.used + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning used <= p_limit into ok;
  return ok;
end;
$$;

revoke all on function public.take_rate_token(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.take_rate_token(uuid, text, int, int) to service_role;
