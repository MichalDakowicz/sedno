#!/usr/bin/env bash
# Wgrywa migracje i Edge Functions na serwer z Supabase Sedno.
# Użycie: services/supabase/deploy.sh  (z katalogu głównego repo, potrzebny dostęp ssh)
set -euo pipefail

HOST="${SEDNO_SSH:-michu@192.168.100.6}"
PROJECT='~/supabase-hosting/projects/sedno'
DIR="$(cd "$(dirname "$0")" && pwd)"

# Migracje: każda jeden raz, w kolejności nazw, zapisane w private.schema_migrations.
ssh "$HOST" "docker exec -i sb-sedno-db psql -U postgres -v ON_ERROR_STOP=1 -q" <<'SQL'
create schema if not exists private;
create table if not exists private.schema_migrations (name text primary key, applied_at timestamptz not null default now());
SQL
for f in "$DIR"/migrations/*.sql; do
  name="$(basename "$f")"
  done_already="$(ssh "$HOST" "docker exec sb-sedno-db psql -U postgres -At -c \"select 1 from private.schema_migrations where name = '$name'\"")"
  if [ "$done_already" = "1" ]; then continue; fi
  echo "migracja $name"
  { echo "begin;"; cat "$f"; echo "insert into private.schema_migrations (name) values ('$name');"; echo "commit;"; } |
    ssh "$HOST" "docker exec -i sb-sedno-db psql -U postgres -v ON_ERROR_STOP=1 -q"
done

# Najpierw rozpakuj cały transfer, żeby zerwane połączenie nie usunęło działającej funkcji.
tar -C "$DIR/functions" -cf - . |
  ssh "$HOST" "set -eu
cd $PROJECT/volumes/functions
tmp=\$(mktemp -d .sedno-functions.XXXXXX)
trap 'rm -rf -- \"\$tmp\"' EXIT
tar -xf - -C \"\$tmp\"
for d in \"\$tmp\"/*/; do
  [ -d \"\$d\" ] || continue
  name=\$(basename \"\$d\")
  case \"\$name\" in main | hello) continue ;; esac
  rm -rf -- \"\$name\"
  mv -- \"\$d\" \"\$name\"
done
cd $PROJECT
docker compose restart functions >/dev/null"
echo "gotowe"
