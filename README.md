# Stall Tokens
Ordering, billing and token app for a fair stall: Counter (menu, billing, payment), Kitchen and stations, money, settle-up and stock. Offline-first PWA; every phone keeps the whole op log and syncs through a Google Sheet bridge.

- Docs: `docs/ARCHITECTURE.md` (read first), `FEATURES.md`, `docs/adr/`, `CHANGELOG.md`, `docs/STATUS.md`. Still to come: `docs/VERIFY_LOG.md` (verify run) and `docs/SHEET_SETUP.md` (Sheet bridge).
- Develop: `npm ci`, `npm run dev`. Full gate: `npm run check`. End-to-end (Playwright, `playwright.config.ts`): no specs yet; they come with the verify run.
- v1 (the original single file) lives in `legacy/v1/index.html`.
