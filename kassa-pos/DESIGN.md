# Kassa — interface design

This is the reasoning behind the rebuilt interface: what it is trying to be,
which choices were deliberate, and what was deliberately left out.

## The brief

A cashier stands at a counter for eight hours, often in a hurry, sometimes in
poor light, in Uzbek (Cyrillic and Latin) and Russian at the same time. Numbers
are the work: prices, quantities, totals, change. Everything else is noise.
The interface is an instrument panel next to a barcode scanner, not a
marketing page and not a SaaS dashboard.

## Tokens

| Token | Light | Role |
| --- | --- | --- |
| `counter` | `#EFF0EA` | the work surface behind panels, a cool bone grey — not cream |
| `counter-deep` | `#E4E6DD` | titlebar, status bar, inactive tabs |
| `paper` | `#FFFFFF` | surfaces that hold content: ledger, receipt, dialogs |
| `paper-deep` | `#F7F8F3` | secondary strips inside a panel |
| `ink` | `#151814` | text and the strongest rules |
| `ink-soft` / `ink-faint` | `#5F665C` / `#8B9187` | labels, captions, tertiary meta |
| `rule` / `rule-strong` | `#D5D8CD` / `#B8BCAE` | 1px separators instead of shadows |
| `carbon` | `#233C8C` | the single accent: actions and the current selection |
| `success` / `danger` / `warning` | `#0E6B3D` / `#A32B23` / `#8A5A06` | money states, always paired with a sign or word |

Carbon blue is the colour of a carbon-copy invoice pad; it is reserved for
action and selection so that when it appears it means something. Debt states
never rely on colour alone: the balance always carries a `−`/`+` and a word
("Должен магазину", "Do'konga qarzdor").

Dark mode re-maps the same tokens (`:root[data-theme='dark']`), keeps the
hierarchy, and was checked for contrast: body 15.1:1, secondary text 7.7:1,
primary button 13.8:1, smallest caption 4.7:1.

## Type

- **Golos Text** (variable) for everything human — a Cyrillic-native grotesque,
  so Cyrillic and Latin hold the same rhythm and the layout does not break when
  languages switch.
- **JetBrains Mono** for every number, tabular and monospaced, so digits do not
  jitter while totals update and columns of figures line up like a ledger.

Both are bundled locally with `@fontsource-variable/*` — the app must not need a
network request to draw a price.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▮▮▮ Kassa  demo                          ДР Дилноза Р.  ⚿ ⏻   _ □ ✕      │ 9
├─────────────────────────────────────────────────┬────────────────────────┤
│ [Смена закрыта]                                 │  Чек │ Чеки │ Настройки│
│ Сканер      [ 4780000000017      Enter ]        │ ┌──── receipt tape ──┐ │
│ Поиск       [ название, код              ]      │ │ Магазин №1         │ │
│ Чек 1 ③ │ + │                        Отложить   │ │ Кассир  Дилноза Р. │ │
│ Товар          Цена     Кол-во   Сумма  Действия│ │ Non patir     4 500│ │
│ Coca-Cola   14 000   − 1 +    14 000  %  ✕      │ │ Olma 0.5кг   9 000 │ │
│ Olma        18 000   0.5 кг    9 000  %  ✕      │ │ ─────────────────  │ │
│                                                  │ │ Итого       27 500 │ │
│ [Скидка][Отложить][Очистить]  Итого 27 500 [Оплатить F1]                 │
├─────────────────────────────────────────────────┴────────────────────────┤
│ ● Все чеки отправлены        ○ Смена с 08:30            17:42            │
└──────────────────────────────────────────────────────────────────────────┘
```

Left: the work. A scan field that owns focus, an optional search with a results
list, folder tabs for up to ten open receipts, and the receipt as a hairline
ledger with inline quantity controls and per-line discounts. Beneath it, one
band: cart actions on the left, the total as the largest type on the screen on
the right, next to the primary action.

Right: the customer's printed receipt, 360px wide, ending in a sawtooth tear.
It mirrors the cart in monospace and prints the shop, cashier, date, line items
and total. This is the one memorable element; everything else stays quiet.

Money methods open as a 1060px sheet: five keys (Naqd, Karta, Aralash, Qarzga,
Qarzni to'lash) with `F1`–`F5`, a real 3×4 keypad on the right of the active
field, quick denominations, live change, and the receipt composition with the
running allocation in the margin. `Enter` never completes a sale; only the
labelled button does.

## Principles

1. **One accent.** Carbon means action or current selection; nothing else.
2. **Rules, not shadows.** Surfaces are separated by 1px lines, like printed
   paper. The only shadows are the dialog sheet and its scrim.
3. **Digits are furniture.** Every amount is monospaced and tabular.
4. **State is never colour alone.** Debt carries a sign and a word; sync state
   carries a dot and text.
5. **Motion explains change.** A new ledger row prints in, the payment sheet
   rises, a toast slides. Nothing animates on load, and every effect is dropped
   under `prefers-reduced-motion`.
6. **Keyboard is a first-class path.** Scan field focused on entry, `F1`/`F2`
   from the workspace, `F1`–`F5` in the sheet, visible focus rings everywhere,
   ≥40px touch targets on quantities and control keys.

## Review against the usual defaults

- Warm cream + terracotta serif (the current AI default): avoided. The base is
  a cool bone grey with white paper, and the accent is carbon blue.
- Near-black with a neon accent, gradient washes, identical rounded cards with
  one soft shadow: avoided — the layout is a ledger plus a receipt tape, not a
  card grid.
- All-caps eyebrow labels, middle-dot meta strings, arrows appended to buttons,
  numbered `01 / 02 / 03` markers: avoided. The only numbering is the printed
  line number on a receipt, which is genuinely a sequence.
- Big-number-hero-with-gradient-accent: the total is large because the total is
  the work, but there is no gradient and no supporting stat row.

## What was removed before shipping

- A store-name strip next to "Быстрое добавление" — it repeated the receipt
  header and had no job.
- Decorative hover transitions on every row; only rows that change state move.
- A gradient wash behind the login panel; it is now a flat sheet on ruled
  counter paper with a barcode wordmark.
- The four-method payment modal with duplicated totals; the sheet states the
  amount to pay once, at the top, and allocates it once, in the margin.

## Where the design is deliberately plain for now

The product grid is a quick-add list, not a category browser; card payment is a
statement of intent rather than a terminal integration; and the X-report is a
list of figures without the sale/expense charts the schema already supports.
Those are recorded in `ARCHITECTURE.md` as M1 scope, not oversights.
