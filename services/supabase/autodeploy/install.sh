#!/usr/bin/env bash
# Instaluje na serwerze automatyczne wgrywanie: main → sedno, dev → sedno-dev (timery co 2 minuty,
# usługi użytkownika systemd).
# Użycie: services/supabase/autodeploy/install.sh  (z katalogu głównego repo, potrzebny dostęp ssh)
set -euo pipefail

HOST="${SEDNO_SSH:-michu@192.168.100.6}"
DIR="$(cd "$(dirname "$0")" && pwd)"

ssh "$HOST" 'mkdir -p ~/supabase-hosting/sedno-autodeploy ~/.config/systemd/user'
ssh "$HOST" 'cat > ~/supabase-hosting/sedno-autodeploy/sedno-autodeploy.sh && chmod +x ~/supabase-hosting/sedno-autodeploy/sedno-autodeploy.sh' <"$DIR/sedno-autodeploy.sh"
ssh "$HOST" bash <<'EOF'
set -euo pipefail
S=~/supabase-hosting/sedno-autodeploy
U=~/.config/systemd/user

# Pierwsza wersja miała jeden timer tylko dla main i stan bezpośrednio w $S.
if [ -f $U/sedno-autodeploy.timer ]; then
  systemctl --user disable --now sedno-autodeploy.timer
  rm -f $U/sedno-autodeploy.timer $U/sedno-autodeploy.service
fi
if [ -f $S/sha ]; then
  mkdir -p $S/sedno
  mv $S/sha $S/hash $S/sedno/
fi

cat > $U/sedno-autodeploy@.service <<'UNIT'
[Unit]
Description=Wgraj migracje i Edge Functions Sedno z gałęzi %i

[Service]
Type=oneshot
ExecStart=%h/supabase-hosting/sedno-autodeploy/sedno-autodeploy.sh %i
UNIT
cat > $U/sedno-autodeploy@.timer <<'UNIT'
[Unit]
Description=Sprawdzaj gałąź %i Sedno co 2 minuty

[Timer]
OnBootSec=2min
OnUnitActiveSec=2min

[Install]
WantedBy=timers.target
UNIT
systemctl --user daemon-reload
# Produkcja już działa, więc zapisujemy jej stan. Staging startuje pusty: pierwsze uruchomienie wgrywa wszystko.
[ -f $S/sedno/sha ] || $S/sedno-autodeploy.sh main --init
for b in main dev; do
  systemctl --user enable --now sedno-autodeploy@$b.timer
done
EOF
echo "gotowe"
