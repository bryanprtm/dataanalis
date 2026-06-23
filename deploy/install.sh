#!/usr/bin/env bash
###############################################################################
# Auto Install Script - Ubuntu Server (20.04 / 22.04 / 24.04)
# Stack: Node.js 20 + PostgreSQL + Nginx + PM2
# Target: Standalone VPS deployment for TanStack Start app
#
# Usage:
#   sudo bash install.sh
#
# Setelah selesai, app berjalan di http://<IP_VPS>
###############################################################################

set -euo pipefail

# ====== KONFIGURASI (ubah sesuai kebutuhan) ==================================
APP_NAME="dataanalis"
APP_DIR="/var/www/${APP_NAME}"
APP_PORT="3000"
NODE_VERSION="20"
DOMAIN=""                              # contoh: "app.example.com" (kosong = pakai IP)
REPO_URL=""                            # contoh: "https://github.com/user/repo.git"

DB_NAME="${APP_NAME}_db"
DB_USER="${APP_NAME}_user"
DB_PASS="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)"
# =============================================================================

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[x]${NC} $1"; exit 1; }

[[ $EUID -eq 0 ]] || err "Jalankan sebagai root: sudo bash install.sh"

log "Update sistem..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

log "Install dependency dasar..."
apt-get install -y curl wget git build-essential ca-certificates gnupg lsb-release \
  ufw software-properties-common openssl unzip

# ---- Node.js -----------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  log "Install Node.js ${NODE_VERSION}.x..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y nodejs
else
  log "Node.js sudah terpasang: $(node -v)"
fi

log "Install Bun (package manager)..."
if ! command -v bun >/dev/null 2>&1; then
  curl -fsSL https://bun.sh/install | bash
  ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun || true
fi

log "Install PM2 (process manager)..."
npm install -g pm2

# ---- PostgreSQL --------------------------------------------------------------
log "Install PostgreSQL..."
apt-get install -y postgresql postgresql-contrib
systemctl enable --now postgresql

log "Membuat database & user..."
sudo -u postgres psql <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname='${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  END IF;
END \$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='${DB_NAME}')\gexec
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

# ---- Nginx -------------------------------------------------------------------
log "Install Nginx..."
apt-get install -y nginx
systemctl enable --now nginx

# ---- Firewall ----------------------------------------------------------------
log "Konfigurasi firewall (UFW)..."
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
yes | ufw enable || true

# ---- Clone & Build App -------------------------------------------------------
mkdir -p "$(dirname "$APP_DIR")"
if [[ -n "$REPO_URL" ]]; then
  if [[ ! -d "$APP_DIR/.git" ]]; then
    log "Cloning repo dari $REPO_URL ..."
    git clone "$REPO_URL" "$APP_DIR"
  else
    log "Repo sudah ada, pull update..."
    git -C "$APP_DIR" pull
  fi
else
  warn "REPO_URL kosong - skip clone. Upload manual ke $APP_DIR"
  mkdir -p "$APP_DIR"
fi

# ---- Environment -------------------------------------------------------------
# OpenAI API key (untuk fitur AI: BAB II Analisa & BAB III Catatan)
OPENAI_API_KEY="${OPENAI_API_KEY:-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}"

log "Menulis file .env ..."
cat > "$APP_DIR/.env" <<ENV
NODE_ENV=production
PORT=${APP_PORT}
HOST=127.0.0.1

# ===== Database lokal VPS (PostgreSQL) =====
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
PGHOST=localhost
PGPORT=5432
PGUSER=${DB_USER}
PGPASSWORD=${DB_PASS}
PGDATABASE=${DB_NAME}

# ===== OpenAI =====
OPENAI_API_KEY=${OPENAI_API_KEY}
ENV
chmod 600 "$APP_DIR/.env"

# ---- Install & Build ---------------------------------------------------------
if [[ -f "$APP_DIR/package.json" ]]; then
  log "Install dependency aplikasi..."
  cd "$APP_DIR"

  # PENTING: build default TanStack Start (via @lovable.dev/vite-tanstack-config)
  # menggunakan preset Nitro 'cloudflare-module' yang HANYA jalan di Cloudflare
  # Workers - tidak bisa di-run dengan `node` di VPS Ubuntu.
  # vite.config.ts membaca env NITRO_PRESET sebagai override, jadi paksa
  # ke 'node-server' agar menghasilkan .output/server/index.mjs yang
  # kompatibel dengan Node.js di VPS.
  export NITRO_PRESET=node-server

  if command -v bun >/dev/null 2>&1; then
    bun install
    bun run build || warn "Build gagal - periksa script build"
  else
    npm install
    npm run build || warn "Build gagal - periksa script build"
  fi

  # Cari entry server hasil build
  SERVER_ENTRY=""
  for cand in ".output/server/index.mjs" ".output/server/index.js" "dist/server/index.mjs"; do
    if [[ -f "$APP_DIR/$cand" ]]; then
      SERVER_ENTRY="$APP_DIR/$cand"
      break
    fi
  done

  if [[ -z "$SERVER_ENTRY" ]]; then
    warn "Server entry tidak ditemukan di .output/server/. Build mungkin gagal."
    warn "Cek manual: ls -la $APP_DIR/.output/server/"
  else
    log "Start aplikasi via PM2: $SERVER_ENTRY"
    pm2 delete "$APP_NAME" 2>/dev/null || true
    cd "$APP_DIR"
    PORT="${APP_PORT}" HOST="127.0.0.1" NODE_ENV=production \
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}" \
    OPENAI_API_KEY="${OPENAI_API_KEY}" \
      pm2 start "$SERVER_ENTRY" --name "$APP_NAME" --update-env --cwd "$APP_DIR"
    pm2 save
    pm2 startup systemd -u root --hp /root | tail -1 | bash || true
  fi
fi

# ---- Nginx reverse proxy -----------------------------------------------------
SERVER_NAME="${DOMAIN:-_}"
log "Konfigurasi Nginx reverse proxy -> :${APP_PORT}"
cat > /etc/nginx/sites-available/${APP_NAME} <<NGINX
server {
    listen 80;
    server_name ${SERVER_NAME};

    client_max_body_size 25M;

    location / {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/${APP_NAME}
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ---- SSL (opsional) ----------------------------------------------------------
if [[ -n "$DOMAIN" ]]; then
  log "Install Certbot untuk SSL Let's Encrypt..."
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@${DOMAIN}" --redirect || \
    warn "Certbot gagal - jalankan manual: certbot --nginx -d $DOMAIN"
fi

# ---- Ringkasan ---------------------------------------------------------------
IP=$(curl -s ifconfig.me || echo "<IP_VPS>")
echo
echo "============================================================"
echo -e "${GREEN}INSTALASI SELESAI${NC}"
echo "============================================================"
echo "App      : ${APP_NAME}"
echo "Dir      : ${APP_DIR}"
echo "URL      : http://${DOMAIN:-$IP}"
echo "Port     : ${APP_PORT} (proxied via Nginx :80)"
echo
echo "Database : ${DB_NAME}"
echo "DB User  : ${DB_USER}"
echo "DB Pass  : ${DB_PASS}"
echo
echo "PM2      : pm2 status | pm2 logs ${APP_NAME}"
echo "Nginx    : systemctl status nginx"
echo "============================================================"
echo "Simpan kredensial database di tempat aman!"
