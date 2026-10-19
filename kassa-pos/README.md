# Kassa POS

Offline-first point-of-sale desktop app for a Windows till: Rust + Tauri v2
backend, React 19 + TypeScript frontend, SQLite for local data.

The interface was rebuilt around the way a till is actually used — a scan field,
a ledger, a giant total, and a printed customer receipt on the right. The
reasoning is in [DESIGN.md](DESIGN.md); the command boundary and data model are
in [ARCHITECTURE.md](ARCHITECTURE.md).

## Requirements

- Node 20+ and pnpm 10 (`corepack enable pnpm` or `npx pnpm@10`)
- Rust toolchain and the Tauri prerequisites for Windows, for the desktop app

## Run the desktop app

```bash
cd kassa-pos
pnpm install
pnpm tauri dev
```

Seed login: `admin` / `1234`.

## Run the interface in a browser (design review)

The frontend is also explorable without Rust. In a plain browser it talks to a
demo backend that emulates every Tauri command with the same payload shapes and
persists its data in `localStorage`:

```bash
cd kassa-pos
pnpm install
pnpm dev          # http://localhost:1420
```

Demo login: `admin` / `1234`. The demo seeds a product catalogue (including
weighted items with barcodes such as `2700001005000` for 0.5 kg of Olma),
clients with balances, and a day of receipts. Settings → Demo data resets it.

The `демо` badge in the titlebar, the demo credentials hint, and the reset
button appear only outside Tauri.

## Checks

```bash
pnpm exec tsc -b     # types
pnpm build           # type-check and production bundle
```

## Layout

```
kassa-pos/
├── src/
│   ├── lib/           types mirroring the Rust structs, the invoke wrapper, demo backend
│   ├── stores/        zustand: auth/session, carts, shift, sync, settings
│   ├── components/    shell, receipt tape, receipts, settings, shift, ui primitives
│   ├── pages/         login, lock, sell workspace, payment sheet, returns
│   ├── i18n/          ru, uz-Cyrl, uz-Latn copy decks
│   └── styles/        design tokens and the paper/ledger utilities
└── src-tauri/         Rust commands, SQLite schema, hardware boundary
```

## Known Milestone 1 limitations

- Selling works fully offline; cloud sync is still a stub on the Rust side, so
  completed sales stay marked `pending` until the sync worker exists. Closing a
  shift is therefore blocked while receipts are pending, by design.
- Card payment records the method; there is no terminal integration.
- Printers are listed through `wmic` and `print_receipt` logs instead of
  writing ESC/POS bytes.
- Autostart and update checks are wired in the UI; the update check reports a
  failure instead of pretending to succeed when the updater is not configured.
