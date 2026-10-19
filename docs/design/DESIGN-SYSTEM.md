# Kassa POS — Design System & Visual Contract

**Aesthetic Direction:** Calm Industrial Instrument Panel  
**Target Environment:** 8-hour retail counter shifts on touchscreens & keyboard-driven Windows terminals  
**Locales:** Uzbek (Latin), Uzbek (Cyrillic), Russian  

---

## 1. Rationale: Why Calm Industrial Fits an 8-Hour Shift

Cashiers experience cognitive fatigue, repetitive eye-strain, and continuous physical motion under varying ambient light conditions.
- **Instrument Panel, Not a SaaS Marketing Site:** No decorative hero gradients, no neon glow, no cards with floating drop-shadows.
- **Physical Ledger Metaphor:** Surfaces are separated by razor-sharp 1px hairline rules instead of diffuse shadows.
- **Single Meaningful Accent:** Carbon blue (`#233C8C` light / `#8FA3F5` dark) represents direct action and active selection. When it appears, it demands attention.
- **Tabular Monospace Digits:** Every price, balance, quantity, and total uses `JetBrains Mono` with `tabular-nums`. Changing quantities or recalculating totals never causes numbers to jitter horizontally.

---

## 2. Canonical Color Tokens

| Token | Light Theme | Dark Theme | Semantic Role |
|---|---|---|---|
| `counter` | `#EFF0EA` | `#141713` | Canvas background behind working panels (cool bone grey) |
| `counter-deep` | `#E4E6DD` | `#0F120E` | Titlebar, status bar, inactive folder tabs |
| `paper` | `#FFFFFF` | `#1C201B` | Primary working surfaces, receipt tape, modal bodies |
| `paper-deep` | `#F7F8F3` | `#23281F` | Secondary strips, summary bands, alternating rows |
| `ink` | `#151814` | `#E9ECE2` | Primary text and dominant monetary totals |
| `ink-soft` | `#5F665C` | `#A4AC9E` | Secondary metadata, field labels, units |
| `ink-faint` | `#8B9187` | `#7C857A` | Placeholder text, hotkey tags, disabled hints |
| `rule` | `#D5D8CD` | `#333A30` | 1px hairline structural dividers |
| `rule-strong` | `#B8BCAE` | `#4A5346` | Active input borders, table borders |
| `carbon` (accent) | `#233C8C` | `#8FA3F5` | Action buttons, active cart tab, focused state |
| `success` | `#0E6B3D` | `#64C68F` | Positive deltas, completed sync, client credit (`+`) |
| `danger` | `#A32B23` | `#EF8A80` | Client debt (`−`), destructive actions, offline error |
| `warning` | `#8A5A06` | `#DDB05E` | Applied discounts, pending sync alert |

---

## 3. Typography & Spacing Scale

### Typography Stack
- **Interface Grotesque:** `Golos Text` (Variable, locally bundled) for all UI labels, dialogs, and messages. Native Cyrillic and Latin coverage ensures consistent line rhythms when switching languages.
- **Monospace Financials:** `JetBrains Mono` (Variable, locally bundled) with `tabular-nums` for all quantities, prices, barcode representations, and totals.

### Hierarchy Scale
- **Sale Total Hero:** `38px / 40px`, semi-bold, monospace, high ink contrast.
- **Section & Modal Headers:** `18px / 22px`, medium weight.
- **Table Data / Field Inputs:** `14px–15px / 20px`, regular weight.
- **Secondary Captions & Units:** `11px–12px / 16px`, soft ink.
- **Keyboard Shortcut Badges:** `10px`, monospace, uppercase.

### Touch Targets & Spacing
- Minimum touch target: **40×40px** (primary cart quantity buttons are 44×44px).
- Base spacing unit: **4px** grid (`4px`, `8px`, `12px`, `16px`, `24px`).
- Radius convention: Restrained **2px–4px** for buttons and inputs. No large pill shapes.

---

## 4. Prohibited Visual Patterns (Design Violations)

1. **No SaaS Card Grids:** Do not wrap every field or control in a soft-shadowed white box.
2. **No Color Gradients:** No linear or radial gradient fills on headers, buttons, or backgrounds.
3. **No Decorative Animations:** Cart lines and payment confirmations render crisply without bounce, slide-in delays, or loading choreography.
4. **No Color-Only State:** Client debt must always display the sign (`−`), the numeric amount, and the explicit status text (e.g. `Do'konga qarzdor / Должен магазину`).
5. **No Hidden Focus Rings:** `:focus-visible` must display a clean 2px outline in carbon blue.

---

## 5. Main Screen Architecture (ASCII Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ [BarcodeMark] Kassa POS                   Cashier: Dilnoza R.  [Lock] [Logout]  _ □ ✕   │
├─────────────────────────────────────────────────────────────┬───────────────────────────┤
│ [Shift Open: 08:30]                                         │ [Tape] [History] [Config] │
│                                                             ├───────────────────────────┤
│ SCANNER: [ 4780000000017                        Enter ]     │                           │
│ SEARCH:  [ Type name or barcode...                    ]     │   SHOP NO. 1 - KASSA      │
│                                                             │   Cashier: Dilnoza R.     │
│ [Cart 1 (3)] [Cart 2 (1)] [+]                   [Park Cart] │   ---------------------   │
│ ─────────────────────────────────────────────────────────── │   Coca-Cola 1.5L   14,000 │
│ ITEM                     PRICE   QTY       TOTAL   ACTIONS  │   Non patir         4,500 │
│ Coca-Cola 1.5L          14,000  [-] 1 [+]  14,000   [%] [✕] │   Apple (0.5 kg)    9,000 │
│ Non patir                4,500  [-] 1 [+]   4,500   [%] [✕] │   ---------------------   │
│ Olma (Apple, weighted)  18,000   0.500 kg   9,000   [%] [✕] │   TOTAL          27,500   │
│                                                             │                           │
├─────────────────────────────────────────────────────────────┤   [ Print Receipt ]       │
│ [Discount Cart]  [Park]  [Clear]       TOTAL: 27,500 UZS    │                           │
│                                        [ PAY CASH (F1) ]    │                           │
├─────────────────────────────────────────────────────────────┴───────────────────────────┤
│ ● All sales synced to cloud        Shift: 08:30 (Active)        Local: 17:42:01         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Keyboard Shortcut Matrix

| Shortcut | Scope | Action |
|---|---|---|
| `F1` | Sell Workspace | Instant Cash Payment Flow |
| `F2` | Sell Workspace | Card Payment Flow |
| `F3` | Payment Sheet | Split Cash/Card Payment |
| `F4` | Payment Sheet | Debt Sale Allocation |
| `F5` | Payment Sheet | Collect Client Debt Payment |
| `Enter` | Scanner Field | Submit Scanned Barcode immediately |
| `Escape` | Modals / Dialogs | Dismiss active modal safely without losing cart |
