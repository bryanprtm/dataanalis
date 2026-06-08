# Auto Install - Ubuntu VPS Standalone

Script otomatis untuk deploy aplikasi ke **VPS Ubuntu** (20.04 / 22.04 / 24.04).

## Stack yang diinstall

| Komponen   | Versi      | Fungsi                          |
|------------|------------|---------------------------------|
| Node.js    | 20.x LTS   | Runtime aplikasi                |
| Bun        | latest     | Package manager & runtime cepat |
| PostgreSQL | 14+        | Database                        |
| Nginx      | latest     | Reverse proxy & SSL             |
| PM2        | latest     | Process manager (auto-restart)  |
| UFW        | -          | Firewall                        |
| Certbot    | -          | SSL Let's Encrypt (opsional)    |

## Cara Pakai

### 1. Login ke VPS sebagai root
```bash
ssh root@IP_VPS
```

### 2. Download script
```bash
wget https://raw.githubusercontent.com/USERNAME/REPO/main/deploy/install.sh
chmod +x install.sh
```

### 3. (Opsional) Edit konfigurasi
Buka `install.sh` dan ubah bagian **KONFIGURASI** di atas:
```bash
APP_NAME="dataanalis"
APP_PORT="3000"
DOMAIN="app.example.com"          # kosongkan jika belum punya domain
REPO_URL="https://github.com/USER/REPO.git"
```

### 4. Jalankan
```bash
sudo bash install.sh
```

Script akan:
1. Update sistem & install dependency
2. Install Node.js, Bun, PM2, PostgreSQL, Nginx
3. Buat database + user dengan password random
4. Clone repo (jika `REPO_URL` diset)
5. Install dependency & build aplikasi
6. Jalankan via PM2 (auto-start saat boot)
7. Setup Nginx reverse proxy
8. Setup SSL otomatis jika `DOMAIN` diset
9. Tampilkan ringkasan + kredensial DB

## Setelah Instalasi

### Cek status aplikasi
```bash
pm2 status
pm2 logs dataanalis
```

### Restart aplikasi
```bash
pm2 restart dataanalis
```

### Update aplikasi (deploy baru)
```bash
cd /var/www/dataanalis
git pull
bun install
bun run build
pm2 restart dataanalis
```

### Akses database
```bash
sudo -u postgres psql -d dataanalis_db
```

## Upload ke GitHub

Project ini sudah terintegrasi dengan GitHub via Lovable:

1. Buka project di Lovable
2. Klik menu **+** (kiri bawah chat) → **GitHub** → **Connect project**
3. Authorize Lovable GitHub App
4. Pilih akun/organisasi GitHub
5. Klik **Create Repository**

Setelah terhubung, **setiap perubahan di Lovable otomatis ter-push ke GitHub**, dan sebaliknya. Lalu di VPS cukup `git pull` untuk update.

## Troubleshooting

| Error                          | Solusi                                                  |
|--------------------------------|---------------------------------------------------------|
| `port 80 already in use`       | `systemctl stop apache2` atau service lain              |
| Build gagal                    | Cek `pm2 logs` - biasanya kurang env var di `.env`      |
| Nginx 502 Bad Gateway          | App tidak jalan: `pm2 logs dataanalis`                  |
| Certbot gagal                  | Pastikan DNS domain sudah pointing ke IP VPS            |
