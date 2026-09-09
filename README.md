# FinChat — WhatsApp Personal Finance Bot & Dashboard Platform

[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com)
[![Angular](https://img.shields.io/badge/Angular-17-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Baileys](https://img.shields.io/badge/Baileys-7.0-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)

**FinChat** is a personal finance tracking application built with a focus on speed, chat-first input, and modern reporting. It serves as a comprehensive demonstration of **NestJS 10 API** combined with **WhatsApp Bot (Baileys)** and **Angular 17 Dashboard**.

Just chat to yourself on WhatsApp — e.g. `makan 20rb qris`, `gaji 5jt transfer` — the bot parses, auto-categorizes, and saves it to the database.

## Key Features

- **WhatsApp Bot Input:** Record income & expenses via natural chat to "Message yourself", supports `20rb` / `20k` / `1.5jt` / `1.5m` formats.
- **Smart Parsing:** Natural-language parser for description, amount, and payment method in one message.
- **Auto-Categorization:** Detects transaction category from description keywords.
- **Multi Payment Methods:** Cash, Transfer (10+ banks/e-wallets), QRIS (5+ platforms).
- **Web Dashboard:** Summary of income, expenses, balance, and breakdown per payment method.
- **Transactions Page:** Table with type, payment method, and date-range filters + pagination.
- **Reports:** Monthly and daily summaries via API + bot commands `/total`, `/laporan`, `/saldo`.
- **Secure Authentication:** JWT + Passport login via phone number for dashboard access.
- **Queue-Based Processing:** Bull queue with Redis + 3x retry with exponential backoff, anti-spam loop (ignores own replies).

## System Architecture

The project follows a modular and scalable architecture to ensure maintainability:

1.  **WhatsApp Layer:** Baileys socket receives messages from owner number only, pushes jobs to queue.
2.  **Queue Layer:** Redis + Bull processes messages asynchronously with retry and backoff.
3.  **Server Layer:** NestJS modules (`auth`, `parser`, `whatsapp`, `transactions`, `categories`, `reports`) for business logic and REST API.
4.  **Data Layer:** PostgreSQL database with **Prisma ORM** for type-safe queries and migrations.
5.  **Presentation Layer:** Angular 17 dashboard (Standalone Components + Signals) with Angular Material and shared types from `libs/shared`.

## Tech Stack

- **Backend:** `NestJS 10` (REST API)
- **Frontend:** `Angular 17` (Standalone Components + Signals) + `Angular Material 17`
- **Language:** `TypeScript 5.4`
- **Database:** `PostgreSQL 16` + `Prisma 5`
- **Queue:** `Redis 7` + `Bull`
- **WhatsApp:** `Baileys 7` (WhatsApp Web API, unofficial)
- **Auth:** `JWT + Passport`
- **Monorepo:** `npm workspaces` (`apps/backend`, `apps/frontend`, `libs/shared`)

## Getting Started

### Prerequisites
- Node.js >= 18 (LTS recommended) + npm >= 9
- PostgreSQL >= 14 instance
- Redis >= 6 instance
- Active WhatsApp on your phone (for QR scan)

### Installation Steps

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/ilhamramdanii/finchat.git
    cd finchat
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    ```bash
    cp .env.example apps/backend/.env
    # Edit apps/backend/.env with your DATABASE_URL, REDIS_HOST, JWT_SECRET, WA_OWNER_PHONE
    ```

    Minimal `apps/backend/.env`:
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

4.  **Start PostgreSQL + Redis:**
    ```bash
    docker compose up -d
    # Or run your local PostgreSQL & Redis manually
    ```

5.  **Database Setup:**
    ```bash
    npm run prisma:generate  # Generate Prisma client
    npm run prisma:migrate   # Run migrations
    npm run prisma:seed      # Seed default categories
    ```

6.  **Run the App:**
    ```bash
    npm run dev
    # Backend: http://localhost:3000
    # Frontend: http://localhost:4200
    ```

    Or run separately:
    ```bash
    npm run backend   # Terminal 1
    npm run frontend  # Terminal 2
    ```

7.  **Link WhatsApp (scan QR):**
    - Run the backend, a QR code appears in the terminal
    - On your phone: WhatsApp → Linked Devices → Link a Device → scan QR
    - Session is stored in `wa-sessions/` (already git-ignored). Delete it and restart to re-link.

8.  **Login Dashboard:**
    - Open `http://localhost:4200`
    - Login with your phone number without `+`, e.g. `628xxxxxxxxxx`

### Bot Usage

Send to **Message yourself** chat:

```
<deskripsi> <jumlah> [metode bayar]
```

```
makan 20rb
makan 20rb qris
kopi 15k gopay
gaji 5jt transfer
```

| Command | Function |
|---|---|
| `/total` | Today's summary |
| `/laporan` | This month's report |
| `/saldo` | This month's balance |
| `/bantuan` | Show guide |

Payment methods: `cash` / `tunai` · `transfer` / `tf` / `bca` / `mandiri` / `bni` / `bri` / `ovo` / `dana` · `qris` / `gopay` / `shopeepay` / `spay` / `linkaja`.

## Development

Maintain code quality with built-in test and database tools:
```bash
npm run test:backend   # Run Jest backend tests
npm run prisma:studio  # Open Prisma Studio (Database GUI)
```

Troubleshooting:
- Prisma `P1001 can't reach database` → check Postgres running + `DATABASE_URL`
- Bull/Redis `ECONNREFUSED 6379` → check Redis running + `REDIS_HOST` / `REDIS_PORT`
- QR invalid / session broken → delete `wa-sessions/`, restart backend, re-scan
- Bot silent → sender must equal `WA_OWNER_PHONE`, check backend logs

## License
This project is licensed under the MIT License.

---
*Built with ❤️ by ilhamramdanii*
