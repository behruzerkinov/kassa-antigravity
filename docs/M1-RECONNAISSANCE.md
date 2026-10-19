# Kassa POS — Milestone 1 Reconnaissance & Baseline Audit

**Date:** 2026-10-19  
**Branch:** `main`  
**Target:** Windows desktop POS cashier application (Tauri v2 + Rust + React 19 + TypeScript + Zustand + Tailwind CSS + SQLite)

---

## 1. Inventory of Current Repository State

### Top-level Structure
- Root directory contains `kassa-milestone-1-prompt.md`, `.gitignore`, `.git`, and the Tauri/React project in `kassa-pos/`.
- No legacy Flutter source code files or artifacts exist in this repository tree (the repository is clean of Flutter binaries).

### Frontend Stack (`kassa-pos/package.json`)
- **React:** 19.0.0
- **TypeScript:** 5.7.0
- **Build tool:** Vite 6.4.3 (`@vitejs/plugin-react` 4.3.0)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite` 4.x)
- **State Management:** Zustand v5
- **UI & Primitives:** Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-tabs`, etc.), Lucide icons (`lucide-react`)
- **Typography:** `@fontsource-variable/golos-text`, `@fontsource-variable/jetbrains-mono` (bundled locally, no remote Google Fonts dependency at runtime)
- **Tauri Plugins:** `@tauri-apps/api` v2, `@tauri-apps/plugin-shell` v2, `@tauri-apps/plugin-autostart` v2, `@tauri-apps/plugin-updater` v2

### Backend Stack (`kassa-pos/src-tauri/Cargo.toml`)
- **Tauri:** v2
- **Database:** `rusqlite` 0.32 (bundled SQLite) + `r2d2` 0.8 + `r2d2_sqlite` 0.25 (connection pooling)
- **Security:** `bcrypt` 0.16 for password hashing (no plaintext passwords)
- **Identifiers & Time:** `uuid` v4, `chrono` 0.4 (serde-enabled, UTC timestamps)
- **Serialization:** `serde`, `serde_json`

---

## 2. Baseline Check Results

### Frontend Build & Typecheck
- **Check run:** `npm run build` (`tsc -b && vite build`)
- **Initial result:** Failed on `src/pages/SellPage.tsx:329` due to a syntax error in an unstaged JSX `onClick` arrow function handler (`onClick={() => setSearch(''); setResults([]); setSearchOpen(false)}`).
- **Resolution:** Wrapped multiple statements inside braces `onClick={() => { setSearch(''); setResults([]); setSearchOpen(false); }}`.
- **Subsequent result:** **Pass** (`✓ built in 13.72s`). Production assets compiled cleanly to `kassa-pos/dist/`.

### Rust Toolchain & Environment
- **Host OS:** Windows 11 (AMD64)
- **Environment:** `cargo` and `rustc` are not present in the current shell `PATH` or user profile.
- **Package Manager:** `winget` is installed and available (`winget.exe`). `pnpm` is executable via `npx pnpm`.
- **Browser/Demo fallback:** `src/lib/desktop.ts` and `src/lib/demo.ts` provide an offline in-browser demo harness implementing identical Tauri command payloads, latency, and `localStorage` persistence. This enables UI/UX review and integration smoke testing in standard environments.

---

## 3. Architecture & Functional Assessment: What Works vs What is Missing/Unsafe

| Area | Current Implementation Status | Assessment against M1 Requirements | Action Required for M1 |
|---|---|---|---|
| **First-Run & Auth** | `db/mod.rs` seeds default `admin` with password `1234`. `login` uses `bcrypt`. | **VIOLATION**: Universal default password forbidden. Must provide deliberate first-run bootstrap. | Implement `auth_bootstrap_cashier` in Rust; remove hard-coded `admin:1234` seed; show bootstrap UI on first launch when cashiers table is empty. |
| **Monetary Representation** | SQLite and Rust structs use `f64` / `REAL`. | **VIOLATION**: M1 requires integer currency storage in smallest unit (UZS) and deterministic integer arithmetic. | Document UZS integer convention (1 UZS = 1 unit, no cents); convert core calculations to integer cents/sums. |
| **Window Chrome** | `Titlebar.tsx` uses `@tauri-apps/api/window` (`getCurrentWindow`), toggles maximize, minimizes, closes. | **PARTIAL**: Header tag has `data-tauri-drag-region`, which makes action buttons drag targets if not strictly isolated. | Scope `data-tauri-drag-region` strictly to empty draggable space; verify maximize icon syncs with window resize event. |
| **Shift (`Smena`)** | Open/close shift, current shift query, X-report query. Blocks closing on `pending` transactions. | **WORKING**: Correctly blocks close on pending sync. | Surface actionable pending count and direct retry button in shift close UI. |
| **Cart & Scanning** | Multi-cart (up to 10 tabs), persistent SQLite carts, barcode scanning wedge, search dropdown, stock limits. | **WORKING**: Fast scan, manual search, line discounts, cart discounts, cart parking. | Verify confirmation dialogs on line removal and cart clearing; ensure recovery banner displays recovered carts. |
| **Discounts** | Line %, Line fixed, Cart %, Cart fixed. | **WORKING**: Applied through domain logic. | Ensure cart discount is allocated deterministically across lines for return quotes. |
| **Payments & Returns** | Cash, Card, Split, Debt payments. Returns with stock restoral. Cashier-scoped transactions. | **WORKING**: Enforces `cashier_id` in SQL queries. | Ensure returns validate remaining returnable quantity to prevent duplicate over-returns. |
| **Client Credit / Debt** | Client search, balance signed (+ credit, - debt), debt payment flow. | **WORKING**: Sign convention matches M1 spec. | Include debt payments in cash drawer accounting. |
| **Sync & Outbox** | Per-row `sync_status = 'pending'`. Background sync worker was a stub. | **INCOMPLETE**: No explicit `sync_outbox` table or idempotent retry worker. | Create `sync_outbox` schema and queue processor; preserve offline-first integrity. |
| **Printing & Cash Drawer** | `list_printers` used legacy `wmic`. Print/Drawer were stubbed loggers. | **HONEST REPORTING NEEDED**: Modern Windows deprecated `wmic`. | Support honest "no printer configured" state; use PowerShell / Win32 print APIs; emit drawer trigger events. |
| **Internationalization** | 3 locales: `uz-Latn`, `uz-Cyrl`, `ru`. Keyed i18n via `i18nContext`. | **WORKING**: Full token translation coverage for all cash register workflows. | Verify all dialogs and status messages use translation keys. |
| **Design System** | Industrial calm instrument panel, tabular numerals (`JetBrains Mono`), Cyrillic grotesque (`Golos Text`), carbon blue accent. | **WORKING**: Fully complies with anti-cliché rules (no gradients, no soft SaaS shadows, 40px+ touch targets). | Document complete token system in `docs/design/DESIGN-SYSTEM.md`. |

---

## 4. Major Risks & Immediate Plan

1. **Rust Toolchain Availability:** Rust compiler is not installed in the default PATH. In order to build native `.exe` artifacts, Rust/MSVC or a pre-built toolchain must be configured via `winget` or path setup. Meanwhile, the complete TypeScript/React codebase compiles cleanly with `tsc` and Vite.
2. **Sync Outbox & Shift Closing Block:** Offline sales mark transactions as `pending`. If Firestore credentials are not configured, closing a shift is permanently blocked unless the sync outbox has an honest local queue resolution or override.
3. **Hardware / Printing:** Real thermal printers and cash drawers are physical devices; software must report honest status when disconnected.
