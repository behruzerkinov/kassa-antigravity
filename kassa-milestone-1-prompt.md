# Kassa POS — Milestone 1 Build Brief

**Target:** Windows desktop cashier application  
**Milestone:** End-to-end functional foundation, approximately 70–75% of the intended product  
**Primary outcome:** A coherent, runnable Tauri application that can complete real local POS workflows reliably, with a polished, deliberate interface and documented boundaries for the next hardening milestone.

> **Operating principle:** Build a small, coherent product—not a large collection of convincing-looking screens. Every visible control must do something real or be clearly unavailable with an explanation. Never describe a stub, mock, or unverified integration as complete.

---

## 0. Your role and execution contract

Act as a staff-level desktop software engineer, product designer, and POS-domain engineer. You are responsible for architecture, interaction design, implementation, verification, and truthful reporting—not just generating code.

The app is called **Kassa**. It replaces a previous Flutter build. The fixed stack is below; do not change it without finding a concrete technical blocker and explaining it first.

- **Desktop/runtime:** Rust + Tauri v2
- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui, using its supported Base UI/Radix primitives rather than rebuilding primitives
- **Frontend state:** Zustand
- **Local database:** SQLite accessed only through Rust (`rusqlite` or `sqlx`)
- **Cloud sync:** Firestore
- **Package manager:** pnpm
- **Primary OS for this milestone:** Windows

### Non-negotiable ownership boundary

- Rust owns business rules, money and discount calculations, inventory mutations, barcode parsing, authentication/session validation, files, SQLite, hardware, printing, cash-drawer commands, and cloud synchronization.
- React owns presentation, temporary interaction state, accessibility behavior, and invoking/listening to Tauri commands/events.
- React must **never** open SQLite, execute SQL, access local files directly, or call hardware APIs.
- Do not duplicate business rules across TypeScript and Rust. Rust is authoritative. The frontend may format values for display, but must not independently calculate the amount a sale charges, a refund amount, a weighted barcode price, or a debt balance.
- The frontend must not be allowed to choose its own cashier identity for sensitive operations. Rust derives the active cashier from the validated local session and applies ownership filters in the database layer.
- Keep Tauri commands thin. Put business operations in readable Rust domain functions, then expose them through commands.

Add a short comment at the top of each domain-owning file stating which layer owns that concern and whether the logic is authoritative.

### Work in the existing repository, not in an imaginary clean project

Start by inspecting the actual repository. If the previous Flutter source exists, preserve it until its behavior, data model, and business rules have been inspected. Reuse verified domain behavior where appropriate; do not blindly port old architectural problems. Do not delete source, reset Git history, overwrite local user work, or run destructive commands without permission.

Do not gold-plate, invent layers “for the future,” add needless dependencies, or build a speculative admin panel. Prefer direct, readable code with clear domain boundaries. However, simplicity is not permission to skip data integrity or misrepresent unfinished functionality.

---

## 1. Mandatory reconnaissance and skill-informed design

**Do not start by immediately generating screens.** First examine the project and the environment, then use the following references as a curated research set. Read the current repository contents and applicable skill files, not just repository names or marketing descriptions. Re-check current instructions before using them; do not assume anything is installed.

### Required references to inspect

1. [Anthropic Skills](https://github.com/anthropics/skills) — inspect how task-specific skills are structured and how instructions/resources should be used.
2. [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) — use its design-system reasoning and pattern references to compare possible visual directions. Do **not** apply its defaults blindly; a cashier instrument panel is not a SaaS landing page.
3. [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) — particularly `web-design-guidelines` for accessibility, forms, focus states, interaction, typography, locale behavior, and `react-best-practices` for React implementation.
4. [Vercel Design Systems to Agent Skills](https://github.com/vercel-labs/design-systems-to-agent-skills) — use its principle of extracting verified tokens/components from actual source instead of inventing component APIs or token names.
5. [Superpowers](https://github.com/obra/superpowers) — borrow its disciplined sequence: clarify the design, make an implementation plan, execute in small verifiable steps, review, and verify before claiming success.
6. [shadcn/ui](https://github.com/shadcn-ui/ui) — confirm current component conventions and accessibility behavior. Use components as a base, then configure them to fit this product rather than leaving an obvious template appearance.
7. Official [Tauri v2 documentation](https://v2.tauri.app/) and official [Firestore REST documentation](https://firebase.google.com/docs/firestore/use-rest-api) for current API, permission, authentication, and platform constraints.

### How to use skills and references correctly

- If the agent runtime supports skills/plugins and a relevant skill is already installed, invoke it. If installation is permitted and the skill is useful, install only the specific relevant skill—not a pile of unrelated skills.
- If an external skill cannot be installed, follow its relevant published checklist manually and state that limitation. Do not waste the milestone installing a large collection of tools.
- Read relevant scripts before executing them. Check license and provenance before copying code, icons, fonts, or assets. Prefer principles and verified APIs over copying an entire unrelated UI.
- The design references inform decisions; the product brief below remains authoritative.
- Never use vague instructions such as “make it modern,” “make it beautiful,” or “avoid the generic AI look” as a substitute for concrete design decisions. Name the actual patterns to use and avoid.

### Initial repository audit

Before editing files:

- Inspect `git status`, the top-level directory, the frontend package manifest, Tauri configuration, Rust dependencies, current commands, existing migrations, release/build setup, and any Flutter implementation that may contain business rules.
- Record current build/type-check/lint status if the repository can run those checks. Separate pre-existing failures from new failures.
- Identify which parts already work, which are missing, and which are unsafe or contradictory. Do not replace functioning code merely to make the structure match your preference.
- Create `docs/M1-RECONNAISSANCE.md` with a short inventory of what you found, reusable behavior, baseline checks, and major risks.

---

## 2. Preflight: flag expensive ambiguity before committing to it

Create `docs/M1-DECISIONS.md` containing the assumptions, decisions, and their rationale. Classify each unresolved item as:

- **Blocker:** implementing it without an answer could cause a security flaw, incorrect money/stock behavior, or expensive schema rework.
- **Safe default:** use the proposed default below, document it, and continue.
- **Deferred:** explicitly outside Milestone 1.

Ask the user a concise, grouped set of questions **only for blockers that cannot be answered from the repository or its existing configuration**. Do not interrupt work to ask about cosmetic preferences; choose and document those. Keep working on independent tasks while a blocker is unresolved, but do not fake the affected integration or silently encode a risky assumption into permanent data behavior.

### Blocking decisions to resolve early

1. **Firestore device/store authentication:** Inspect the repository and configuration for an existing Firebase Auth, project, store/device enrollment, and Firestore Security Rules setup. A public Windows executable must not contain a service-account private key or another privileged server secret. If no safe device/user authentication flow is already configured, ask which provisioning/authentication model is intended before claiming cloud sync is fully operational. You may implement the SQLite outbox and a clear Rust sync interface while this is being resolved, but do not present a fake sync adapter as real Firestore integration.
2. **Weighted barcode format:** Prefixes `27`, `28`, and `29` alone do not fully specify how the remaining EAN-13 digits encode product/PLU, weight or price, decimal scaling, and check digit. Inspect the old implementation or project documentation. If absent, ask for representative real barcodes with their expected decoded product, weight/price, and total. Make parser offsets/scales explicit configuration—not an undocumented guess.
3. **Offline shift closing contradiction:** Offline sales are required to keep working, but shift closing is also required to be blocked while any sale is pending sync. Those requirements mean that a network outage can prevent closing the shift indefinitely. Keep the stated block by default unless the product owner changes it, but flag the operational consequence for explicit confirmation and make the blocked state actionable and clear.
4. **Returns and refunds:** The requirements do not fully define whether returned stock is restored, how original discounts affect refunds, how cash/card refunds are selected, or how a return against an unpaid debt sale changes the client balance. Inspect the legacy build if available; otherwise ask for the refund policy or present a written proposed M1 rule before implementing this domain flow.

### Safe defaults unless repository evidence says otherwise

- Store money as integers in the smallest configured currency unit; no `f32`/`f64` for monetary amounts. Default display currency is UZS unless the existing product explicitly supports another currency. Document rounding behavior centrally.
- Store timestamps consistently (UTC internally) and display them in the device's local time zone.
- Use UUIDs or equivalent stable IDs generated locally for sales, returns, carts, and outbox operations. A retry must not create a duplicate cloud sale.
- Use versioned, repeatable SQLite migrations. Do not mutate the database schema ad hoc at app startup.
- The app must remain usable for local selling if Firestore is unavailable. Cloud-only actions should report unavailable status honestly.
- If no cashier exists on first launch, provide a deliberate first-run bootstrap flow to create the first local cashier; do not ship a universal default password. Passwords are hashed in Rust, never stored in plaintext.
- A cashier login does not automatically open a shift, and logout does not silently close a shift. Shift lifecycle is persistent and independent from login lifecycle.
- After a process restart, restore a persisted session only if it was not explicitly logged out; apply the configured inactivity lock rule using persisted activity timestamps. A locked session requires re-authentication to unlock but does not close the shift.

Do not infer secrets, Firebase project IDs, printer names, release URLs, or real devices. Use existing configuration where present. Otherwise record the missing prerequisite in `docs/M1-DECISIONS.md` and `.env.example` without including secret values.

---

## 3. Milestone definition and build strategy

Milestone 1 is complete only when the listed primary workflows actually function end to end. “70–75%” means **limited hardening and breadth**, not a fake 75% UI with nonfunctional controls.

### Required implementation sequence

Work in small steps and verify each step before building on it. Keep an implementation checklist in `docs/M1-PLAN.md` and update it as features become genuinely complete.

1. **Repository baseline and decisions:** reconnaissance, skill-informed design direction, architecture decisions, blocker questions.
2. **Foundation:** Tauri window, titlebar, app theme/tokens, frontend/backend command boundary, SQLite path and migrations, first-run cashier creation, login/session restore.
3. **Core sale vertical slice:** cached catalog, scanning/search, persistent cart, discount engine, cash/card/split payment, atomic sale commit, receipt view/print boundary, outbox record.
4. **Shift and financial operations:** open/close shift, X-report, expenses, cash drawer trigger boundary.
5. **Clients and returns:** client lookup/create, debt sale and collection, client balance, cashier-scoped returns.
6. **Additional cashier surfaces:** receipts/history/search/filter/reprint, parked carts, quick products, settings, screen lock, printer setup, update check.
7. **Sync and recovery:** catalog refresh, Firestore adapter/auth integration where configured, durable outbox processing, retry, parked-cart expiry, relaunch/crash recovery.
8. **Final review:** visual audit, critical invariant tests, build checks, titlebar cycles, manual happy-path checklist, architecture and decision documentation.

Do not stop after the first impressive vertical slice. All numbered scope areas below must be reached and honestly classified. If a cloud credential or hardware dependency prevents complete verification, finish the offline path, expose the relevant UI and command boundary, and document precisely what is blocked and why.

### No dead controls or pretend integrations

- Every visible button, tab, toggle, dropdown, search input, keyboard shortcut, and menu item must produce the described behavior or explain why it is unavailable.
- Do not show hard-coded sample products or fake sales in the normal app path. Seed development data only through an explicit development fixture/setup mechanism.
- Do not catch errors silently, return success-shaped fake data, or label a no-op as a successful print or sync.
- A physical printer/cash drawer may be absent during development, but the application must distinguish “sale succeeded, no printer configured” from “print succeeded.”
- When implementation must be simplified, simplify the internals—not the truthfulness of the UI or the integrity of persisted data.

---

## 4. Product purpose and interaction model

Kassa is a high-frequency cashier instrument for retail in Uzbekistan/CIS. Cashiers may stand for an eight-hour shift, use a touch screen, scan barcodes rapidly, work in bright or poor lighting, and switch between Latin Uzbek, Cyrillic Uzbek, and Russian. The main interaction must remain fast, clear, and hard to misuse.

### Information architecture

- The main work area uses approximately **68–70%** width for product search, category/quick-product browsing, and current-sale context.
- A persistent right shelf panel uses approximately **30–32%** width for the active cart/order summary. It can switch between **Cart**, **Receipts**, **Settings**, and **Quick products** without losing the current cart.
- Support up to 10 active cart tabs. Make the active cart unmistakable; keep park/resume actions accessible without crowding the scan flow.
- The titlebar is custom and thin. It should not compete visually with the sale total or product content.
- Design for common Windows cashier resolutions. At minimum, verify 1024×700, 1280×800, and 1600×900 or the closest available sizes. No clipped essential controls or unintended horizontal overflow.

### Visual direction: “calm industrial instrument panel”

The UI should feel like carefully engineered desktop software for a daily operational tool—not a marketing site, banking dashboard template, or startup admin panel.

**Design tokens to establish before building screens** (adjust the values only for a documented reason):

| Token | Starting value | Purpose |
|---|---|---|
| `canvas` | `#F4F6F8` | Main application background |
| `surface` | `#FFFFFF` | Primary working surfaces |
| `ink` | `#18212F` | Main text and high-value numbers |
| `muted` | `#5C6675` | Secondary text and metadata |
| `border` | `#D7DDE5` | Dividers and input boundaries |
| `accent` | `#245BD6` | One meaningful action/selection color |

Use restrained semantic colors for status only (success, warning, error). The accent should mean something when it appears; do not tint every icon and component. Support a dark theme toggle as a secondary theme, not the default. Do not use gradients.

**Typography and density**

- Prefer a stable Windows-native sans-serif stack with Latin and Cyrillic glyph coverage (for example, Segoe UI with safe fallbacks). Do not introduce a downloaded font that causes offline startup or licensing problems without a clear benefit.
- Use tabular numerals for every price, quantity, payment, and balance (`font-variant-numeric: tabular-nums`). Financial figures must not jitter as values change.
- Establish a readable scale (for example, 12/14/16/20/24/32px) and consistent line heights before building components. Most operational labels should be 14–16px; the primary payable total and change due must be visibly dominant.
- Use sentence case. Do not place tracked-out ALL-CAPS eyebrow labels over every section. Keep labels concise and specific.
- Use a deliberate spacing/grid system and consistent input heights; avoid dense micro-text and excessive empty space.

**Avoid these named patterns**

- A SaaS-card cliché where every group is wrapped in an identical rounded card with a soft shadow.
- Huge rounded pill buttons everywhere, gradients, decorative glows, neon-on-near-black themes, excessive badges, or ornamental icons.
- Generic centered login/dashboard layouts that waste the main cashier work area.
- Placeholder text used as the only label; low-contrast gray-on-gray text; removing focus rings; status communicated only by color.
- Hover animation on every item, page-load choreography, animated counters, and motion that makes scanning or tapping feel slower.
- Arrows appended to button labels as decoration, made-up icon glyphs, and inconsistent icon families.

Prefer clear rows, strong alignment, purposeful dividers, restrained radii, a few distinct surface treatments, large numeric hierarchy, obvious action states, and direct feedback. Use Lucide icons consistently where they genuinely improve recognition. Never use an icon alone for a critical ambiguous action without an accessible name or label.

### Accessibility and interaction floor

Accessibility is part of Milestone 1—not a later polish pass.

- All interactive controls work by keyboard and touch; visible `:focus-visible` rings remain in place.
- Primary touch targets are at least 40×40 CSS pixels; favor 44×44 where space allows.
- Every form control has a real associated label. Inline errors identify the field and how to correct it.
- Do not rely on color alone: pair debt colors with `+`/`−` signs and text/icon status; use icons/text as well as red/green for errors and success.
- Use semantic controls, proper dialog focus behavior, appropriate labels/ARIA, sufficient contrast, and reduced-motion support.
- Scanner input must not steal normal keyboard navigation or trigger global shortcuts in the wrong screen.
- Test long Uzbek/Russian/Cyrillic labels and large amounts without overlap, clipped text, or unexplained truncation.
- Motion is limited to useful feedback (cart line insertion, payment confirmation, toast appearance/dismissal). Avoid decorative animation.

### Main component inventory

Design a consistent set of reusable, purpose-built components before duplicating UI:

- Custom titlebar and window controls
- App shell/navigation and right shelf panel
- Cart-tab strip and cart line row
- Scanner input, manual product search, product row/tile, category selector
- Money/quantity field, numeric keypad where useful, discount editor
- Payment method selector, tendered amount, split-payment editor, change-due panel
- Client search/create, debt balance display, debt payment form
- Data table/list with empty/loading/error states and date filters
- Confirm dialog for destructive actions
- Toast/inline error, sync status indicator, pending-sync retry control
- Shift status/header, X-report summary, expense entry form
- Receipt preview and print-status indicator
- Settings section, language selector, lock screen

Do not create abstractions that have only one trivial use. Reuse components when they establish a consistent, valuable interaction pattern.

### Design deliverables

Before implementing the full screen set, write `docs/design/DESIGN-SYSTEM.md` containing:

- Chosen design direction and why it fits an 8-hour retail shift
- Color tokens, typography scale, spacing/density rules, radii, borders, elevation policy, and numeric formatting
- Component inventory and key interaction/keyboard behavior
- Screen layout sketches in Markdown/ASCII or a simple flow diagram
- Explicit patterns to avoid

Implement the tokens in one canonical CSS/Tailwind source. Do not scatter unrelated hex values through components. At final review, inspect real application screenshots at common window sizes and both themes, not just component snippets.

---

## 5. Architecture and data-integrity rules

### Rust and React boundaries

Expose named, typed Tauri commands for business operations. Suggested command families (adapt them to the codebase, but document the final list):

- `auth_*`: bootstrap cashier, login, restore session, unlock, logout, get current session
- `shift_*`: open, get active, generate X-report, close
- `catalog_*`: search cached products, get product details, refresh from Firestore
- `cart_*`: list/create/select carts, add scanned product, search-add, update quantity, remove line, clear, park, resume
- `discount_*`: apply/remove line/cart discount through the Rust domain rules
- `sale_*`: quote payment, commit sale atomically, retry pending sync
- `client_*`: search/create client, get balance, collect debt payment
- `return_*`: search eligible own sales, calculate quote, commit partial/full return
- `receipt_*`: list/search/filter, get print data, reprint
- `expense_*`: create expense and list expense types
- `printer_*`: list/refresh system printers, save default, print receipt
- `drawer_*`: open cash drawer through the native adapter or report it unavailable
- `settings_*`: load/save validated settings
- `sync_*`: current state, refresh catalog, retry queue, run/inspect pending work
- `update_*`: check release/version metadata and notify without installing

Use clear typed request/response DTOs. Centralize TypeScript command wrappers; do not scatter stringly typed `invoke()` calls throughout the component tree. Use Tauri events only for useful asynchronous state changes, not as a substitute for a clear command/query contract.

### SQLite requirements

- Database file must live in the application-specific data directory discovered via Tauri APIs; no hard-coded machine path.
- Use explicit, versioned migrations and foreign keys. Enable appropriate SQLite settings for a local desktop workload (`foreign_keys`, WAL where appropriate, and a sensible busy timeout).
- Every sale/return/debt transaction that spans related records must use a SQLite transaction. Never leave a sale without its line items/payments or mutate inventory without the corresponding committed transaction.
- Use parameterized queries. Avoid dynamic SQL built from untrusted user text.
- Persist pending cloud work in SQLite. Zustand or React component state is never the only copy of a cart, shift, sale, client balance, or sync marker.
- Add the minimum indexes needed for barcode lookup, product-name search, cashier-owned sales, date filters, open shifts, client phone/name search, and pending outbox work.
- Prefer understandable SQL and clear domain functions over introducing an ORM or elaborate repository abstraction without a demonstrated need.

### Data model: entities that must exist in the design

Inspect old Flutter/database behavior before finalizing column details, then document the actual schema. The implementation should have clear representations for at least:

- Cashiers and local sessions
- Validated application settings
- Cached products and barcode/scale-PLU mapping
- Shifts
- Active/parked carts and cart lines
- Completed sales and immutable sale-line snapshots
- Payment allocations (cash/card/debt and partial payment)
- Client records and signed client-ledger entries
- Returns and return lines linked to original sale lines
- Financial transaction/ledger records with a `kind` discriminator
- Expenses and their type
- Receipt/print attempt metadata as needed
- Sync outbox and sync state/cursors

A suggested financial `kind` enum is `sale`, `expense`, `debt-payment`, and `return`. This field is required even if the more elaborate chart/breakdown UI is deferred. Do not encode all transaction kinds as unstructured free-text.

### Canonical money, quantity, discount, and inventory rules

- Monetary values use integer storage and one Rust-owned rounding policy. Quantities use integer-scaled units or another precisely documented representation; do not use binary floating point for financial calculations.
- Define how fixed and percentage discounts interact, how fixed-cart discounts are allocated across lines for returns/receipt display, the order of operations, and how rounding remainders are assigned. Store enough sale-time snapshots to reproduce the actual charged price later, even if catalog price changes.
- Do not permit discounts or returns to create negative line totals/quantities unless an explicitly documented credit transaction allows it.
- All stock mutations happen atomically with sale/return persistence. Repeat scans cannot exceed the locally known available quantity. Clearly document that offline stock is only as fresh as the last catalog/inventory refresh; do not imply global real-time stock guarantees when disconnected.
- A single validated domain operation must quote totals and commit the same calculation. Do not compute a preview with different rules from the transaction that is actually saved.
- A failed sale commit must not clear the cart or create a success receipt.

### Sync and idempotency

- Sales must work without a network connection. The local SQLite commit is authoritative for the cashier workflow.
- In the same SQLite transaction as a completed sale, create a durable outbox record with a stable idempotency/document ID and set the sale's sync state to pending.
- Background sync processes durable outbox records. Retries must be idempotent; they must not duplicate a sale, return, client-ledger entry, expense, or parked cart.
- Only mark an operation synced after the remote write is confirmed. Retain a useful error/status for failed sync and make a manual Retry action available in Receipts.
- A process restart must preserve all pending work. Startup resumes eligible operations.
- Parked carts sync to Firestore and expire after seven days. Cleanup should be safe if run repeatedly and should not delete an unexpired cart or active local cart accidentally.
- Catalog refresh writes valid server data into SQLite transactionally; failed refresh must not leave the local catalog half-updated.
- Never place Firebase service-account private keys, privileged server tokens, or equivalent secrets inside the app binary or repository.
- Make store/device scoping and Firestore Security Rules explicit. If authentication or rule configuration is missing, document the blocker rather than bypassing rules or using broad public write access.

---

## 6. Scope and acceptance criteria

Every feature below must be reachable and function through the actual UI. Use this section as a checklist in `docs/M1-PLAN.md`. Each item is `Done` only when its acceptance criteria are verified; do not mark a feature complete just because a screen exists.

### 6.1 Window chrome and lifecycle

- Custom thin titlebar with minimize, maximize/restore toggle, and close.
- Use `getCurrentWindow()` from `@tauri-apps/api/window` and call Tauri's own `.minimize()`, `.toggleMaximize()`, `.close()`, and `.isMaximized()` behavior as appropriate.
- Do **not** maintain a hand-rolled maximized/restored boolean as the source of truth. Refresh the maximize icon from actual Tauri state/event updates.
- Do not call `.setFocus(false)` or `.focused(false)` anywhere in window lifecycle code.
- Add `data-tauri-drag-region` only to empty, draggable titlebar space. Explicitly exclude all control button hit areas from dragging.
- Manually verify at least five cycles of minimize → restore → minimize → restore. Record results in the QA checklist. Do not claim this is verified unless it was actually tested.

### 6.2 Login and session

- Username/password for local cashier accounts. One app role only: cashier; no admin tier.
- Validate credentials in Rust against the SQLite cashier table. Hash passwords; never store plaintext passwords.
- First run has a clear bootstrap path if the cashier table is empty; never ship a universal default password.
- Successful login creates a persisted local session. Restore a non-logged-out session on relaunch according to the documented persistence rule.
- Login, session restoration, lock/unlock, and logout are separate operations. Explicit logout ends the local session; it must not silently close an open shift or discard parked carts.

### 6.3 Shift lifecycle and X-report

- Open and close a shift (`smena`) independently from login/logout.
- Persist opened/closed times and the cashier associated with opening/closing.
- X-report is a non-destructive snapshot for the current open shift, viewable repeatedly. Include opened date/time and cash/card totals; include expenses and debt collections so the figures reflect real cash movement.
- Define cash figures as **net drawer movement**, not raw cash tendered including change given back. Separate cash, card, debt, expenses, returns, and net totals clearly enough to reconcile.
- Closing is blocked while this cashier/device has a sale marked pending sync, according to the stated rule. The UI must name the count/reason and expose retry/status navigation; no silent disabled button.
- Record and surface the operational consequence: under the current rule, a long outage can block shift closure. Do not silently change this rule.

### 6.4 Screen lock

- Lock screen is separate from logout and preserves the open shift and carts.
- Manual lock is available.
- Auto-lock timeout is configurable through sensible minute options and persisted through Rust.
- Count relevant keyboard/touch/mouse activity as activity, including scanner input; do not trigger cashier shortcuts while locked.
- Unlock requires the active cashier's credential. Use persisted last-activity time so a long app suspension/relaunch cannot bypass timeout.

### 6.5 Product search, scan, and cart

- Two distinct input paths: a scanner-wedge field that auto-submits on scanner Enter and a manual search by barcode or name that submits on Enter.
- Unknown barcode shows a clear toast and does not alter the cart.
- Repeated scan of the same barcode increments the quantity up to the locally available stock; further increments are blocked with a specific explanation.
- Weighted-item EAN-13 parsing uses configurable prefixes (default `27`, `28`, `29`) **and** an explicitly confirmed format: PLU/product digits, weight-or-price digits, decimal scale, and check-digit behavior. Parse only in Rust. Compute charged price at scan time and persist the parsed quantity/price snapshot. Do not treat prefix-only configuration as a complete format definition.
- Up to 10 active carts/tabs.
- Park a cart with a name and resume it later, including on a later date. Park/resume persists locally and syncs to Firestore when configured.
- Remove a line and clear a cart only after a confirmation step. Make confirmation specific (what will be removed) and keyboard accessible.
- Persist cart state in SQLite. On startup, if carts were recovered, show a notice like “Recovered N unsaved carts” with a way to review them. Recovery must not duplicate a completed sale.
- Local cart state survives app restart. The outbox is persisted independently from in-memory React state.

### 6.6 Discounts

- Per-line and whole-cart discount flows, with four modes: line percentage, line fixed amount, cart percentage, cart fixed amount.
- Any cashier may apply a discount; no PIN/approval gate in M1.
- Rust owns discount calculations. Validate ranges, prevent discounts exceeding the eligible amount, use the documented rounding/line-allocation rule, and preserve sale-time details so returns and reprints remain correct.

### 6.7 Returns

- Return only completed sales; no pre-payment void flow is required.
- Support full return and partial return by selecting eligible line quantities.
- Hard restriction: a cashier can only search, inspect, and return their own sales. Enforce this in Rust/SQLite using the authenticated active session—not merely by hiding rows in React.
- A return cannot exceed quantity sold minus quantity already returned. Validate within the transaction to prevent duplicate/concurrent over-return.
- Apply the confirmed refund/stock/debt policy from `docs/M1-DECISIONS.md`. Use an immutable link to the original sale and preserve original net prices/discount allocations.

### 6.8 Payments

- **Cash:** tendered amount defaults to exact total and can be overwritten. Show change due clearly. Do not let an underpaid cash sale complete unless a supported split/debt remainder flow explicitly covers the unpaid amount.
- **Split cash/card:** card amount is the value the cashier types; cash amount updates live to the remainder. Validate the card amount within the valid range and never silently create negative cash.
- **Card:** no terminal integration in M1. Cashier explicitly confirms paid by card.
- **Keyboard:** F1 selects cash and F2 selects card from the cart screen only. Shortcuts must not fire on the login, lock, settings, receipt, or text-entry contexts when doing so would be surprising.
- Payment quote and sale commit must use the same Rust calculation. Sale, lines, payment allocations, stock changes, receipt/sync metadata, and financial entries are committed atomically.

### 6.9 Client credit / debt sales

- Dedicated debt tab in payment flow.
- Search clients by name or phone; no manual ID entry. Allow inline creation if no client is found, with validation for required fields and duplicate phone handling.
- No credit limit in M1. Partial payment at sale time is supported; only the unpaid remainder becomes debt.
- Signed balance convention: positive means the client has credit with the store; negative means the client owes the store. Display sign and text/icon as well as color.
- A debt sale subtracts the unpaid remainder from client balance; the amount paid at sale time is recorded under its actual tender method. A separate Pay debt flow finds the client, enters amount, validates the amount according to the chosen policy, records a `debt-payment` transaction, and adds the paid amount to the client's balance.
- Display the selected client's current balance before confirming a debt sale.
- Client ledger and associated payment/financial rows update atomically. Do not maintain competing, independently editable versions of the same balance.

### 6.10 Receipts and sales history

- Receipt/history view lives in the side panel alongside selling, settings, and quick products.
- Search by product name or barcode and filter by date range.
- Scope sales/receipts to the active cashier. Enforce the scope again in Rust queries.
- Reprint is available from this view.
- Represent the required statuses clearly: `success`, `success-with-discount`, `debt-added`, `debt-removed`, `partially-returned`, `fully-returned`, and `unsuccessful-with-internal-error`.
- Derive the displayed status from persisted sale/payment/return/operation state where practical; do not let a frontend label diverge from the database. Internal errors must be logged usefully without displaying secrets or sensitive stack traces to the cashier.
- Pending sync and retry state must be visible and survive relaunch.

### 6.11 Printing

- Refreshable list of system-available printers with visible loading/error/empty states. Allow a selected default printer to be saved.
- Support 58 mm and 80 mm thermal receipt widths.
- Auto-print after a successful sale by default; a settings toggle disables it.
- Investigate the current Windows/Tauri printing options before choosing an implementation. Use a real Rust command boundary and an actual supported Windows printer API/driver strategy. Do not assume a maintained official cross-platform Tauri printer plugin exists, and do not shell out to arbitrary PowerShell commands with unsanitized input.
- When no printer is configured or available, complete the sale successfully, preserve the receipt, and clearly state that printing was skipped. Never label it printed.
- Reprint uses the immutable receipt data from the original sale.

### 6.12 Cash drawer

- Trigger points: sale completed, debt payment completed, expense logged.
- Put the device action behind a Rust command/adapter. Actual hardware signaling may be stubbed during M1 if no physical device is available, but the trigger locations and call boundary must be real.
- In a no-device environment, report “cash drawer unavailable/not configured” to logs/status without failing or duplicating the financial transaction.

### 6.13 Expenses and transaction kinds

- Cashier selects an expense type from a flat M1 list and enters an amount.
- Persist a structured `kind` distinguishing `sale`, `expense`, `debt-payment`, and `return` (at minimum the first three are mandatory in M1).
- A cash expense appears in the X-report as drawer outflow and is not accidentally counted as a sale.
- Validate amount and required fields; after a successful local commit, trigger the cash-drawer boundary.

### 6.14 Offline-first Firestore sync

- The full scan → cart → pay → persist → receipt path works with no network connection.
- Product catalog has a manual refresh action that fetches from Firestore, validates records, and updates the local cache transactionally.
- Completed sales sync in the background. If offline, the sale is stored locally with a durable `pending` marker and an outbox record.
- Receipts includes a manual Retry action for pending/failed sync work and explains the current state.
- Pending work survives application restart. Retries are idempotent and do not duplicate remote documents or local ledger entries.
- Firestore authentication/security rules and store/device scoping must be real. Never use a hard-coded privileged service account in the app or make collections publicly writable to get a demo working.
- If remote configuration is absent, clearly mark cloud behavior as blocked by configuration and document the exact requirement. Do not claim full end-to-end cloud sync has been tested.

### 6.15 Settings and update notification

- Language selection for Uzbek Latin, Uzbek Cyrillic, and Russian. Set up an actual key-based i18n structure now even if M1 strings are not completely translated. Do not hard-code all copy directly in component JSX.
- Printer selection and paper width, auto-print toggle, weighted barcode configuration (including encoding fields, not just prefix), lock timeout, dark/light theme, and Windows launch-on-startup toggle.
- Persist and validate settings through Rust. Frontend may hold a reactive display copy but is not the persistence owner.
- Update check is notify-only, daily, non-blocking, and never automatically installs. Re-notify until updated. Inspect the existing GitHub/release/update configuration; if no release endpoint/signing configuration exists, document the missing setup instead of inventing it.
- Updates and network failures must never block cashier actions.

---

## 7. Keyboard, scanner, dialogs, and operational-state details

- Define a central keyboard-shortcut map and document it. F1/F2 are context-scoped. Escape closes non-destructive dialogs where safe; it must not silently drop a cart or a sale in progress.
- Barcode scanner input commonly behaves like a keyboard wedge. Avoid fragile assumptions about scanner hardware. Use a dedicated focusable scanner field, recognize Enter at the boundary, and keep focus handling predictable after a successful scan.
- Use debounce only where it improves manual search; never debounce away rapid distinct barcode scans.
- Provide empty, loading, success, and one clear failure state for every major flow. Failure state must say what happened and the next action, not only “Error.”
- Confirm destructive actions with dialogs containing the concrete object/amount affected. Do not force confirmation for every harmless tap.
- Prevent accidental duplicate submit from rapid tapping, Enter repeats, retry actions, and slow printing/network operations. This must be enforced in the domain/transaction design where duplicate operations would be harmful—not merely by disabling a button for a moment.
- Loading states should be calm and purposeful. No full-page spinner for a routine local SQLite query.

---

## 8. Focused tests and manual verification

A full exhaustive test suite is out of scope, but **a small set of deterministic tests for money and financial invariants is required**. These are not optional polish; an incorrect payment or over-return is a correctness defect.

### Minimum automated checks

Add narrowly scoped Rust tests for:

- Percentage/fixed discounts, cart discount allocation, rounding, zero/negative/over-limit values
- Weighted-barcode parsing using confirmed sample labels and invalid check digits
- Cash/change and split cash/card calculations
- Debt balance deltas for debt sale, partial payment, and debt collection
- Return quantity limits and preservation of original discounted price
- Cashier ownership scoping for sale/receipt/return queries
- Shift-close rejection when pending sync exists
- Idempotent outbox retry behavior, where practical with a local/temp SQLite database

Avoid building a large testing framework or a test suite for every visual detail. For UI and platform behavior, use the manual checklist below.

### Required local checks

Use actual repository scripts from `package.json` rather than inventing script names. Run all available relevant checks, such as frontend type-check/lint/build and Rust formatting/clippy/tests. Run the Tauri development/build command if the environment supports it. Distinguish environment/toolchain blockers from product code errors.

### Manual smoke checklist

Record `Pass`, `Fail`, or `Blocked` with the reason in `docs/QA-M1.md`:

1. First-run cashier bootstrap; login; invalid credentials; restore session after closing/relaunching.
2. Minimize/restore cycles (at least five), maximize/restore icon correctness, close control, titlebar drag behavior, and absence of `.setFocus(false)`/`.focused(false)`.
3. Scan known product; unknown barcode; repeat scan increments; stock limit blocks; manual barcode/name search.
4. Add items to multiple carts; park; restart app; recover unsaved cart; resume later; expire old parked carts safely.
5. Apply each of four discount modes; verify visible total equals persisted sale total.
6. Complete cash, card, split, and debt sales. Verify tendered amount, change, payment allocations, client balance, receipt status, inventory, and outbox after each.
7. Complete a partial and full return under the approved refund policy; attempt an over-return and a return of another cashier's sale.
8. Open shift; view X-report repeatedly; log an expense and debt payment; check net cash/card totals; confirm close block for pending sync and success after sync clears.
9. Disable auto-print; try print with no printer configured; reprint from receipts; verify messages do not falsely claim a no-op succeeded.
10. Toggle language, theme, auto-lock, lock/unlock, auto-start, and update check. Ensure network/update errors do not block selling.
11. Disconnect network: search cached products, complete a sale, relaunch, confirm pending status, reconnect, retry, and confirm exactly one remote sale if Firebase is configured.
12. Keyboard-only navigation and focus visibility; touch target check; long Cyrillic/Russian/Latin labels; large totals; no clipped content at selected resolutions.

Do not mark hardware or Firestore acceptance criteria as `Pass` without testing actual behavior. Use `Blocked` with an exact reason when physical hardware or credentials are unavailable.

---

## 9. Deliverables

The repository must contain:

1. **Runnable Kassa Tauri app** with the real primary local workflow: launch → login/session restore → open shift → scan/search → cart → discount → cash/card/split/debt payment → persisted sale/receipt → print or honest no-printer result → X-report → close shift when allowed.
2. Every scope section in §6 represented in the UI, with real working behavior or a clearly documented external prerequisite where the real integration cannot be verified.
3. `ARCHITECTURE.md` — concise description of Rust/React boundary, command families, frontend-only state, SQLite schema, migrations, sync/outbox behavior, and simplified M1 areas.
4. `docs/M1-RECONNAISSANCE.md` — initial repository audit and baseline checks.
5. `docs/M1-DECISIONS.md` — judgment calls, safe defaults, unresolved blockers, and decisions requiring product-owner confirmation.
6. `docs/design/DESIGN-SYSTEM.md` — token system, type/spacing scale, component inventory, screen layout, prohibited visual patterns, and rationale.
7. `docs/M1-PLAN.md` — feature-by-feature implementation/acceptance checklist with current status.
8. `docs/QA-M1.md` — build results, focused test results, manual smoke checklist, titlebar cycle results, and blocked items.
9. `.env.example` or an equivalent configuration example containing variable names and placeholders only—never secret values.

Document every unstated judgment call that affects behavior, schema, authentication, financial calculation, or operations. Examples include session restore/lock behavior, background sync interval, retry policy, expiry cleanup cadence, currency scale, return/refund logic, and how the first cashier is created.

### Final report format

At completion, report only what evidence supports:

- **Implemented and verified** — list the exact workflows and checks that passed.
- **Implemented but not verified** — list why runtime/platform/cloud/hardware testing could not be performed.
- **Blocked** — list exact external configuration or product decision needed.
- **Important decisions made** — link to `docs/M1-DECISIONS.md`.
- **Run/build commands** — actual commands from the repository and whether they succeeded.

Never say “everything works” merely because the code was written. State any incomplete feature directly.

---

## 10. Final instruction

Begin with repository reconnaissance and the skill/reference review. Report any foundational blockers and proposed defaults **before committing to them**. Continue with independent, reversible work while blockers are resolved. Then implement the feature checklist above in small, verifiable vertical slices, keep the design system coherent, verify actual behavior, and leave the repository in a readable state for Milestone 2.

Optimize for **correctness under real cashier use, clear data ownership, an unusually disciplined UI, and honest verification**. Do not optimize for code volume, novelty, abstractions, or a screenshot that merely looks finished.

---

## Research references

These are starting points for the builder to re-check—not a substitute for inspecting current source and documentation.

- [Anthropic Skills repository](https://github.com/anthropics/skills)
- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills)
- [Vercel Design Systems to Agent Skills](https://github.com/vercel-labs/design-systems-to-agent-skills)
- [Superpowers](https://github.com/obra/superpowers)
- [shadcn/ui](https://github.com/shadcn-ui/ui)
- [Tauri v2 documentation](https://v2.tauri.app/)
- [Firestore REST API: authentication and authorization](https://firebase.google.com/docs/firestore/use-rest-api)
- [Tauri SQL plugin documentation](https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/sql) — note that this plugin exposes SQL calls through frontend bindings; this app's architecture expressly requires SQLite access to stay inside Rust commands, so do not use it as a reason to move database access into React.
