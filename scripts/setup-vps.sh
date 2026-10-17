#!/usr/bin/env bash
#
# Cairn — production VPS bootstrap (Ubuntu / Debian).
#
# Run once as root on a fresh server:
#     DOMAIN=cairn.example.com bash setup-vps.sh
#
# Optional overrides: CAIRN_USER, APP_DIR, APP_PORT, SSH_PORT, BACKUP_KEEP,
# CAIRN_REF, CAIRN_IMAGE.
#
# It installs the base packages, Docker, a non-root admin user, the firewall /
# fail2ban / unattended-upgrades baseline, /opt/cairn with generated secrets,
# a daily database backup timer, shell helpers, and — when DOMAIN is set —
# Caddy with automatic HTTPS. Safe to re-run: existing secrets are kept.
#
set -euo pipefail

CAIRN_USER="${CAIRN_USER:-cairn}"
APP_DIR="${APP_DIR:-/opt/cairn}"
CAIRN_REF="${CAIRN_REF:-v0.3.1}"
CAIRN_IMAGE="${CAIRN_IMAGE:-ghcr.io/darshan-regmi/cairn:0.3.1}"
APP_PORT="${APP_PORT:-3000}"
DOMAIN="${DOMAIN:-}"
SSH_PORT="${SSH_PORT:-22}"
BACKUP_KEEP="${BACKUP_KEEP:-7}"
REPO_RAW="https://raw.githubusercontent.com/darshan-regmi/cairn/${CAIRN_REF}"

log()  { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

[[ ${EUID} -eq 0 ]] || die "run as root:  sudo DOMAIN=… bash $0"
# shellcheck disable=SC1091
. /etc/os-release
[[ ${ID:-} == ubuntu || ${ID:-} == debian ]] || die "Ubuntu/Debian only (found ${ID:-unknown})"
export DEBIAN_FRONTEND=noninteractive

# --- 1. Base packages + unattended security updates -------------------------
log "Installing base packages"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg git jq ufw fail2ban unattended-upgrades rsync

cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now unattended-upgrades >/dev/null 2>&1 || true

# --- 2. Docker Engine + Compose plugin (official repo) ----------------------
if command -v docker >/dev/null 2>&1; then
  log "Docker already installed — skipping"
else
  log "Installing Docker Engine"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

# --- 3. Non-root admin user -------------------------------------------------
if id -u "$CAIRN_USER" >/dev/null 2>&1; then
  log "User $CAIRN_USER already exists"
else
  log "Creating user $CAIRN_USER"
  adduser --disabled-password --gecos "" "$CAIRN_USER"
fi
usermod -aG sudo,docker "$CAIRN_USER"

# Let the admin log in the same way root does.
KEY_TARGET="/home/${CAIRN_USER}/.ssh/authorized_keys"
if [[ -s /root/.ssh/authorized_keys ]]; then
  install -d -m 0700 -o "$CAIRN_USER" -g "$CAIRN_USER" "$(dirname "$KEY_TARGET")"
  install -m 0600 -o "$CAIRN_USER" -g "$CAIRN_USER" /root/.ssh/authorized_keys "$KEY_TARGET"
fi

# --- 4. Firewall + fail2ban -------------------------------------------------
log "Configuring firewall (ssh ${SSH_PORT}, 80, 443)"
ufw allow "${SSH_PORT}"/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

log "Configuring fail2ban"
cat >/etc/fail2ban/jail.local <<EOF
[sshd]
enabled  = true
port     = ${SSH_PORT}
maxretry = 5
findtime = 10m
bantime  = 1h
EOF
systemctl enable --now fail2ban

# --- 5. SSH hardening (only with a key, so we never lock you out) -----------
if [[ -s $KEY_TARGET ]]; then
  log "Hardening SSH (key-only login, no direct root)"
  cat >/etc/ssh/sshd_config.d/99-cairn-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
  if sshd -t; then
    systemctl reload ssh 2>/dev/null || systemctl reload sshd
  else
    warn "sshd config test failed — hardening reverted"
    rm -f /etc/ssh/sshd_config.d/99-cairn-hardening.conf
  fi
else
  warn "No SSH key for $CAIRN_USER — password login left ON. Add your key to"
  warn "/root/.ssh/authorized_keys and re-run to lock the box down."
fi

# --- 6. Application directory + secrets -------------------------------------
log "Preparing $APP_DIR"
install -d -m 0750 -o "$CAIRN_USER" -g "$CAIRN_USER" "$APP_DIR" "$APP_DIR/backups"

ENV_FILE="$APP_DIR/.env"
chown "$CAIRN_USER:$CAIRN_USER" "$APP_DIR"
curl -fsSL -o "$APP_DIR/docker-compose.selfhost.yml" "$REPO_RAW/docker-compose.selfhost.yml"
if [[ -f $ENV_FILE ]]; then
  log ".env exists — keeping it"
else
  curl -fsSL -o "$ENV_FILE" "$REPO_RAW/.env.selfhost.example"
fi

set_env() { # set_env KEY VALUE — safe for characters used in generated secrets
  if grep -qE "^$1=" "$ENV_FILE"; then
    sed -i -E "s|^$1=.*|$1=$2|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$1" "$2" >>"$ENV_FILE"
  fi
}

if [[ -n $DOMAIN ]]; then
  APP_URL="https://$DOMAIN"
else
  IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
  APP_URL="http://${IP}:${APP_PORT}"
  warn "No DOMAIN set — APP_URL=${APP_URL}. The session cookie is Secure,"
  warn "so browsers need HTTPS. Set DOMAIN=… and re-run for real use."
fi

set_env CAIRN_IMAGE "$CAIRN_IMAGE"
set_env APP_PORT "$APP_PORT"
set_env APP_URL "$APP_URL"
set_env DEPLOYMENT_MODE selfhost
# hex secrets are safe inside the DATABASE_URL the compose file builds
grep -qE '^POSTGRES_PASSWORD=.{16,}' "$ENV_FILE" || set_env POSTGRES_PASSWORD "$(openssl rand -hex 24)"
grep -qE '^SESSION_SECRET=.{32,}' "$ENV_FILE" || set_env SESSION_SECRET "$(openssl rand -base64 48)"
chown "$CAIRN_USER:$CAIRN_USER" "$ENV_FILE"
chmod 0600 "$ENV_FILE"

# --- 7. Backup script + daily systemd timer ---------------------------------
cat >"$APP_DIR/backup.sh" <<'EOF'
#!/usr/bin/env bash
# Cairn database backup. Keeps the newest $BACKUP_KEEP dumps.
set -euo pipefail
CAIRN_DIR="${CAIRN_DIR:-/opt/cairn}"
KEEP="${BACKUP_KEEP:-7}"
compose() { docker compose -f "$CAIRN_DIR/docker-compose.selfhost.yml" --env-file "$CAIRN_DIR/.env" "$@"; }
mkdir -p "$CAIRN_DIR/backups"
OUT="$CAIRN_DIR/backups/cairn-$(date +%Y%m%d-%H%M%S).sql.gz"
compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip >"$OUT"
echo "cairn backup: $OUT ($(du -h "$OUT" | cut -f1))"
ls -1t "$CAIRN_DIR"/backups/cairn-*.sql.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f
EOF
chown "$CAIRN_USER:$CAIRN_USER" "$APP_DIR/backup.sh"
chmod 0750 "$APP_DIR/backup.sh"

cat >/etc/systemd/system/cairn-backup.service <<EOF
[Unit]
Description=Cairn database backup
[Service]
Type=oneshot
User=${CAIRN_USER}
Environment=CAIRN_DIR=${APP_DIR}
Environment=BACKUP_KEEP=${BACKUP_KEEP}
ExecStart=${APP_DIR}/backup.sh
EOF
cat >/etc/systemd/system/cairn-backup.timer <<'EOF'
[Unit]
Description=Run the Cairn database backup daily
[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now cairn-backup.timer

# --- 8. Shell helpers (~/.bashrc -> /opt/cairn/cairn.sh) --------------------
cat >"$APP_DIR/cairn.sh" <<'EOF'
# Cairn helpers — sourced from ~/.bashrc
export CAIRN_DIR="${CAIRN_DIR:-/opt/cairn}"
_cairn() { docker compose -f "$CAIRN_DIR/docker-compose.selfhost.yml" --env-file "$CAIRN_DIR/.env" "$@"; }
cairn() {
  case "${1:-help}" in
    up|down|restart|ps|pull|config) _cairn "$@" ;;
    logs)    shift; _cairn logs -f --tail=100 "$@" ;;
    update)  _cairn pull && _cairn up -d ;;
    shell)   _cairn exec app sh ;;
    backup)  "$CAIRN_DIR/backup.sh" ;;
    restore) [ -n "${2:-}" ] || { echo "usage: cairn restore <file.sql.gz>"; return 1; }
             gunzip -c "$2" | _cairn exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' ;;
    edit)    "${EDITOR:-nano}" "$CAIRN_DIR/.env" ;;
    cd)      cd "$CAIRN_DIR" ;;
    *)       cat <<'USAGE'
cairn up | down | restart | ps | logs [svc] | pull | config
cairn update              pull the newest image and recreate
cairn shell               shell into the app container
cairn backup              dump the database now
cairn restore <file>      restore a .sql.gz dump
cairn edit | cd           edit .env / enter the app dir
USAGE
  esac
}
EOF
chown "$CAIRN_USER:$CAIRN_USER" "$APP_DIR/cairn.sh"
BASHRC="/home/${CAIRN_USER}/.bashrc"
grep -q "cairn.sh" "$BASHRC" 2>/dev/null || cat >>"$BASHRC" <<EOF

# Cairn helpers
[ -f ${APP_DIR}/cairn.sh ] && . ${APP_DIR}/cairn.sh
EOF

# --- 9. HTTPS reverse proxy (Caddy) — only when DOMAIN is set ---------------
if [[ -n $DOMAIN ]]; then
  if ! command -v caddy >/dev/null 2>&1; then
    log "Installing Caddy"
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
      | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
      >/etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq
    apt-get install -y -qq caddy
  fi
  log "Pointing Caddy at ${DOMAIN} -> 127.0.0.1:${APP_PORT}"
  cat >/etc/caddy/Caddyfile <<EOF
${DOMAIN} {
	encode gzip
	reverse_proxy 127.0.0.1:${APP_PORT}
}
EOF
  systemctl enable caddy >/dev/null 2>&1 || true
  systemctl reload caddy 2>/dev/null || systemctl restart caddy
fi

# --- 10. Start Cairn --------------------------------------------------------
log "Starting Cairn"
cd "$APP_DIR"
docker compose -f docker-compose.selfhost.yml --env-file .env pull -q || true
docker compose -f docker-compose.selfhost.yml --env-file .env up -d

printf '\n\033[1;32m==> Done\033[0m\n'
cat <<EOF

  App dir : $APP_DIR        (compose, .env, backups, cairn.sh)
  URL     : $APP_URL
  First   : open $APP_URL in a browser and create the admin account

  Re-login (or 'source ~/.bashrc') to use the shell helpers:
    cairn ps | logs | update | backup | restore | edit | cd

  Backups : daily 03:30, newest ${BACKUP_KEEP} kept, in $APP_DIR/backups
  Secrets : $APP_DIR/.env (chmod 600) — never commit it
EOF
if [[ -z $DOMAIN ]]; then
  warn "Add an A record, set DOMAIN=…, re-run — HTTPS is required for browser login."
fi
