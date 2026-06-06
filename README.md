# MA Traders - Distribution / POS System

A local-first distribution and point-of-sale application for an FMCG wholesale
trader. It replaces a legacy desktop POS with a modern web stack that is packaged
as a normal Windows desktop application, so a non-technical user installs it with
a single `.exe` and runs it from a desktop icon - no terminal, no server, fully
offline.

## Features (MVP - Phase 1)

- Master data: Accounts (shops/suppliers/cash), Products, Towns, Salesmen
- Sales invoicing with schemes/free goods, line + invoice discounts, carton/box
  quantities, automatic totals, and salesman/shop credit-limit warnings
- Cash Receive and Cash Payment vouchers
- Account ledger, Salesman ledger, All Balances, and Daily Report (all printable)
- Automatic stock deduction on sale
- JWT login with roles (foundation for the User Rights screen)
- One-click database backup (File > Backup Database in the desktop app)

Planned (Phase 2/3): Purchases & returns, sale returns, opening balance/stock,
claims & claim destroy, journal vouchers, weekly reports, full User Rights UI.

## Tech Stack

- Frontend: React + Vite + TypeScript + Ant Design
- Backend: Node.js + Express + TypeScript
- Database: SQLite via better-sqlite3 + Drizzle ORM (single file)
- Desktop: Electron + electron-builder (Windows NSIS installer, Ubuntu AppImage/deb)

Money is stored as integer paisa (1 PKR = 100 paisa) to avoid floating point
errors and formatted as PKR in the UI.

## Project Structure

```
backend/        Express API, Drizzle schema + migrations, seed
  src/db/       schema.ts, migrate.ts, seed.ts, index.ts (connection)
  src/routes/   auth, towns, salesmen, accounts, products, sales, cash, reports
  drizzle/      generated SQL migrations
frontend/       React app (Vite)
  src/pages/    Sale, SalesList, CashVoucher, masters/*, reports/*
electron/       main.ts (starts API in-process + window), preload.ts
dist/           compiled backend + electron (generated)
release/        packaged desktop app + installer (generated)
data/           local SQLite database during development (generated)
```

## Prerequisites

- Node.js 24 LTS (recommended; Node 20+ also works) and npm

## Development (web, fastest iteration)

```bash
npm install          # installs root AND frontend deps (via postinstall)
npm run db:seed      # create the SQLite DB + sample data + admin user
npm run dev          # starts API (http://localhost:4317) and web (http://localhost:5173)
```

Open http://localhost:5173 and log in with:

- Username: `admin`
- Password: `admin123`

Useful scripts:

- `npm run db:generate` - regenerate SQL migrations after editing the schema
- `npm run db:migrate` - apply migrations
- `npm run db:seed` - apply migrations + insert sample data (idempotent)

## Day-to-day workflow (after making code changes)

Use this checklist whenever you edit the code.

1. Run/test the change in the browser (fast loop):
   ```bash
   npm run rebuild:node   # only if you previously built an installer on this machine
   npm run dev            # open http://localhost:5173  (admin / admin123)
   ```
   If you changed the database schema (`backend/src/db/schema.ts`):
   ```bash
   npm run db:generate    # create a new migration
   npm run db:migrate     # apply it to your local DB
   ```

2. Build a fresh Ubuntu AppImage of the latest code (optional, local):
   ```bash
   npm run dist:linux     # produces release/MA-Traders.AppImage (+ .deb)
   npm run rebuild:node   # switch the native module back so `npm run dev` works again
   ```

3. Ship the update to everyone (recommended - cloud builds both installers):
   ```bash
   git add -A
   git commit -m "describe your change"
   git push
   ```
   GitHub Actions then builds the Windows `.exe` and Ubuntu `.AppImage` for the
   new version and publishes them to the "latest" Release. Download from the
   permanent links in "Build installers in the cloud" below.

## Running / building the desktop app

The desktop app bundles the API and database inside an Electron window.

> Important - native module ABI: `better-sqlite3` is a native module. It must be
> compiled for Node during web development and for Electron when packaging.
> The scripts handle this; just remember:
>
> - After building the desktop app, run `npm run rebuild:node` to return to web dev.
> - `npm run rebuild:electron` rebuilds it for Electron if you run the app locally.

Run the desktop app locally (for testing on your machine):

```bash
npm run rebuild:electron
npm run electron:dev
```

### Run / install on Ubuntu (for your own testing)

```bash
npm install
npm run dist:linux     # produces release/*.AppImage and release/*.deb
```

Then either:

- Double-click `release/MA-Traders.AppImage` (first: right-click > Properties >
  Permissions > Allow executing, or `chmod +x release/MA-Traders.AppImage`).
  If your Ubuntu lacks FUSE, run it with `--appimage-extract-and-run`.
- Or install the .deb so it appears in your app menu:
  `sudo apt install ./release/MA-Traders.deb`

> If you switch back to web dev after a packaging build and see a
> `NODE_MODULE_VERSION` error, run `npm run rebuild:node` once.
> Reliable packaging sequence on a machine you also use for dev:
> `rm -rf node_modules/better-sqlite3 && npm install better-sqlite3 && npm run dist:linux`.

### Build the Windows installer (the deliverable for the end user)

The Windows `.exe` installer must be built on Windows (or via CI / Wine), because
electron-builder needs the Windows toolchain.

On a Windows machine with Node.js installed:

```bash
npm install
npm run dist:win
```

This produces `release/MA-Traders-Setup.exe`.

### Build installers in the cloud (no Windows/build PC needed)

A GitHub Actions workflow at `.github/workflows/build-installers.yml` builds
BOTH the Windows `.exe` and the Ubuntu `.AppImage` (plus `.deb`) automatically
and publishes them to the same "latest" GitHub Release.

- Every push to `main` builds a new version (`0.1.<build-number>`) and publishes
  all installers as the repository's "latest" Release.
- You can also trigger it manually from the repo's Actions tab.

Permanent download links (always serve the newest build):

```
Windows: https://github.com/Muhammad-Nabeel-Asif/ma-traders-pos/releases/latest/download/MA-Traders-Setup.exe
Ubuntu:  https://github.com/Muhammad-Nabeel-Asif/ma-traders-pos/releases/latest/download/MA-Traders.AppImage
```

To ship an update: commit and push to `main`. A few minutes later the links above
serve the new builds. Windows users re-run the installer; on Ubuntu you download
the new AppImage and run it.

### How the end user installs it (non-technical)

1. Give them `MA-Traders-Setup.exe` (USB or download link).
2. They double-click it -> it installs and creates a desktop + Start-menu icon.
3. They click the icon -> the app opens in its own window. The API and database
   run silently inside. No terminal, no browser, fully offline.
4. Data is stored at `%APPDATA%/MA Traders/data/ma_traders.db`.
5. Backups: File > Backup Database in the app saves a copy of that file anywhere
   (e.g. a USB drive). To restore, replace the file and restart the app.

The same configuration also builds a Linux package via `npm run dist:linux`
(validated), and macOS via electron-builder on a Mac.

## Default credentials

`admin` / `admin123`. A user-management / password-change screen is planned for
Phase 3; until then, credentials live (hashed) in the `users` table and can be
changed via the database / seed.

## Notes

- The database file is the single source of truth; backing it up backs up
  everything.
- Account balances and ledgers are derived from the `ledger_entries` table, so
  every sale and voucher is fully auditable.
