# Kassa POS - Architecture Overview (Milestone 1)

## Overview
Kassa POS is a lightweight, offline-first point-of-sale desktop application built using **Tauri v2**, **Rust**, **React 19**, **TypeScript**, and **SQLite**.

---

## Architectural Boundary
The application strictly enforces a division of responsibilities:
- **Rust Backend (`src-tauri/`)**:
  - **Single Source of Truth**: Direct SQLite database management via `rusqlite` with `r2d2` connection pooling.
  - **Hardware & Peripherals**: ESC/POS printer interfacing and receipt generation logic.
  - **Critical Domain Math**: All financial math (discounts, proportional multi-item distributions, tax/VAT, change calculations) and weighted barcode parsing.
  - **Security & Scoping**: Session authentication, password hashing (`bcrypt`), and strict SQL-level cashier isolation (`WHERE cashier_id = ?`).
- **React Frontend (`src/`)**:
  - **Presentation & State**: Declarative UI state managed via **Zustand v5**.
  - **User Experience**: Fast keyboard navigation (shortcuts `F1`, `F2`), multilingual localization (RU, UZ-Cyrl, UZ-Latn), barcode scanner listener.
  - **Communication**: Strict boundary access via Tauri's IPC `invoke()` calls passing session tokens.

---

## Data Model & Persistence
Local SQLite is running in **WAL mode** (`PRAGMA journal_mode = WAL;`) with enforced foreign keys:

1. **`cashiers` & `sessions`**: Cashier profiles and auth session management with TTL.
2. **`smenas`**: Shift management tracking opening/closing timestamps and status.
3. **`products`**: Inventory catalog supporting units, prices, stock quantities, weighted flag, VAT, and expiry dates.
4. **`carts` & `cart_items`**: Active multi-tab carts (up to 10) and parked cart persistence.
5. **`transactions` & `transaction_items`**: Sales, full/partial returns, expenses, and debt settlements. Includes per-row `sync_status` (`pending`, `synced`, `failed`).
6. **`clients`**: Customer profiles with balance tracking (positive = credit, negative = debt).
7. **`expenses` & `expense_types`**: Operating expenses attributed to shifts.
8. **`settings`**: Hardware printer config, weighted barcode prefix list, timeout configs.

---

## Key Milestone 1 Design Decisions
- **Unified Sync Flag**: Avoided duplicate sync queues by relying directly on per-row `sync_status` in `transactions` and `expenses`.
- **SQL-Level Cashier Isolation**: All transaction history and return operations enforce `WHERE cashier_id = ?` at the query execution level.
- **Strict Proportional Returns**: Returning items from receipts that had debt or discounts proportionally balances the debt repayment and restores non-weighted inventory quantities atomically within SQLite transactions.
