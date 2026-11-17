-- Zadania wygenerowane i wyniki sprawdzania są dostępne tylko przez funkcję Edge.
-- Klucz oraz skrót zgłoszenia są prywatne, także dla właściciela rekordu.
create table private.generated_exercises (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  template text not null,
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  task jsonb not null,
  answer_key jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, template, fingerprint)
);

create table private.solution_grades (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  lease uuid not null,
  started_at timestamptz not null default now(),
  result jsonb,
  primary key (user_id, id)
);

alter table private.generated_exercises enable row level security;
alter table private.solution_grades enable row level security;
revoke all on private.generated_exercises, private.solution_grades from public, anon, authenticated;

create function public.nauka_pobierz_wariant(p_user uuid, p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('szablon', v.template, 'zadanie', v.task, 'klucz', v.answer_key)
  from private.generated_exercises v where (v.user_id, v.id) = (p_user, p_id)
$$;

create function public.nauka_zapisz_wariant(p_user uuid, p_id uuid, p_szablon text, p_skrot text, p_zadanie jsonb, p_klucz jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  insert into private.generated_exercises (user_id, id, template, fingerprint, task, answer_key)
  values (p_user, p_id, p_szablon, p_skrot, p_zadanie, p_klucz)
  on conflict do nothing;
  return public.nauka_pobierz_wariant(p_user, p_id);
end
$$;

create function public.nauka_zajmij_ocene(p_user uuid, p_id uuid, p_skrot text, p_lease uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  ocena private.solution_grades%rowtype;
begin
  insert into private.solution_grades (user_id, id, fingerprint, lease)
  values (p_user, p_id, p_skrot, p_lease)
  on conflict (user_id, id) do nothing;
  select * into strict ocena from private.solution_grades
    where (user_id, id) = (p_user, p_id) for update;
  if ocena.fingerprint <> p_skrot then
    return '{"stan":"konflikt"}'::jsonb;
  end if;
  if ocena.result is not null then
    return jsonb_build_object('stan', 'gotowe', 'wynik', ocena.result);
  end if;
  if ocena.lease = p_lease then
    return '{"stan":"zajete"}'::jsonb;
  end if;
  if ocena.started_at > now() - interval '2 minutes' then
    return '{"stan":"w-toku"}'::jsonb;
  end if;
  update private.solution_grades set started_at = now(), lease = p_lease where (user_id, id) = (p_user, p_id);
  return '{"stan":"zajete"}'::jsonb;
end
$$;

create function public.nauka_zakoncz_ocene(p_user uuid, p_id uuid, p_lease uuid, p_wynik jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_wynik is null then
    delete from private.solution_grades
    where (user_id, id, lease) = (p_user, p_id, p_lease) and result is null;
  else
    update private.solution_grades set result = p_wynik
    where (user_id, id, lease) = (p_user, p_id, p_lease) and result is null;
  end if;
  return found;
end
$$;

create function public.nauka_pytanie_do_oceny(p_arkusz text, p_pytanie text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'przedmiot', coalesce(s.data->>'przedmiot', s.entry->>'przedmiot'),
    'zadanie', z->'nr', 'polecenie', z->'polecenie', 'pytanie', p,
    'pdf', s.data->'pdf'->>'zasady',
    'kontekst', (
      select coalesce(jsonb_agg(
        case b->>'typ'
          when 'wzor' then left(b->>'tex', 2000)
          when 'tabelaTresci' then left((b->'wiersze')::text, 2000)
          when 'pytanie' then '[pytanie ' || (b->>'nr') || ']'
          else left(b->>'tekst', 2000)
        end order by lp), '[]'::jsonb)
      from jsonb_array_elements(coalesce(z->'bloki', '[]'::jsonb)) with ordinality as bloki(b, lp)
      where b->>'typ' in ('akapit', 'naglowek', 'kadr', 'kod', 'wzor', 'tabelaTresci', 'pytanie')
    )
  )
  from public.sheets s
  cross join lateral jsonb_array_elements(s.data->'zadania') z
  cross join lateral jsonb_array_elements(z->'pytania') p
  where s.id = p_arkusz and p->>'nr' = p_pytanie
  limit 1
$$;

revoke all on function public.nauka_pobierz_wariant(uuid, uuid),
  public.nauka_zapisz_wariant(uuid, uuid, text, text, jsonb, jsonb),
  public.nauka_zajmij_ocene(uuid, uuid, text, uuid),
  public.nauka_zakoncz_ocene(uuid, uuid, uuid, jsonb),
  public.nauka_pytanie_do_oceny(text, text) from public, anon, authenticated;

grant execute on function public.nauka_pobierz_wariant(uuid, uuid),
  public.nauka_zapisz_wariant(uuid, uuid, text, text, jsonb, jsonb),
  public.nauka_zajmij_ocene(uuid, uuid, text, uuid),
  public.nauka_zakoncz_ocene(uuid, uuid, uuid, jsonb),
  public.nauka_pytanie_do_oceny(text, text) to service_role;
