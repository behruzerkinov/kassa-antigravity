# Kassa POS — Milestone 1 Implementation Plan & Tracking

**Status:** Active Implementation  
**Target:** 70–75% Milestone 1 Complete Vertical Slice  
**Tracking Standard:** Features are marked `Done` only when verified through tests or manual verification. Partial or simulated work is labeled `In Progress` or `Blocked`.

---

## Scope & Implementation Checklist

### 6.1 Window Chrome & Lifecycle
- [x] Custom thin titlebar with minimize, maximize/restore toggle, and close controls.
- [x] Tauri native window calls (`appWindow.minimize()`, `appWindow.toggleMaximize()`, `appWindow.close()`).
- [x] Dynamic maximize state tracked via `appWindow.isMaximized()` and `onResized()` listener (no hand-rolled boolean).
- [x] Strict drag region isolation (`data-tauri-drag-region` on empty header space only, excluded from interactive buttons).
- [x] Zero references to `.setFocus(false)` or `.focused(false)`.

### 6.2 Login and Session
- [x] Username/password local cashier authentication.
- [x] Password hashing with `bcrypt` (no plaintext passwords).
- [x] First-run bootstrap flow when no cashiers exist in SQLite (no universal default `admin:1234` seed).
- [x] Persisted session token in SQLite with TTL; auto-restore session on app relaunch.
- [x] Explicit logout invalidates session without closing an open shift or discarding parked carts.

### 6.3 Shift Lifecycle & X-Report
- [x] Independent shift (`smena`) open/close operations.
- [x] Shift record tracks opening/closing timestamps and associated cashier.
- [x] Non-destructive X-Report calculating net cash drawer balance (Cash sales - Expenses - Returns + Debt Payments).
- [x] Shift closing strictly blocked when transactions are marked `pending` sync.
- [x] UI surfaces actionable pending sync count, network status, and retry shortcut on shift close attempt.
- [x] Emergency "Force Close Shift" dialog option for extended network blackouts with cashier confirmation.

### 6.4 Screen Lock
- [x] Manual lock action from titlebar / keyboard.
- [x] Configurable auto-lock timeout (1, 5, 10, 15, 30 min) persisted in settings.
- [x] Preserves active open shift, active carts, and customer context.
- [x] Unlock requires active cashier's password; resets activity timestamp.

### 6.5 Product Search, Scan, and Cart
- [x] Dedicated barcode scanner wedge input with immediate Enter handling.
- [x] Manual product search by barcode or name with debounce.
- [x] Unknown barcode feedback via toast without corrupting cart.
- [x] Inventory stock limit enforcement on repeated scans.
- [x] Weighted EAN-13 barcode parsing (prefixes `27`, `28`, `29`, 5-digit weight in grams / 1000).
- [x] Multi-cart support (up to 10 active tabs) with quick tab switching.
- [x] Cart parking with custom name, persistent across app restarts.
- [x] Confirmation dialogs before line removal and cart clearing.
- [x] Cart state persisted in SQLite; unsaved cart recovery notice on startup.

### 6.6 Discounts Engine
- [x] 4 discount modes: Line Percentage, Line Fixed Amount, Cart Percentage, Cart Fixed Amount.
- [x] Proportional allocation of cart discounts across line items.
- [x] Bounds checking: discounts cannot exceed item/cart total or create negative values.
- [x] Preserves original price snapshot alongside `final_price` for accurate return quotes.

### 6.7 Returns & Refunds
- [x] Cashier scoping: cashiers can only view and return their own sales (`WHERE cashier_id = ?`).
- [x] Full return and selective partial return by item line.
- [x] Stock quantity restored to inventory atomically on return.
- [x] Return calculation uses discounted `final_price` paid at checkout.
- [x] Over-return prevention: enforces `returned_qty + new_qty <= sold_qty`.
- [x] Debt sale return credits client ledger balance directly.

### 6.8 Payments & Checkout
- [x] Tender methods: Cash, Card, Split Cash/Card, Client Debt.
- [x] Exact total default for cash; live change computation.
- [x] Split payment live remainder allocation with bounds protection.
- [x] Dedicated keyboard shortcuts: `F1` for Cash, `F2` for Card.
- [x] Atomic SQLite commit for sale transaction, items, payment distribution, inventory deduction, and outbox record.

### 6.9 Client Credit & Debt Sales
- [x] Dedicated Debt tab in payment sheet.
- [x] Client lookup by name or phone; inline client creation with phone uniqueness check.
- [x] Signed client balance convention: `+` = client credit, `−` = client owes store.
- [x] Partial cash/card payment with remainder recorded to debt.
- [x] Standalone Pay Debt flow (`F5`) to collect outstanding balance into cash drawer.

### 6.10 Receipts & Sales History
- [x] Receipts drawer/panel with search by product name/barcode and date filtering.
- [x] Cashier-isolated sales query.
- [x] Status badges: `success`, `success_with_discount`, `debt_added`, `partial_return`, `full_return`.
- [x] Receipt detail view with line items, tender split, and reprint capability.
- [x] Visible pending sync indicator with manual retry trigger.

### 6.11 Printing Subsystem
- [x] Enumeration of system printers.
- [x] Configuration for 58 mm and 80 mm thermal roll widths.
- [x] Auto-print toggle in settings.
- [x] Honest hardware reporting: completes sale successfully and logs "no printer configured" when disconnected.

### 6.12 Cash Drawer Trigger
- [x] Trigger points: completed cash sale, debt collection, recorded cash expense.
- [x] Native command boundary with non-blocking fallback when physical drawer is unattached.

### 6.13 Expenses & Financial Transactions
- [x] Expense entry form with configurable expense categories (e.g. Encashment, Supplies, Payroll, Other).
- [x] Explicit `kind` discriminator in financial ledger: `sale`, `expense`, `debt_payment`, `return`.
- [x] Cash expense recorded as drawer outflow in X-Report.

### 6.14 Offline-First & Cloud Sync
- [x] 100% offline local operations (Scan → Cart → Discount → Pay → Receipt).
- [x] Durable SQLite `sync_outbox` table with stable UUID idempotency keys.
- [x] Catalog cache refresh boundary.
- [x] Honest status reporting for unconfigured cloud credentials in M1.

### 6.15 Settings & Localization
- [x] Tri-lingual support: Uzbek Latin (`uz-Latn`), Uzbek Cyrillic (`uz-Cyrl`), Russian (`ru`).
- [x] Settings persistence: printer selection, roll width, auto-print, weighted prefixes, auto-lock timeout, theme.
- [x] Light / Dark mode toggle with WCAG AA contrast compliance.
- [x] Update checker notify-only service (non-blocking).

---

## Verification & QA Deliverable
- Automated Rust financial invariants test suite: `kassa-pos/src-tauri/src/tests/`
- Manual smoke checklist with all 12 test sequences: `docs/QA-M1.md`
