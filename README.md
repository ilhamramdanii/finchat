# finchat

Catat pemasukan & pengeluaran cukup via chat WhatsApp. Bot auto-parsing + dashboard web untuk laporan keuangan.

Kirim pesan ke diri sendiri di WhatsApp, contoh `makan 20rb qris`, `gaji 5jt transfer` → otomatis tersimpan dan terkategorisasi.

## Tech Stack

- Backend: NestJS 10 + Prisma 5 + PostgreSQL 16 + Redis 7 (Bull queue) + Baileys (WhatsApp)
- Frontend: Angular 17 + Angular Material
- Monorepo npm workspaces: `apps/backend`, `apps/frontend`, `libs/shared`

## Prasyarat

- Node.js >= 18 (kamu pakai v26, OK) + npm >= 9
- PostgreSQL >= 14 dan Redis >= 6 — via Docker (disarankan) atau manual
- HP dengan WhatsApp aktif (untuk scan QR)
- OS: macOS / Linux / Windows

Tanpa Docker pun bisa, asal PostgreSQL & Redis sudah jalan di `localhost:5432` dan `localhost:6379`.

## 1. Install dependencies

```bash
git clone https://github.com/ilhamramdanii/finchat.git
cd finchat
npm install
```

## 2. Setup environment

```bash
cp .env.example apps/backend/.env
```

Isi `apps/backend/.env` (minimal yang wajib):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wa_finance"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=isi-minimal-32-karakter-random
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200
WA_SESSION_PATH=./wa-sessions
WA_OWNER_PHONE=628xxxxxxxxxx
```

> `WA_OWNER_PHONE` = nomor HP pemilik bot, format internasional tanpa `+`. Hanya nomor ini yang diproses bot.

## 3. Jalankan PostgreSQL + Redis

Opsi A — Docker Compose (paling mudah):

```bash
docker compose up -d
```

Opsi B — manual: pastikan service PostgreSQL dan Redis lokal sudah running, lalu sesuaikan `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`.

Cek koneksi cepat:

```bash
psql "$DATABASE_URL" -c "select 1"
redis-cli -h localhost -p 6379 ping
```

## 4. Setup database (Prisma)

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

- `prisma:generate` — generate Prisma client (wajib setelah ubah schema)
- `prisma:migrate` — buat & jalankan migrasi dev
- `prisma:seed` — isi kategori default
- Opsional GUI DB: `npm run prisma:studio`

## 5. Jalankan aplikasi

Bersamaan (backend :3000 + frontend :4200):

```bash
npm run dev
```

Atau terpisah:

```bash
# Terminal 1 — backend
npm run backend

# Terminal 2 — frontend
npm run frontend
```

- Backend: http://localhost:3000
- Frontend: http://localhost:4200

Build production:

```bash
npm run build --workspace=apps/backend
npm run build --workspace=apps/frontend
npm run start --workspace=apps/backend
```

## 6. Tautkan WhatsApp (scan QR)

1. Jalankan backend (`npm run backend`)
2. QR muncul di terminal
3. Di HP: WhatsApp → Perangkat Tertaut → Tautkan Perangkat → scan QR
4. Setelah tersambung, sesi tersimpan di folder `wa-sessions/` (jangan di-commit, sudah di `.gitignore`)

Ganti device / sesi rusak? Hapus folder `wa-sessions/` lalu restart backend dan scan ulang.

## 7. Login dashboard

Buka http://localhost:4200, login pakai nomor HP tanpa `+`, contoh `628xxxxxxxxxx`.

## 8. Cara pakai bot

Kirim ke chat **Message yourself** (pesan ke diri sendiri):

```
<deskripsi> <jumlah> [metode bayar]
```

Contoh:

```
makan 20rb
makan 20rb qris
kopi 15k gopay
gaji 5jt transfer
```

Satuan: `20rb` / `20k` = Rp20.000, `1.5jt` / `1.5m` = Rp1.500.000, `50000` = Rp50.000.

Perintah:

| Perintah | Fungsi |
|---|---|
| `/total` | Ringkasan hari ini |
| `/laporan` | Laporan bulan ini |
| `/saldo` | Saldo bulan ini |
| `/bantuan` | Panduan |

Metode bayar: `cash`/`tunai`, `transfer`/`tf`/`bca`/`mandiri`/`bni`/`bri`/`ovo`/`dana`, `qris`/`gopay`/`shopeepay`/`spay`/`linkaja`.

## Script penting

```bash
npm run dev              # backend + frontend sekaligus
npm run backend          # backend saja
npm run frontend         # frontend saja
npm run test:backend     # jest backend
npm run prisma:studio    # GUI database
```

## Troubleshooting

| Gejala | Solusi |
|---|---|
| Prisma `P1001 can't reach database` | Pastikan Postgres jalan, cek `DATABASE_URL`, `docker compose ps` |
| Bull/Redis `ECONNREFUSED 6379` | Pastikan Redis jalan, cek `REDIS_HOST`/`REDIS_PORT` |
| QR tidak muncul / session invalid | Hapus `wa-sessions/`, restart backend, scan ulang |
| Bot tidak merespons | Pastikan pengirim = `WA_OWNER_PHONE`, cek log backend |
| Port 3000/4200 bentrok | Ganti `PORT` di `.env` atau `ng serve --port 4201` |
| `npm install` gagal di Node 26 | Hapus `node_modules` + `package-lock.json`, `npm install` ulang, atau pakai Node LTS 20 |

## Struktur project

```
finchat/
├── apps/backend/src/modules/
│   ├── auth/ whatsapp/ parser/
│   ├── transactions/ categories/ reports/
├── apps/frontend/src/app/
│   ├── core/ features/ store/
├── libs/shared/src/types/
├── docker-compose.yml
└── .env.example
```

## Lisensi

MIT.
