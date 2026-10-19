# Kassa POS — Milestone 1 Decisions & Architecture Log

**Status:** Preflight & Implementation Phase  
**Author:** Staff Desktop & POS Domain Engineer  
**Date:** 2026-10-19  

---

## 1. Classification of Architectural & Domain Decisions

Each decision is categorized according to the Milestone 1 contract:
- **Blocker:** Requires explicit confirmation from the product owner / stakeholder before permanent integration.
- **Safe Default:** Pragmatic, standard domain default adopted immediately and documented.
- **Deferred:** Explicitly out of scope for Milestone 1.

---

## 2. Identified Blockers (Requiring Product Confirmation)

### Decision 1: Firestore Device & Store Authentication
- **Category:** Blocker
- **Finding:** No Firebase configuration, project ID, client API keys, or security rules are committed in the repository. Shipping a service-account private key in a client-side Windows desktop binary is an immediate security vulnerability.
- **Resolution Strategy for M1:**
  - Create a durable local SQLite `sync_outbox` table with stable idempotency UUIDs.
  - Expose a modular Rust sync interface (`SyncAdapter`) with `get_sync_status`, `retry_failed_sync`, and mockable background worker.
  - Document all required environment variables in `.env.example` (e.g. `FIREBASE_PROJECT_ID`, `FIREBASE_STORE_ID`, `FIREBASE_DEVICE_TOKEN`).
  - Report cloud sync status honestly as **"Offline / Unconfigured"** unless valid device credentials are provided.

### Decision 2: Weighted Barcode Encoding (EAN-13)
- **Category:** Blocker (Clarification)
- **Finding:** Barcode prefixes `27`, `28`, `29` identify variable-measure items, but scales can encode either **weight (grams)** or **computed total price (sum)**.
- **Safe Default Adopted for M1:**
  - Standard CIS weight-embedded scale layout:
    - Digits 0..1 (2 digits): Prefix (`27`, `28`, `29`)
    - Digits 2..6 (5 digits): PLU / Product Code
    - Digits 7..11 (5 digits): Weight in grams (divided by 1000 = kg, 3 decimal places)
    - Digit 12 (1 digit): EAN-13 checksum digit
  - If a 7-digit item code is scanned, the prefix + PLU (`2700001`) matches the product catalog barcode, and weight is parsed from the 5-digit payload.
  - Added configurable offset and scale parameters in settings to support alternative scale profiles without recompilation.

### Decision 3: Offline Shift Closing vs. Pending Sync Outbox Contradiction
- **Category:** Blocker (Operational Risk)
- **Constraint:** Sales must work 100% offline. However, the requirement states that a cashier cannot close a shift (`smena`) if transactions are still pending sync. During a multi-hour network outage, a cashier finishing an 8-hour shift cannot close the register.
- **Safe Default Adopted for M1:**
  - Strictly enforce the block by default as specified in §6.3.
  - Provide clear UI feedback: Display the exact count of pending sales, an active **"Retry Sync"** button, and an explanation of the network state.
  - Add an explicit **"Emergency / Force Close Shift"** dialog option (requiring double-confirmation) so cashiers are not trapped at the counter during an extended internet blackout.

### Decision 4: Returns & Refunds Policy
- **Category:** Safe Default (Formalized M1 Rule)
- **Rule Adopted for M1:**
  - **Stock Restoral:** Non-weighted returned items are restored to inventory (`stock_qty += return_qty`).
  - **Price Calculation:** Returns refund the **actual discounted price paid** at time of sale (`final_price`), not current catalog price.
  - **Cashier Scoping:** A cashier can only view and process returns on sales they completed (`WHERE cashier_id = active_cashier_id`).
  - **Over-Return Prevention:** SQLite transaction validates that `returned_qty + new_return_qty <= original_sold_qty`.
  - **Debt Sales Returns:** If an item from a debt sale is returned, the refund is credited directly toward the client's debt balance (`client.balance += refund_amount`), not handed out as cash.
  - **Cash/Card Returns:** Cash sales are refunded from the cash drawer; card sales are recorded as card refund without opening the physical cash drawer.

---

## 3. Safe Defaults Adopted & Documented

| Topic | Default Chosen | Rationale |
|---|---|---|
| **Currency Representation** | Integer storage in Uzbek Som (UZS). 1 unit = 1 Som. | UZS does not use fractional kopeks/tiyin in daily retail. Using integer arithmetic prevents floating-point inaccuracies (`0.1 + 0.2 != 0.3`). |
| **Timestamps** | ISO-8601 UTC strings (`chrono::Utc::now().to_rfc3339()`) stored in SQLite; converted to device local time in UI. | Avoids daylight-saving/timezone corruption while keeping SQL queries standard. |
| **Idempotency** | Stable UUID v4 for all sales, returns, and outbox entries. | Cloud sync retries will never create duplicate sales in Firestore. |
| **First-Run Bootstrap** | If `cashiers` table has 0 rows, show Cashier Setup screen to set up first username/password. | Eliminates insecure hard-coded default credentials like `admin:1234`. |
| **Session & Lock Lifecycle** | Session persisted in SQLite; auto-lock after N minutes of inactivity. Lock preserves active cart & shift; re-authentication required to unlock. | Cashier can step away without losing current customer's cart or closing the shift. |
| **Printer Fallback** | Honest status: "Sale completed; no printer configured". | Distinguishes print success from physical hardware absence. |
| **Database Migrations** | Deterministic versioned SQLite schema scripts enabled with `PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;`. | Ensures ACID transactions and crash-resilience. |

---

## 4. Deferred Scope (Outside Milestone 1)

1. **Integrated EMV / EFT POS Card Terminal:** Cashier confirms card payment manually after operating standalone bank terminal.
2. **Customer-Facing Secondary Display:** Dual-screen setup deferred to Milestone 2.
3. **Multi-Currency Pricing:** Single currency (UZS) supported for M1.
4. **Cloud-Side Multi-Branch Inventory Rebalancing:** Handled asynchronously in cloud backend.
