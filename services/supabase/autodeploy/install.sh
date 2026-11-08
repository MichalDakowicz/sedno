#!/usr/bin/env bash
# Instaluje na serwerze automatyczne wgrywanie z main (timer co 2 minuty, usługa użytkownika systemd).
# Użycie: services/supabase/autodeploy/install.sh  (z katalogu głównego repo, potrzebny dostęp ssh)
# Pierwsze uruchomienie zapisuje stan main bez wgrywania.
set -euo pipefail

HOST="${SEDNO_SSH:-michu@192.168.100.6}"
DIR="$(cd "$(dirname "$0")" && pwd)"

ssh "$HOST" 'mkdir -p ~/supabase-hosting/sedno-autodeploy ~/.config/systemd/user'
ssh "$HOST" 'cat > ~/supabase-hosting/sedno-autodeploy/sedno-autodeploy.sh && chmod +x ~/supabase-hosting/sedno-autodeploy/sedno-autodeploy.sh' <"$DIR/sedno-autodeploy.sh"
ssh "$HOST" bash <<'EOF'
set -euo pipefail
cat > ~/.config/systemd/user/sedno-autodeploy.service <<'UNIT'
[Unit]
Description=Wgraj migracje i Edge Functions Sedno z main

[Service]
Type=oneshot
ExecStart=%h/supabase-hosting/sedno-autodeploy/sedno-autodeploy.sh
UNIT
cat > ~/.config/systemd/user/sedno-autodeploy.timer <<'UNIT'
[Unit]
Description=Sprawdzaj main Sedno co 2 minuty

[Timer]
OnBootSec=2min
OnUnitActiveSec=2min

[Install]
WantedBy=timers.target
UNIT
if [ ! -f ~/supabase-hosting/sedno-autodeploy/sha ]; then
  ~/supabase-hosting/sedno-autodeploy/sedno-autodeploy.sh --init
fi
systemctl --user daemon-reload
systemctl --user enable --now sedno-autodeploy.timer
EOF
echo "gotowe"
