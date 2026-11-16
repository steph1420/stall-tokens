# v2.0.0 build status (2026-11-16 16:20 IST) — untested WIP

Stopped early on Steve's request (quota). Nothing deployed; main untouched.

## Done
- Docs: ARCHITECTURE (pluggable transport, Bluetooth sync/printer backlog, D-MIGRATE and /beta/ dropped), FEATURES, ADR-0003, CHANGELOG.
- Scaffold from app-starter v0.1.0; stall night/day tokens (contrast 336/336 pass).
- Contract (op log v2), data layer (IndexedDB, device prefs, tab channel, fake transport, sync engine), fold, bill/pay/token/UPI rules, counter + catalog actions. 50 unit tests pass.
- Counter UI: launch, menu, billing, payment (split, slider, numpad, tip, waived, QR, count notes), open orders, all counter sheets, calm PWA update. Typecheck, lint, stylelint, depcruise and build pass.
- Fixed during a quick look: typing UPI left cash unchanged (refit/addTip + tests); paid screen showed total without tip.

## Left
- Verify + break-it run (e2e at 390/360, night/day), docs/VERIFY_LOG.md, docs/CROSSCHECK.md, check-in screenshots.
- docs/SHEET_SETUP.md; Sheet transport; token slip component (F-42); Kitchen, stations and remaining screens.
- IndexedDB-unavailable fallback (shows an error screen now); ₹0 orders on the payment screen.
- PWA PNG icons (SVG only now); agent-common plan note.
