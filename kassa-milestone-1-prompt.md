# Kassa POS — Milestone 1 Build Prompt (Skeleton / 70–75%)

## Context for the builder (Claude Code, or whoever executes this)

You are building **Kassa**, a Windows desktop point-of-sale cashier
application, from scratch, replacing a previous Flutter build. This is
**Milestone 1**: get every core scenario working end-to-end with clean,
minimal, correct code. Not production-hardened yet — that's Milestone 2.
Do not gold-plate. Do not add speculative abstraction. Working, correct,
readable code that a second pass can harden is the actual goal.

**Stack (fixed, do not deviate):**
- Backend: Rust + Tauri v2 (native window, SQLite via `rusqlite` or
  `sqlx`, hardware I/O, sync logic)
- Frontend: React + TypeScript + Tailwind CSS + shadcn/ui (Base UI /
  Radix primitives underneath — accept shadcn's defaults, don't reinvent
  primitives)
- State: Zustand (small, no Redux — this app doesn't need it)
- Local persistence: SQLite (via Tauri backend, never IndexedDB —
  hardware-adjacent data belongs in Rust's domain)
- Backend sync target: Firestore (already chosen; don't reconsider)
- Package manager: pnpm

**Non-negotiable architectural rule:** the Rust layer owns hardware,
files, SQLite, and sync. The React layer owns UI state and calls Rust
via `invoke()` / listens via `listen()`. Never do file I/O, SQLite
queries, or hardware calls from the frontend. Never duplicate business
logic (e.g. discount math, weight-barcode parsing) in both layers —
pick one owner per concern and document it in a comment at the top of
the relevant file.

---

## Design direction (read before writing any UI code)

This is not a marketing site — treat it as a **tool a cashier stares at
for an 8-hour shift**, standing up, often in a hurry, sometimes in poor
lighting, always needing zero ambiguity. Apply this specific brief:

- **Audience & context**: retail cashiers in Uzbekistan/CIS region,
  touch-first, keyboard shortcuts (F1/F2) as a secondary fast path,
  Cyrillic Uzbek / Latin Uzbek / Russian text at all times — pick type
  and spacing that hold up across all three scripts without layout
  breakage.
- **Tone**: calm, high-contrast, unambiguous. Not playful, not
  "SaaS-startup." Numbers (prices, totals, change due) are the hero
  content — they should be the most visually dominant thing on any
  screen, always in a tabular/monospace-numeral face so digits don't
  jitter as they update.
  - What to avoid, at all costs: the SaaS-card cliché (everything
    trapped in identical rounded cards with the same soft shadow),
    a tracked-out ALL-CAPS eyebrow label over every section, gradient
    accents, arrows appended to button text, dark near-black-with-neon
    startup theming. This is closer to a well-built industrial
    instrument panel than a landing page.
  - Default to a light theme (retail environments are usually bright);
    support a dark theme as a toggle, not default.
  - Discipline: pick ONE accent color and reserve it for
    state/action (e.g. the active cart tab, primary CTA, a live total).
    Everything else stays neutral gray/ink so the accent actually means
    something when it appears.
- **Layout skeleton**: main content area (cart / product grid) on the
  left ~70%, persistent collapsible "shelf" side panel on the right
  ~30% (cart lines, or swapped to receipts/settings/quick-products via
  a top-bar toggle). Titlebar is custom (see Window Chrome section) but
  thin — don't let chrome compete with content.
- **Accessibility floor** (not optional, not Milestone 2): every
  interactive element reachable and operable by keyboard, visible
  focus rings (do not remove `:focus-visible` styling — a common shadcn
  default mistake), color is never the only signal (pair the
  green/red debt balance with a +/− sign or icon, not color alone),
  hit targets ≥40px for touch, form inputs have real associated
  `<label>`s (not placeholder-as-label).
- **Motion**: minimal, purposeful only — a cart line appearing, a
  payment confirming, a toast appearing/dismissing. No decorative
  hover animations on every card. No page-load choreography — this is
  a tool, not a showcase.

Work through this as two passes internally before writing code:
1. Sketch the token system (4–6 named colors with hex, the type scale,
   the layout grid) and the component inventory needed.
2. Check it against the brief above — if any part of it is the generic
   default (soft-shadow cards, ALL-CAPS labels, gradient accents),
   revise it before writing code.

---

## Scope for Milestone 1 — what "70–75%, works, not yet hardened" means

For every feature below: build the real data flow (Rust ↔ SQLite ↔
React state), the real UI, and the primary happy path. Skip: retry/
backoff tuning, exhaustive edge-case toasts, animation polish, full
i18n string coverage (structure the i18n system, but placeholder
strings in one language is fine for M1), automated tests. Every
scenario listed must be *reachable and functional*, not fully bulletproof.

### 1. Window chrome (fix the known Tauri bug first)
- Custom titlebar: native OS window controls region behavior emulated
  with custom buttons (VS Code hybrid style) — minimize, maximize/
  restore (single toggle button, icon swaps based on state), close.
- Use `getCurrentWindow()` + `.minimize()` / `.toggleMaximize()` /
  `.close()` directly from `@tauri-apps/api/window`. Do **not**
  hand-roll a maximized/restored boolean in JS state — always trust
  Tauri's own state or `isMaximized()`, and never call
  `.setFocus(false)` / `.focused(false)` anywhere in window lifecycle
  code (documented tao bug: causes the next minimize/maximize to
  silently no-op or flash-restore).
- Drag region on the empty titlebar strip only (`data-tauri-drag-region`),
  explicitly excluded from the button hit-areas.
- Verify manually: minimize → restore → minimize → restore, at least
  5 cycles, before considering this done.

### 2. Login & session
- Username + password per cashier, single role (no admin tier in this
  app). Local validation against SQLite cashier table.
- On success: establish session in Zustand + persist a session token
  in SQLite/local state so app relaunch doesn't force re-login mid-shift
  (exact persistence rule: your call, document it).

### 3. Smena (shift) lifecycle
- Open / close a smena, independent of login timing.
- X-report: on-demand, non-destructive snapshot of cash/card totals +
  opened date/time for the currently open smena, viewable anytime.
- Closing a smena is **blocked** while any sale has a pending-sync
  marker — show why, don't just disable the button silently.

### 4. Screen lock
- Separate from logout — does not end the open smena.
- Auto-lock after configurable inactivity timeout (settings: minute
  options). Manual lock trigger available too.

### 5. Cart & product flow
- Two barcode inputs: scanner-wedge field (auto-Enter on scan) and a
  manual search-by-barcode-or-name field (manual Enter).
- Repeat scan of the same barcode increments qty up to in-stock limit,
  then blocks further increments (toast explaining why).
- Unknown barcode → toast, does not add to cart.
- Weighted-item EAN-13 parsing: configurable prefix set (default
  27/28/29), price computed at scan time from embedded weight × unit
  price.
- Up to 10 concurrent cart tabs. Cart "park" (name it, resume later,
  even a different day) and "resume." Removing a line or clearing a
  cart requires a confirm step.
- Cart state persisted locally (SQLite) so a crash recovers with a
  "recovered N unsaved cart(s)" notice on next launch.
- Parked carts synced to Firestore, auto-expire after 7 days (a
  background check is fine for M1; doesn't need to be exact-to-the-
  second).

### 6. Discounts
- Per-line and whole-cart, percentage or fixed amount — 4 modes total.
- No PIN/approval gate — any cashier applies freely.

### 7. Returns
- From the cashier screen, post-sale only (no pre-payment void needed).
- Partial (select line items) or full-cart.
- Scoped per-cashier: a cashier can only see/return their own sales
  (hard rule, not a UI nicety — enforce it in the Rust/SQLite query
  layer, not just by hiding UI).

### 8. Payments
- Cash: defaults to exact total, cashier can overwrite tendered amount
  for change calculation.
- Split cash/card: card field is what the cashier types into; cash
  field auto-updates live to the remainder.
- Card: no real terminal integration in M1 — cashier marks as
  paid-by-card, that's it.
- F1 = cash, F2 = card, as keyboard shortcuts from the cart screen.

### 9. Debt (client credit) sales
- Dedicated tab in the payment screen.
- Client search by name or phone (no manual ID entry). Create new
  client inline if not found.
- No credit limit. Partial payment at sale time supported — remainder
  becomes debt.
- One signed running balance per client: positive = client has credit
  with store (show green), negative = client owes store (show red +
  a −/+ sign, not color alone). A debt sale subtracts from balance; a
  separate "pay off debt" flow (search client, enter amount) adds to
  balance.
- Client's current balance shown when selected for a debt sale.

### 10. Receipts
- Own tab in the side panel alongside sell/settings/quick-products.
- Status per receipt: success / success-with-discount / debt-added /
  debt-removed / partially-returned / fully-returned /
  unsuccessful-with-internal-error.
- Searchable by product name or barcode. Date-range filter.
- Scoped per-cashier (same hard rule as returns).
- Re-printable from this page.

### 11. Printing
- List system-available printers via a refresh button with a loading
  state; cashier picks + saves a default.
- Thermal only, support both 58mm and 80mm widths.
- Auto-print on sale by default, settings toggle to disable.

### 12. Cash drawer
- Auto-open triggers: sale completed, debt paid, expense logged.
- (Actual hardware trigger can be stubbed/logged in M1 if you don't
  have physical hardware to test against yet — but the trigger points
  and the Rust command boundary must be real and correctly placed.)

### 13. Expenses
- Cashier picks an expense type (flat list for M1 — admin-managed list
  is a future-panel concern) and enters an amount.
- Shows in X-report. Record a `kind` field on the transaction now
  (sale vs expense vs debt-payment) even though the visual breakdown
  (circle=sale/square=expense charts) is deferred — this is a schema
  decision you must get right in M1 to avoid a rework later.

### 14. Offline-first sync
- Selling (scan → cart → pay → print) always works with zero network
  dependency.
- Product catalog: manual refresh button pulls from Firestore, cached
  locally for offline search.
- Completed sales sync in the background; if offline at sale time, the
  sale saves locally with a "pending sync" marker + a visible Retry
  action in Receipts. Clears once synced.
- Pending-sync items must survive an app relaunch (SQLite-backed, not
  in-memory).

### 15. Settings
- Language: Cyrillic Uzbek / Latin Uzbek / Russian (structure the
  i18n system properly even if string coverage isn't 100% in M1 —
  this is core, not cosmetic).
- Printer selection, auto-print toggle, weighted-barcode prefix config,
  lock-timeout selection, launch-on-Windows-startup toggle.
- Update check: daily, notify-only (never auto-install, never blocks
  cashier actions), re-notifies until updated.

---

## Explicit non-scope for Milestone 1 (do not build these yet)

- Real card terminal integration
- Admin/manager web panel (out of this app's scope entirely)
- Full audit trail / who-did-what logging
- Encryption at rest for local SQLite data
- Automated test suite
- Exhaustive error-state UI for every possible failure — happy path +
  one clear error state per major flow is enough for M1

---

## Deliverable format for this milestone

1. A working Tauri app that launches, logs in, and lets a cashier
   complete a full sale (cash, card, split, and debt) start to finish,
   print a receipt (or no-op gracefully if no printer configured), open
   and close a smena, and see an X-report.
2. Every feature in the numbered list above should be reachable in the
   UI, even if some interactions are simplified versions of their final
   form.
3. A short `ARCHITECTURE.md` noting: the Rust/React command boundary
   (what's a Tauri command vs frontend-only state), the SQLite schema
   as it stands, and a one-paragraph note on what's deliberately
   simplified for M1 so the hardening pass knows where to focus.
4. Call out anywhere you had to make an unstated judgment call (e.g.
   exact session-persistence rule, exact background-sync interval) so
   these can be confirmed or corrected in the next pass.

Build now. Flag anything in this spec that's ambiguous or contradictory
before you start, rather than guessing silently on a foundational
decision (schema shape, command boundary) that would be expensive to
unwind later.
