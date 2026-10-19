# Kassa POS (v1.0.4)

Offline-first Point-of-Sale (POS) desktop application designed for Windows cashiers:
- **Core Stack**: Rust + Tauri v2 backend, React 19 + TypeScript frontend, SQLite (via rusqlite & r2d2) for high-performance offline local storage.
- **Design System**: Human-centered retail cashier workflow inspired by Apple SF Pro typography, rich contrast, tactile feedback, and keyboard/touch navigation.

---

## What's New in v1.0.4

1. **Fixed Printer Discovery at Source**:
   - Replaced deprecated and missing `wmic` with native Windows spooler queries via PowerShell (`Get-CimInstance Win32_Printer` with `Get-Printer` fallback).
   - Graceful startup: scans quietly in the background without throwing false "program not found" error toasts when printers are absent.
   - Manual refresh in Settings provides clear, actionable feedback.
2. **Reorganized Navigation Tab Layout**:
   - Strictly ordered: **Numpad → Cheques (Чеки) → Settings (Настройки)**.
   - Consolidated duplicate receipt concepts into a unified workflow.
3. **Feature-Rich Cashier Numberpad**:
   - Direct item quantity updates (`qty` mode with `+1`, `-1`, `×2`, `×5` steps).
   - Item discounts (percentage `%` and fixed value `UZS`).
   - Cash tender calculator with quick denominations (10k, 20k, 50k, 100k, 200k UZS).
4. **Cart Row Selection & Last-Added Feedback**:
   - Subtle tinted background (`bg-carbon-tint/40`) + left accent indicator bar (`border-l-[3.5px] border-l-carbon`).
   - Clicking a cart row selects it without changing quantity or deleting it.
   - Newly scanned items and incremented items are automatically selected.
5. **Scanner Focus Policy**:
   - Automatic focus returned to scanner input on page load and after every scan.
   - Smart guard prevents stealing focus when deliberately typing into search fields, editing inputs, or inside dialogs.
   - Visual green pulse dot indicates scanner readiness.
6. **Cashier Profile & Balance Top-up**:
   - Cashier profile popover displaying employee ID, register identity, and account balance.
   - Top-up gateway selector for **Click, Payme, Paynet, and Uzum**.
   - **Payment Integrity**: clearly documents missing merchant credentials without simulating fake balance increases.
7. **Deterministic Demo Catalog**:
   - Idempotent seed containing 12 realistic grocery and beverage items.
   - Includes weighted items (e.g. barcode `2700001012503` for 1.25 kg of Golden Apples).
   - Safely isolated under `DEMO_*` category to prevent syncing to production Firestore.
8. **Dual Windows Release Assets & Installer Options**:
   - `kassa_installer.exe`: NSIS installer with desktop shortcut and Windows startup options.
   - `kassa_portable.exe`: Standalone portable executable.

---

## Installation & Packaging Variants

### 1. Standard Installer (`kassa_installer.exe`)
- Standard Windows setup wizard (NSIS) supporting both current user and per-machine installs.
- Installs to `AppData\Local\Programs\Kassa POS`.
- Creates desktop shortcut and start menu folder (`Kassa POS`).
- Provides opt-in Windows autostart integration.
- Clean uninstaller cleans up shortcuts and registry autostart keys.

### 2. Portable Build (`kassa_portable.exe`)
- Standalone single executable.
- Does not require administrative privileges or installation.
- Preserves local SQLite database safely across restarts in `%APPDATA%\com.kassa.pos\kassa.db`.
- Requires WebView2 runtime (pre-installed on Windows 10/11).

---

## Local Setup & Development

### Prerequisites
- Node.js 20+ and pnpm 10 (`corepack enable pnpm`)
- Rust toolchain (stable) for Windows (`cargo`, `rustc`)

### Run in Development
```bash
# Frontend only (emulated mock backend for UI design testing)
pnpm dev

# Full Desktop App (Tauri v2 + Rust backend)
pnpm tauri dev
```

### Build & Typecheck
```bash
pnpm exec tsc -b
pnpm build
pnpm tauri build
```

---

## Hardware & Printer Troubleshooting

- **Thermal Receipt Printers (58mm / 80mm)**: USB and network printers installed in Windows Print Management are enumerated automatically.
- If discovery fails or is empty: Ensure the printer driver is installed in Windows Settings → Printers & Scanners. No `wmic` dependency is required.
- **Barcode Scanners**: Standard USB HID keyboard-wedge scanners work out of the box. Ensure the scanner transmits a carriage return (`Enter`) suffix.

---

## License & Credits
Proprietary & Confidential. All rights reserved.
