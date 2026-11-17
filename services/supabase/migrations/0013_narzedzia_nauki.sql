-- Prywatne notatki. Odwołanie do źródła służy do nawigacji; dostęp do samego
-- źródła nadal sprawdza jego API.
create table public.knowledge_nodes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  subject text not null check (subject in ('polski', 'matematyka', 'angielski', 'informatyka')),
  title text not null check (title ~ '[^[:space:]]' and length(title) <= 120),
  body text not null default '' check (length(body) <= 8000),
  skill_id text references private.learning_skills (id) on delete set null,
  source text not null default 'manual',
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, subject, id),
  check (skill_id is null or subject = 'angielski'),
  check (case source
    when 'manual' then source_ref is null
    when 'sheet' then coalesce(source_ref ~ '^[a-z0-9._-]{1,120}(#[0-9]+(\.[0-9]+)?)?$', false)
      and length(source_ref) <= 140
    when 'session' then coalesce(source_ref ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', false)
    when 'chat' then coalesce(source_ref ~ '^[a-z0-9]{1,40}$', false)
    else false
  end)
);

alter table public.knowledge_nodes enable row level security;
create policy "notatki: własne" on public.knowledge_nodes
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.knowledge_nodes from public, anon, authenticated, service_role;
grant select, delete on public.knowledge_nodes to authenticated;
grant insert (id, subject, title, body, skill_id, source, source_ref) on public.knowledge_nodes to authenticated;
grant update (title, body, skill_id, source, source_ref) on public.knowledge_nodes to authenticated;
grant select on public.knowledge_nodes to service_role;

create trigger touch before update on public.knowledge_nodes
  for each row execute function private.touch_updated_at();

-- Nieskierowana krawędź ma jeden klucz niezależnie od kolejności końców.
-- Klucze obce wiążą oba końce z tym samym kontem i przedmiotem.
create table public.knowledge_edges (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject text not null,
  first_id uuid not null,
  second_id uuid not null,
  label text not null default '' check (length(label) <= 160),
  origin text not null default 'manual' check (origin in ('manual', 'pestka')),
  status text not null default 'accepted' check (status in ('proposed', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, subject, first_id, second_id),
  foreign key (user_id, subject, first_id) references public.knowledge_nodes (user_id, subject, id) on delete cascade,
  foreign key (user_id, subject, second_id) references public.knowledge_nodes (user_id, subject, id) on delete cascade,
  check (first_id < second_id),
  check (origin = 'pestka' or status = 'accepted')
);

create index knowledge_edges_second on public.knowledge_edges (user_id, subject, second_id);

alter table public.knowledge_edges enable row level security;
create policy "połączenia: odczyt własnych" on public.knowledge_edges
  for select to authenticated using (user_id = (select auth.uid()));
create policy "połączenia: dodanie własnych ręcznych" on public.knowledge_edges
  for insert to authenticated
  with check (user_id = (select auth.uid()) and origin = 'manual' and status = 'accepted');
create policy "połączenia: akceptacja lub edycja własnych" on public.knowledge_edges
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status = 'accepted');
create policy "połączenia: usunięcie własnych" on public.knowledge_edges
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.knowledge_edges from public, anon, authenticated, service_role;
grant select, delete on public.knowledge_edges to authenticated;
grant insert (subject, first_id, second_id, label) on public.knowledge_edges to authenticated;
grant update (label, status) on public.knowledge_edges to authenticated;
grant select on public.knowledge_edges to service_role;
grant insert (user_id, subject, first_id, second_id, label, origin, status) on public.knowledge_edges to service_role;

-- Blokada konta pilnuje limitów również przy równoczesnych zapisach z kilku kart.
create function private.prepare_knowledge_insert() returns trigger
language plpgsql set search_path = '' as $$
declare
  tmp uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 47117));
  if tg_table_name = 'knowledge_nodes' then
    if not exists (select from public.knowledge_nodes where user_id = new.user_id and id = new.id)
       and (select count(*) from public.knowledge_nodes where user_id = new.user_id) >= 250 then
      raise exception using errcode = '23514', message = 'knowledge_node_limit';
    end if;
  else
    if new.origin = 'pestka' and new.status <> 'proposed' then
      raise exception using errcode = '23514', message = 'knowledge_edge_requires_review';
    end if;
    if new.first_id > new.second_id then
      tmp := new.first_id;
      new.first_id := new.second_id;
      new.second_id := tmp;
    end if;
    if not exists (
      select from public.knowledge_edges
      where user_id = new.user_id and subject = new.subject and first_id = new.first_id and second_id = new.second_id
    ) and (select count(*) from public.knowledge_edges where user_id = new.user_id) >= 1000 then
      raise exception using errcode = '23514', message = 'knowledge_edge_limit';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.prepare_knowledge_insert() from public, anon, authenticated;
create trigger prepare_insert before insert on public.knowledge_nodes
  for each row execute function private.prepare_knowledge_insert();
create trigger prepare_insert before insert on public.knowledge_edges
  for each row execute function private.prepare_knowledge_insert();
create trigger touch before update on public.knowledge_edges
  for each row execute function private.touch_updated_at();

-- Komunikat dyrektora CKE z 20 sierpnia 2026, s. 4–5. Część pisemna, termin główny.
create table public.exam_schedule (
  exam_year int not null,
  subject text not null,
  level text not null check (level in ('podstawowy', 'rozszerzony', 'dwujezyczny')),
  starts_at timestamptz not null,
  source_url text not null,
  primary key (exam_year, subject, level),
  check (exam_year = extract(year from starts_at at time zone 'Europe/Warsaw'))
);

insert into public.exam_schedule (exam_year, subject, level, starts_at, source_url)
select 2027, subject, level, (exam_date + time '09:00') at time zone 'Europe/Warsaw',
  'https://bip.cke.gov.pl/attachments/download/10422'
from (values
  ('polski', 'podstawowy', date '2027-05-04'),
  ('polski', 'rozszerzony', date '2027-05-20'),
  ('matematyka', 'podstawowy', date '2027-05-05'),
  ('matematyka', 'rozszerzony', date '2027-05-11'),
  ('angielski', 'podstawowy', date '2027-05-06'),
  ('angielski', 'rozszerzony', date '2027-05-07'),
  ('angielski', 'dwujezyczny', date '2027-05-07'),
  ('informatyka', 'rozszerzony', date '2027-05-17')
) as terminy (subject, level, exam_date);

alter table public.exam_schedule enable row level security;
create policy "terminy matur: odczyt dla zalogowanych" on public.exam_schedule
  for select to authenticated using (true);
revoke all on public.exam_schedule from public, anon, authenticated;
grant select on public.exam_schedule to authenticated;
