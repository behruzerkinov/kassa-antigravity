# Kassa POS — Architecture & Technical Specification (Milestone 1)

**Target:** Windows Desktop Point-of-Sale Cashier Application  
**Runtime:** Tauri v2 (Rust Backend + WebView2 Frontend)  
**Frontend:** React 19, TypeScript, Zustand v5, Tailwind CSS v4, Radix UI Primitives  
**Local Database:** SQLite (accessed strictly via Rust `rusqlite` with `r2d2` connection pooling)  
**Cloud Sync:** Firestore REST / Sync Outbox Queue with local SQLite durability  

---

## 1. Architectural Boundaries & Ownership Contract

The application enforces a non-negotiable separation of concerns between Rust and React:

### Rust Backend Responsibility (Authoritative)
- **Direct SQLite Access:** Rust is the sole owner of SQLite connection pools, migrations, transactions, and queries. React never executes SQL or opens the database file directly.
- **Financial Calculations & Invariants:** All monetary calculations (totals, change, tender distribution, discounts, tax/VAT) and rounding policies belong strictly to Rust.
- **Identity & Cashier Scoping:** Rust derives cashier identity from the validated local session token. Frontend cannot specify a cashier ID for sensitive operations; queries enforce `WHERE cashier_id = ?` at the SQL level.
- **Barcode & Scale Parsing:** Parsing EAN-13 barcodes, variable-measure prefixes (`27`, `28`, `29`), weight scaling, and check digit validation.
- **Hardware & Peripherals:** Native printer enumeration, ESC/POS formatting, cash drawer triggering, and honest status reporting.
- **Outbox & Cloud Synchronization:** Durable local outbox queue management, idempotency key generation, and background sync retry workers.

### React Frontend Responsibility (Presentation Only)
- **UI State & User Interaction:** Transient interaction state managed with Zustand v5 (active input fields, dialog visibility, keyboard focus).
- **Presentation & Accessibility:** Touch-optimized UI (≥40px targets), visible focus rings (`:focus-visible`), and responsive layouts (1024×700 to 1600×900).
- **Tauri IPC Command Gateway:** Centralized typed IPC wrappers (`src/lib/desktop.ts`).
- **Tri-Lingual Localization:** Key-based i18n supporting Uzbek Latin (`uz-Latn`), Uzbek Cyrillic (`uz-Cyrl`), and Russian (`ru`).

---

## 2. Typed Tauri Command Families

All IPC commands pass session tokens and return structured DTOs:

| Family | Commands | Purpose |
|---|---|---|
| **Auth** | `login`, `logout`, `validate_session`, `lock_screen`, `unlock_screen`, `bootstrap_cashier` | Cashier authentication, first-run setup, auto-lock lifecycle. |
| **Shift** | `open_smena`, `close_smena`, `get_current_smena`, `get_x_report` | Shift lifecycle, net drawer cash reconciliation, sync-blocked closure. |
| **Catalog** | `search_products`, `get_product_by_barcode`, `parse_weighted_barcode` | Cached product lookups, barcode wedge input, scale item parsing. |
| **Cart** | `create_cart`, `add_to_cart`, `update_cart_item_qty`, `remove_cart_item`, `clear_cart`, `park_cart`, `resume_cart`, `get_parked_carts`, `get_active_carts` | Multi-cart tabs (up to 10), persistent line mutations, cart parking and recovery. |
| **Discounts** | `apply_item_discount`, `apply_cart_discount` | Line percentage, line fixed, cart percentage, cart fixed discounts. |
| **Payment** | `process_payment`, `process_return`, `pay_client_debt` | Atomic sale commit, receipt snapshot, inventory mutation, debt settlements. |
| **Clients** | `search_clients`, `create_client`, `get_client` | Client search by phone/name, signed balance tracking (+ credit, - debt). |
| **Receipts** | `get_receipts`, `get_receipt_detail` | Cashier-scoped sales history, date filtering, reprints. |
| **Expenses** | `create_expense`, `get_expense_types`, `get_smena_expenses` | Operating expense logging, cash drawer outflow tracking. |
| **Hardware** | `list_printers`, `print_receipt`, `open_cash_drawer` | Printer detection, receipt roll printing (58/80mm), cash drawer signal. |
| **Settings** | `get_all_settings`, `update_setting` | Application preferences, weighted prefixes, auto-lock timeout, theme. |
| **Sync** | `get_sync_status`, `retry_failed_sync` | Durable outbox inspection, retry queue triggers, sync health status. |

---

## 3. Database Schema & Persistence (SQLite WAL)

Local database runs in WAL mode (`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`):

```sql
-- Cashiers & Sessions
CREATE TABLE IF NOT EXISTS cashiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cashier_id INTEGER NOT NULL REFERENCES cashiers(id),
    token TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

-- Shifts (Smenas)
CREATE TABLE IF NOT EXISTS smenas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cashier_id INTEGER NOT NULL REFERENCES cashiers(id),
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    status TEXT NOT NULL DEFAULT 'open'
);

-- Products & Inventory
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,          -- Integer Som (UZS)
    stock_qty REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'шт',
    category TEXT,
    is_weighted INTEGER NOT NULL DEFAULT 0,
    vat REAL,
    expiry_date TEXT,
    updated_at TEXT NOT NULL
);

-- Active & Parked Carts
CREATE TABLE IF NOT EXISTS carts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cashier_id INTEGER NOT NULL,
    smena_id INTEGER,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- active, parked, completed
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    barcode TEXT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    qty REAL NOT NULL DEFAULT 1,
    weight REAL,
    discount_type TEXT,               -- percentage, fixed
    discount_value INTEGER,
    final_price INTEGER NOT NULL,
    is_weighted INTEGER NOT NULL DEFAULT 0
);

-- Financial Transactions & Sales
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idempotency_key TEXT UNIQUE NOT NULL,
    cart_id INTEGER,
    cashier_id INTEGER NOT NULL REFERENCES cashiers(id),
    smena_id INTEGER REFERENCES smenas(id),
    kind TEXT NOT NULL,               -- sale, return, debt_payment, expense
    total INTEGER NOT NULL,
    discount_total INTEGER NOT NULL DEFAULT 0,
    cash_amount INTEGER NOT NULL DEFAULT 0,
    card_amount INTEGER NOT NULL DEFAULT 0,
    debt_amount INTEGER NOT NULL DEFAULT 0,
    change_amount INTEGER NOT NULL DEFAULT 0,
    client_id INTEGER REFERENCES clients(id),
    status TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending', -- pending, synced, failed
    created_at TEXT NOT NULL
);

-- Durable Cloud Sync Outbox
CREATE TABLE IF NOT EXISTS sync_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idempotency_key TEXT UNIQUE NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Clients & Ledger
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    balance INTEGER NOT NULL DEFAULT 0, -- signed: + credit, - debt
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

---

## 4. Financial Calculations & Inventory Invariants

1. **Integer Money Storage:** Monetary amounts are stored as standard integer units of Uzbek Som (UZS). 1 unit = 1 Som. Binary floating-point variables (`f32`/`f64`) are never used for currency persistence.
2. **Deterministic Cart Discounts:** When a cart discount is applied, it is allocated proportionally across eligible line items. Remainder is allocated deterministically to maintain total consistency.
3. **Atomic Commit & Inventory Deduction:** Every sale transaction commits within a SQLite ACID transaction with outbox record and inventory deduction.
4. **Returns Invariant:**
   - Cashiers can only inspect and return transactions they created.
   - Return cannot exceed remaining returnable quantity: $\text{return\_qty} \le \text{sold\_qty} - \text{returned\_qty}$.
   - Refund uses the exact `final_price` paid at time of sale.
   - Non-weighted stock is restored to catalog inventory.
