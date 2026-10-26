# Changelog

All notable changes to the Kassa POS application are documented here.

## [1.0.6] - 2026-10-26

### Improved
- **Touch device mode**: Added touch_deviceMode setting in Settings that switches UI to touch-optimized layout; when enabled, shows toast reminder to restart app for changes to take effect.
- **UI restyling for touch**: Enlarged touch targets (minimum 44px), increased base font size, simplified padding and spacing for finger-friendly interaction.
- **Settings toggle**: New "Режим сенсора экрана" option in Settings panel allows switching between normal and touch modes; selection persists across app launches.

## [1.0.5] - 2026-10-26

### Improved
- **Numpad panel simplified**: Removed quick step buttons (±1, ×2, ×5) for cleaner interface; number grid remains fully functional.
- **Performance fix**: Reduced main thread blocking during sales flow; auto-print removed to prevent app freeze.
- **Competitive analysis**: Researched 8+ POS competitors (Hippo, RAOS, MoySklad, Poster, AliPos, iiko, X2 POS, E-POS) for Uzbekistan market. Key findings: most charge monthly subscriptions (249K-799K UZS/month); our desktop app offers one-time licensing with offline-first SQLite caching and no recurring fees.
- **Printer UI improved**: Printer selection settings retained for manual printing; auto-print disabled to prevent blocking sales flow.

## [1.0.4] - 2026-10-19

### Added
- **Native Windows Printer Discovery**: Replaced deprecated `wmic` with supported `Get-CimInstance Win32_Printer` / `Get-Printer` enumeration, resolving the startup error `Failed to run wmic: program not found`.
- **Feature-Rich Numpad Panel**: Created dedicated cashier numberpad panel supporting:
  - Quantity mode (`qty`) with item discount modes (`%` percentage and fixed `UZS` sum).
  - Cash tender calculator with quick denomination buttons (10k, 20k, 50k, 100k, 200k UZS).
- **Navigation Structure & Tab Order**: Fixed exact tab layout: **Numpad → Cheques (Чеки) → Settings (Настройки)**.
- **Cart Row Selection**: Clicking cart lines highlights with subtle tint and left border indicator. Last-added or incremented items auto-select immediately.
- **Reliable Scanner Focus**: Default focus policy targets scanner input without interrupting active text entry in search or modal dialogs; visual ready pulse indicator added.
- **Cashier Profile & Balance Top-up**: Clicking cashier name opens profile modal showing cashier ID, workstation ID, current balance, and top-up options for **Click, Payme, Paynet, and Uzum**.
- **Payment Integrity Guarantee**: Realistic provider selection and attribution without fake credit simulation when merchant API keys are unconfigured.
- **Demo Products Seed**: Added idempotent `load_demo_products` and `clear_demo_products` commands with 12 items including weighted items (`2700001012503`).
- **Dual Release Packaging**: Release workflow builds and publishes both `kassa_installer.exe` (NSIS with shortcut and startup options) and `kassa_portable.exe`.
- **Apple SF Pro Fonts**: Localized typography bundle for high legibility on POS displays.

### Changed
- Replaced separate redundant "Chek" and "Cheklar" tabs with consolidated Cheques history.
- Synchronized Windows autostart registry entry with in-app autostart toggle.

### Fixed
- Fixed NSIS schema validation in `tauri.conf.json` by removing unsupported fields and adding `installerHooks`.
- Fixed tab closing button interaction avoiding accidental cart switches.
- **Fixed**: Auto-print removed to prevent app hanging during receipt printing; printing is now manual via printer dialog.

## [1.0.3] - 2026-10-18

- Initial release with offline SQLite caching, multi-cart support, shift management, and receipt printing stubs.