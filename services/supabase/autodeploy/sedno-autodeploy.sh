#!/usr/bin/env bash
# Działa na serwerze (timer systemd): gdy na gałęzi zmieni się services/supabase, wgrywa migracje i
# Edge Functions do jej projektu: main → sedno (produkcja), dev → sedno-dev (staging).
# Bez klonu repo: pobiera tarball commita z GitHuba. Robi to samo co deploy.sh, tylko lokalnie,
# więc przy zmianie sposobu wgrywania popraw oba pliki.
# Użycie: sedno-autodeploy.sh main|dev [--init]  (--init zapisuje stan gałęzi bez wgrywania)
set -euo pipefail

REPO="MichalDakowicz/sedno"
case "${1:-}" in
  main) TARGET=sedno ;;
  dev) TARGET=sedno-dev ;;
  *) echo "użycie: $0 main|dev [--init]" >&2; exit 2 ;;
esac
REF="${SEDNO_REF:-$1}"
shift
PROJECT="$HOME/supabase-hosting/projects/$TARGET"
STATE="$HOME/supabase-hosting/sedno-autodeploy/$TARGET"
DB="sb-$TARGET-db"

mkdir -p "$STATE"
exec 9>"$STATE/lock"
flock -n 9 || exit 0

sha="$(git ls-remote "https://github.com/$REPO.git" refs/heads/$REF | cut -f1)"
[ -n "$sha" ] || { echo "nie udało się odczytać $REF" >&2; exit 1; }
[ "$sha" = "$(cat "$STATE/sha" 2>/dev/null || true)" ] && exit 0

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$sha" |
  tar -xz -C "$tmp" --strip-components=3 --wildcards '*/services/supabase/migrations' '*/services/supabase/functions'

# Commity bez zmian w services/supabase (dokumenty, aplikacja web) nie restartują funkcji.
hash="$(cd "$tmp" && find migrations functions -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
if [ "$hash" = "$(cat "$STATE/hash" 2>/dev/null || true)" ] || [ "${1:-}" = "--init" ]; then
  echo "$hash" >"$STATE/hash"
  echo "$sha" >"$STATE/sha"
  echo "$TARGET ← $REF $sha: bez zmian do wgrania"
  exit 0
fi

echo "wgrywam $TARGET ← $REF $sha"
psql() { docker exec -i "$DB" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
psql <<'SQL'
create schema if not exists private;
create table if not exists private.schema_migrations (name text primary key, applied_at timestamptz not null default now());
SQL
for f in "$tmp"/migrations/*.sql; do
  [ -e "$f" ] || continue
  name="$(basename "$f")"
  if [ "$(docker exec "$DB" psql -U postgres -At -c "select 1 from private.schema_migrations where name = '$name'")" = "1" ]; then continue; fi
  echo "migracja $name"
  { echo "begin;"; cat "$f"; echo "insert into private.schema_migrations (name) values ('$name');"; echo "commit;"; } | psql
done

# main i hello zostają z obrazu Supabase; reszta katalogów funkcji pochodzi z repo.
for d in "$tmp"/functions/*/; do
  name="$(basename "$d")"
  case "$name" in main | hello) continue ;; esac
  rm -rf "$PROJECT/volumes/functions/$name"
  cp -r "$d" "$PROJECT/volumes/functions/$name"
done
(cd "$PROJECT" && docker compose restart functions >/dev/null)

echo "$hash" >"$STATE/hash"
echo "$sha" >"$STATE/sha"
echo "gotowe: $TARGET ← $REF $sha"
