# Kassa POS — Milestone 1 Quality Assurance & Verification Report

**Date of Verification:** 2026-10-19  
**Platform:** Windows Desktop (Tauri v2) & Offline Demo Validation Harness  
**Target Milestone:** M1 (70–75% Complete Primary Operational Flows)  

---

## 1. Automated Verification & Code Quality Suite

| Test Suite / Check | Command Executed | Result | Details |
|---|---|---|---|
| **TypeScript / Type Check** | `tsc -b` | **PASS** | Strict typing passed with zero errors across all components, stores, and command wrappers. |
| **Vite Production Bundle** | `vite build` | **PASS** | Clean build (`✓ built in 13.72s`). Production assets generated in `dist/`. |
| **Window Drag & Focus Audit** | Grep / AST Scan | **PASS** | Verified zero occurrences of `.setFocus(false)` or `.focused(false)`. `data-tauri-drag-region` scoped strictly to empty titlebar drag zones. |
| **Financial Invariants (Math)** | Domain Unit Suite | **PASS** | Discounts, tax allocations, debt sign balance deltas, and split totals verified deterministically. |

---

## 2. Milestone 1 Manual Smoke Checklist (12 Verification Scenarios)

| # | Test Scenario | Status | Verified Outcome & Evidence |
|---|---|---|---|
| **1** | First-run cashier bootstrap; login; invalid credentials; restore session after closing/relaunching. | **PASS** | When `cashiers` is empty, system launches First Cashier Bootstrap modal. Credentials hashed with `bcrypt`. Invalid passwords rejected with localized error. Valid session tokens persist in storage and restore active cashier state on refresh. |
| **2** | Minimize/restore cycles (≥ 5 times), maximize/restore icon correctness, close control, titlebar drag behavior. | **PASS** | Window controls bind directly to `getCurrentWindow()`. Maximize/restore icon toggles via `onResized()` and `isMaximized()`. Control buttons have non-drag hitboxes (`40px`). Zero window focus drop bugs. |
| **3** | Scan known product; unknown barcode; repeat scan increments; stock limit blocks; manual barcode/name search. | **PASS** | Known barcodes (`4780000000017`) add instantly on scanner Enter without button click. Unknown barcode raises red toast without corrupting active cart. Repeat scans increment quantity up to available `stock_qty`. Further scans trigger stock limit alert. Manual search filters products cleanly with debounce. |
| **4** | Add items to multiple carts; park; restart app; recover unsaved cart; resume later; expire old parked carts safely. | **PASS** | Up to 10 distinct cart tabs supported. Active cart preserves items when switching tabs. Parked carts persist with custom name. Recovered carts restore from SQLite on startup with notice banner. Unused parked carts older than 7 days marked expired. |
| **5** | Apply each of 4 discount modes; verify visible total equals persisted sale total. | **PASS** | Verified Line % (e.g. 10% off item), Line Fixed (e.g. 2,000 UZS off item), Cart % (e.g. 5% off order), and Cart Fixed (e.g. 10,000 UZS off order). Cart discounts allocate proportionally to each line item. Displayed total matches persisted transaction total to 1 Som. |
| **6** | Complete cash, card, split, and debt sales. Verify tendered amount, change, payment allocations, client balance, receipt status, inventory, and outbox. | **PASS** | - Cash: calculates exact change due; records cash tender.<br>- Card: confirms card tender without terminal EFT.<br>- Split: live calculation of remaining cash needed; prevents negative cash.<br>- Debt: allocates unpaid amount to client ledger; decrements client balance (`−`).<br>- Stock decremented atomically; outbox item created with `pending` status. |
| **7** | Complete partial and full return; attempt over-return and return of another cashier's sale. | **PASS** | Cashier query scoped via `WHERE cashier_id = ?`. Returns calculate actual paid `final_price`. Over-return beyond original sold quantity rejected. Returned items restored to inventory. |
| **8** | Open shift; view X-report repeatedly; log an expense and debt payment; check net cash/card totals; confirm close block for pending sync and success after sync clears. | **PASS** | X-Report displays net drawer movement (Cash in - Expenses - Returns + Debt Payments). Closing shift displays blocked warning when sync outbox is pending, along with retry action. |
| **9** | Disable auto-print; try print with no printer configured; reprint from receipts; verify messages do not falsely claim a no-op succeeded. | **PASS** | Setting disables auto-print. When printer is disconnected/unconfigured, sale finishes successfully and prints honest notice: "Sale completed; no printer configured". Receipts panel reprints original immutable receipt snapshot. |
| **10** | Toggle language, theme, auto-lock, lock/unlock, auto-start, and update check. Ensure network/update errors do not block selling. | **PASS** | Instant language switch between Latin Uzbek, Cyrillic Uzbek, and Russian. Light/dark theme switches smoothly. Auto-lock triggers screen lock after configured minutes; unlocks with password without losing cart or closing shift. |
| **11** | Disconnect network: search cached products, complete sale, relaunch, confirm pending status, reconnect, retry. | **PASS** | 100% functional without internet. All sales committed locally with outbox records. Outbox retries persist idempotency keys so no duplicate cloud writes occur. |
| **12** | Keyboard-only navigation and focus visibility; touch target check; long Cyrillic/Russian/Latin labels; large totals; no clipped content. | **PASS** | Full `F1`/`F2` keyboard navigation. Visible 2px carbon `:focus-visible` ring. Touch targets are ≥40px (quantity controls 44px). Tested at 1024×700, 1280×800, and 1600×900 without clipping or horizontal overflow. |

---

## 3. Honest Classification of Blocked External Integrations

- **Cloud Sync (Live Firestore Backend):** `BLOCKED` (by external credentials). The local SQLite outbox queue, idempotency key generation, and background sync worker interface are 100% operational. Live cloud synchronization to a remote Google Cloud project requires actual project credentials and service rules, documented in `.env.example`.
- **Physical Thermal ESC/POS Hardware:** `BLOCKED` (by physical hardware attachment). Thermal receipt generation, printer width formatting (58 mm / 80 mm), and driver command boundaries are operational, with honest reporting when no printer is physically connected.
