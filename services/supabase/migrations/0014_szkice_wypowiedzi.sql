-- Szkic wypowiedzi w formacie Krok po kroku. Oddanie zamraża wersję przeznaczoną do omówienia.
create table public.writing_drafts (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  level text not null check (level in ('podstawowy', 'rozszerzony', 'dwujezyczny')),
  form text not null check (form in ('email', 'wpis', 'rozprawka', 'artykul', 'list-formalny')),
  prompt text not null check (length(btrim(prompt)) between 1 and 3500),
  stage text not null default 'plan' check (stage in ('plan', 'wstep', 'rozwiniecie', 'zakonczenie', 'przeglad')),
  sections jsonb not null default '{}',
  revision int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  primary key (user_id, id)
);

create index writing_drafts_recent on public.writing_drafts (user_id, updated_at desc);

create function private.check_writing_draft() returns trigger
language plpgsql set search_path = '' as $$
begin
  if jsonb_typeof(new.sections) <> 'object' or length(new.sections::text) > 18000 then
    raise sqlstate 'PT400' using message = 'invalid_draft';
  end if;
  if exists (
    select 1 from jsonb_each(new.sections) p
    where p.key not in ('plan', 'wstep', 'rozwiniecie', 'zakonczenie')
      or jsonb_typeof(p.value) <> 'string' or length(p.value #>> '{}') > 8500
  ) then
    raise sqlstate 'PT400' using message = 'invalid_draft';
  end if;
  if tg_op = 'UPDATE' then
    if old.submitted_at is not null then
      raise sqlstate 'PT409' using message = 'draft_submitted';
    end if;
    new.revision := old.revision + 1;
    new.updated_at := clock_timestamp();
  end if;
  return new;
end;
$$;

create trigger validate before insert or update on public.writing_drafts
  for each row execute function private.check_writing_draft();

alter table public.writing_drafts enable row level security;
create policy "szkice: odczyt własnych" on public.writing_drafts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "szkice: dodawanie własnych" on public.writing_drafts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "szkice: zmiana własnych" on public.writing_drafts
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "szkice: usuwanie własnych" on public.writing_drafts
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.writing_drafts from public, anon, authenticated;
grant select, delete on public.writing_drafts to authenticated;
grant insert (id, level, form, prompt, stage, sections) on public.writing_drafts to authenticated;
grant update (stage, sections) on public.writing_drafts to authenticated;

create function public.nauka_oddaj_szkic(p_draft uuid, p_revision int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := private.learning_user();
  d public.writing_drafts%rowtype;
begin
  select * into d from public.writing_drafts where (user_id, id) = (u, p_draft) for update;
  if not found then
    raise sqlstate 'PT404' using message = 'draft_not_found';
  end if;
  if d.submitted_at is not null and p_revision = d.revision - 1 then
    return to_jsonb(d) - 'user_id';
  end if;
  if d.submitted_at is not null or d.revision is distinct from p_revision then
    raise sqlstate 'PT409' using message = 'draft_changed';
  end if;
  if d.stage <> 'przeglad' or coalesce(d.sections->>'rozwiniecie', '') !~ '[^[:space:]]' then
    raise sqlstate 'PT400' using message = 'draft_not_ready';
  end if;

  update public.writing_drafts set submitted_at = clock_timestamp()
    where (user_id, id) = (u, p_draft) returning * into d;
  return to_jsonb(d) - 'user_id';
end;
$$;

revoke all on function private.check_writing_draft(), public.nauka_oddaj_szkic(uuid, int)
  from public, anon, authenticated;
grant execute on function public.nauka_oddaj_szkic(uuid, int) to authenticated;
