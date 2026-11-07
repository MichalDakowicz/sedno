-- Arkusze CKE w bazie zamiast plików na hostingu: widzą je tylko zalogowani.
-- Wgrywa je `npm run wgraj` (services/arkusze) z data/arkusze po imporcie.

create table public.sheets (
  id text primary key check (id ~ '^[a-z0-9._-]{1,120}$'),
  position int not null,
  entry jsonb not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index sheets_position on public.sheets (position);

alter table public.sheets enable row level security;

create policy "arkusze: odczyt dla zalogowanych" on public.sheets
  for select to authenticated using (true);

revoke all on public.sheets from anon, authenticated;
grant select on public.sheets to authenticated;

-- Onboarding przechodzi się raz na konto, nie raz na przeglądarkę.
alter table public.profiles add column onboarded_at timestamptz;
grant update (onboarded_at) on public.profiles to authenticated;
