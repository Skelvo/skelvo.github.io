#!/usr/bin/env bash
# Installe (ou met à jour) le serveur du tracker sur un VPS Ubuntu/Debian neuf.
#
#   curl -fsSL https://raw.githubusercontent.com/Skelvo/skelvo.github.io/claude/gps-tracker-moto-4fh2jq/deploy/install.sh | sudo bash -s moto.mondomaine.fr
#
# Ce que ça fait : Node.js 22, le serveur en service (redémarre tout seul), Caddy pour le
# HTTPS automatique, puis affiche les deux clés. Relancer la même commande = mise à jour.
set -euo pipefail

DOMAIN="${1:-}"
REPO="https://github.com/Skelvo/skelvo.github.io.git"
BRANCH="claude/gps-tracker-moto-4fh2jq"
APP_DIR="/opt/moto-tracker"
DATA_DIR="/var/lib/moto-tracker"

if [ -z "$DOMAIN" ]; then
  echo "Usage : install.sh <nom de domaine>   (ex. moto.mondomaine.fr ou mamoto.duckdns.org)" >&2
  exit 1
fi
if [ "$(id -u)" -ne 0 ]; then
  echo "À lancer avec sudo." >&2
  exit 1
fi

step() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
export DEBIAN_FRONTEND=noninteractive

step "Paquets de base"
apt-get update -qq
apt-get install -y -qq ca-certificates curl git gnupg debian-keyring debian-archive-keyring apt-transport-https >/dev/null

step "Node.js 22"
if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)' 2>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node -v

step "Caddy (HTTPS automatique)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy >/dev/null
fi

step "Code du serveur"
id moto >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin moto
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch -q --depth 1 origin "$BRANCH"
  git -C "$APP_DIR" reset -q --hard FETCH_HEAD
else
  git clone -q --depth 1 -b "$BRANCH" "$REPO" "$APP_DIR"
fi
(cd "$APP_DIR/server" && npm ci --omit=dev --no-audit --no-fund --loglevel=error)
mkdir -p "$DATA_DIR"
chown -R moto:moto "$APP_DIR" "$DATA_DIR"
chmod 700 "$DATA_DIR"

step "Service moto-tracker"
cat > /etc/systemd/system/moto-tracker.service <<UNIT
[Unit]
Description=Tracker GPS moto
After=network-online.target
Wants=network-online.target

[Service]
User=moto
WorkingDirectory=$APP_DIR/server
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DB_PATH=$DATA_DIR/tracker.db
Environment=VAPID_SUBJECT=https://$DOMAIN
ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning src/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable -q moto-tracker
systemctl restart moto-tracker

step "Caddy : https://$DOMAIN (page web) + http://$DOMAIN (tracker)"
cat > /etc/caddy/Caddyfile <<CADDY
# Page web en HTTPS (certificat automatique)
$DOMAIN {
	encode gzip
	reverse_proxy localhost:3000
}

# Le tracker envoie en HTTP simple pour économiser la data de la SIM
http://$DOMAIN {
	reverse_proxy localhost:3000
}
CADDY
systemctl reload caddy || systemctl restart caddy

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
fi

sleep 2
if ! systemctl is-active -q moto-tracker; then
  echo "Le service n'a pas démarré. Journal :" >&2
  journalctl -u moto-tracker -n 30 --no-pager >&2
  exit 1
fi

KEYS=$(cd "$APP_DIR/server" && sudo -u moto env DB_PATH="$DATA_DIR/tracker.db" node --no-warnings src/keys.js)
cat <<DONE

$(printf '\033[1;32m')✔ Installation terminée$(printf '\033[0m')

  App (à ouvrir sur ton téléphone) : https://$DOMAIN
$KEYS
Dans firmware/include/secrets.h :
  #define CFG_SERVER_HOST "$DOMAIN"
  #define CFG_SERVER_PORT 80

Commandes utiles :
  journalctl -u moto-tracker -f     voir ce que reçoit le serveur
  (relancer la commande d'installation pour mettre à jour)
DONE
