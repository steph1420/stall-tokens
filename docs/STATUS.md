# v2.0.0 build status (2026-11-16 17:20 IST) — counter + kitchen + station built; untested beyond unit/UI tests

Stopped early on Steve's request (quota). Nothing deployed; main untouched.


## Build pass 3 (2026-11-16 19:35 IST onwards, Pos; Steve 19:31 / 19:33)
- Sheet (Q-SHEET-DEPLOY): "Stall Tokens — Data (v2)" in Steve's Drive (link not kept in the repo); Code.gs schema v1. Web app deploy waits for Steve (docs/SHEET_SETUP.md).
- Sign-in links (F-44): Developer > Sign-in links; passcode off by default (code kept). Test: `src/data/join.test.ts` (2). Shots: `s80-signin-links`, `s81-link-opened-station`.
- Shared tip choices / round-off steps (F-45): Settings, Payment tip row, Billing round-off. Test: `src/store/rules/amounts.test.ts` (2). Shots: `s85-settings-tips-edit`, `s86-billing-roundoff-edit`, `s87-payment-tips-edit`.
- Paste stock Menu / Stock only per new thing (F-46, Q-SUPPLY-CONFIRM B, replaces D-STOCK-SUPPLY's always-supply). Test: `src/store/stock.test.ts` (2). Shot: `s52-paste-menu-or-stock`.
- Bluetooth slip printing (F-41): ESC/POS over Web Bluetooth, falls back to window.print 58 mm. Not tried on a real printer (none here). Test: `src/store/rules/escpos.test.ts` (1). Shot: `s71-token-slip-bt` (printer refused → reason + Print (58 mm)).
- Settle-up extras (F-47, Q-SETTLE-EXTRAS C): exact / share split, fewest transfers, share receipt, reminders, receipt photos (on the phone only). Test: `src/store/settleExtras.test.ts` (2). Shots: `s44-settle-fewest-transfers`, `s45-settle-person-remind`, `s46-settle-exact-split`, `s47-money-receipt-added`, `s48-money-receipt-view`. Limits: Remind me in 1 h fires only while the browser keeps the app alive; photos are not backed up.

## Build pass 2 (2026-11-16 18:35 IST onwards, Pos; Steve "build as much as you can")
- New Orders / Open Orders (F-05, F-43, Q-ORDERS-1 v3): top tabs; New Orders = Menu / Billing / Payment + one current-order line (chips row and the old Open orders drop-down removed); Open Orders = cyan band + Overview, one big squircle per order (header swipe / tap = order sheet), Lines / Cards, Confirm / Confirm all, Mark ready, hidden tap-to-change (D-OPEN-TAP), bar Cancel order + Handover. `order.client` op. Tests: `src/ui/counter/open/OpenOrdersScreen.test.tsx` (2). Shots: `/workspace/pos-shots/s2[0-4]-*`.
- Money (F-23..F-25): home + entry + Paid by / Mixed + Refunds due; ops `person.set`, `entry.add`, `entry.void`; Stall list on launch and ⋯ (D-NAV). Tests: `src/store/money.test.ts` (2). Shots: `s3*`.
- Settlement (F-26..F-29): Settle up + Partners + Person sheet + Mark cleared note; ops `settle.pay/clear/undo`, `day.lock`; balances carry over across days; lock blocks money changes (D-LOCK-SCOPE). Extras built in pass 3 (F-47). Tests: `src/store/settle.test.ts` (2). Shots: `s4*`.
- Stock (F-30, F-31): Stock screen + Paste stock sheet; parser per Q-STOCK-SET; one Spent entry per paste; new pasted things are supply items (D-STOCK-SUPPLY). Tests: `src/store/rules/stock.test.ts` (2), `src/store/stock.test.ts` (1). Shots: `s5*`.
- Open the stall (F-32), History (F-33), Settings (F-34) with the D-ACCESS passcode gate. Tests: `src/ui/stall/StallScreens.test.tsx` (2). Shots: `s6*`.
- Sheet bridge (F-35): client transport + `apps-script/Code.gs` + `docs/SHEET_SETUP.md` + Settings > Sync. Not deployed and no Google resources made (needs Steve: Q-SHEET-DEPLOY). Tests: `src/data/sheetTransport.test.ts` (2). Shot: `s65-settings-sync`.
- Token slip (F-42): `ui/slip/TokenSlip.tsx`, Print token on the paid screen (D-SLIP). Test: `src/ui/slip/TokenSlip.test.tsx` (1). Shot: `s70-token-slip`.
## Kitchen + Station (2026-11-16 17:20 IST, Pos; Steve "continue")
- Built: Kitchen (F-19), Counter Done? row + Hand over (F-20), Station page with three looks and Overview (F-21), auto-prep (F-22); Launch opens Kitchen and each station; `order.priority` op.
- Gaps closed: ₹0 orders ("Nothing to collect" + To kitchen); IndexedDB missing or blocked now runs in memory with a calm banner.
- Tests: `src/store/kitchen.test.ts` (2), `src/ui/kitchen/KitchenScreen.test.tsx` (2), fallback test in `src/data/data.test.ts`. 55 tests pass. No e2e or break-it run yet (D-TESTS lean).
- Check-in shots (not in the repo): `/workspace/pos-shots/k0*-{night,day}.png`.
- Deviations from the mockups (for Steve): Kitchen has a Back chevron to the start screen; Station header has an Overview button (the look picker and auto-prep switch live in its sheet until Settings exists).
- Kitchen locks (Steve 16 Nov 17:23 IST) built: Q-HANDOVER-1 C (Counter and station), Q-PRIORITY-1 C (hold the order number, and a Billing switch), Q-PAUSE-1 A (automatic, as ops), Q-COUNT-1 A (Done? not counted), Q-COUNTER-FINISH (Mark ready from Open orders, `line.finish` op, "Marked by counter"), Q-OVERLAY (Completed / Cancelled veil, view-only), Q-CANCEL-1 A (`order.cancel`, refund due flagged for Money; refund UI not built), Q-MARK-1 B (expanded Open orders cards, Mark ready per line). 61 tests pass. Shots: `/workspace/pos-shots/k08-billing-priority`, `k09-kitchen-paused`, `k10-station-handover` (`-night`/`-day`).

## Standards audit vs agent-common 06 v2 (2026-11-16 17:20 IST, Pos). `npm run check` green after the fixes: pins, leak scan, build output, feature IDs, typecheck, lint, stylelint, depcruise, contrast 336/336, 50 tests, build.
Read: CODING_SYSTEM_ROLLOUT, 01-09, 06 v2, STYLE_GUIDE, CONTRIBUTING, checks/, templates/, ADR-0001 (agent-common `a6160a3`). Verdict: largely up to standard (layers, tokens + CSS Modules, no Tailwind, framer-motion only in `src/motion`, storage prefix `stall-tokens.v2`, strict TS, exact pins, ADRs, feature IDs). Small gaps fixed:
- `checks/check-build-output.mjs` re-copied from agent-common `ab6431f` (was `88c9672`, missing the locked-archive skip).
- New `scripts/check-feature-ids.mjs` (orphan-ID check, 06 rule 7) in `npm run check`.
- NOT pushed (the box's GitHub login has no `workflow` scope): CI change to run on `feat/**` pushes (it only runs on `main` and PRs), add the feature-ID step, fix the stale "only a starter" comment. Patch kept on the box at `/workspace/pos-ci-workflow.patch`; needs Steve (Q-CI-1).
- Silent catch in device prefs now logs; failed sync rounds now log (STYLE_GUIDE 7, 13).
- Slider label edge moved from inline numbers to `CONFIG.payment.sliderLabelEdge`; inline `width: 100%` moved to a CSS Module class (no visual change).
- FEATURES.md: Test column lists only tests that exist (06 rule 12); added F-42 token slip. README no longer points at missing files or an `e2e` script.
- `npm run lint` was actually failing at `cba6b04` (e2e files and `playwright.config.ts` outside the TS project, browser globals in `e2e/shots.mjs`), so the earlier "lint passes" note was stale. Fixed: tsconfig includes `e2e/` and `playwright.config.ts`, e2e scripts may use browser storage globals, `PW_CHROME` read without Node types.
- e2e demo serving name changed to the codename `Server-A`.
- `.dependency-cruiser.cjs` local change (skip `virtual:pwa-register`) is now labelled; to offer upstream.
Open (not fixed, need Steve or a later bundle): no UI component tests and no e2e specs yet (verify run); `e2e/seed-plain.mjs` duplicates the demo fixtures in plain JS (STYLE_GUIDE 3, warn only); `npm run check` has no tokens-drift step (CI has it); stall-tokens row in agent-common CODING_SYSTEM_ROLLOUT remnants tracker.

## Done
- Docs: ARCHITECTURE (pluggable transport, Bluetooth sync/printer backlog, D-MIGRATE and /beta/ dropped), FEATURES, ADR-0003, CHANGELOG.
- Scaffold from app-starter v0.1.0; stall night/day tokens (contrast 336/336 pass).
- Contract (op log v2), data layer (IndexedDB, device prefs, tab channel, fake transport, sync engine), fold, bill/pay/token/UPI rules, counter + catalog actions. 50 unit tests pass.
- Counter UI: launch, menu, billing, payment (split, slider, numpad, tip, waived, QR, count notes), open orders, all counter sheets, calm PWA update. Typecheck, lint, stylelint, depcruise and build pass.
- Fixed during a quick look: typing UPI left cash unchanged (refit/addTip + tests); paid screen showed total without tip.

## Left
- Verify + break-it run (e2e at 390/360, night/day), docs/VERIFY_LOG.md, docs/CROSSCHECK.md, check-in screenshots.
- docs/SHEET_SETUP.md; Sheet transport; token slip component (F-42); money, settlement, stock, float, history, settings.
- PWA PNG icons (SVG only now); agent-common plan note.

## How to continue (for the next agent)
1. Repo `steph1420/stall-tokens`, branch `feat/v2.0.0` (head 6cc892b + this note). Backup: tag `v1.0.0` and branch `backup/pre-v2.0.0`. v1 is kept at `legacy/v1/index.html`. Never touch `main` or deploy without Steve's OK; never force-push; commit by explicit path.
2. Setup: `npm ci`, then `npm run dev`. Before every commit run `npm run check`, which covers typecheck, lint, lint:css, depcruise, leak-scan, contrast, tests, build and the build-output check.
3. Read first: `docs/ARCHITECTURE.md` (doc leads, code follows; fix any mismatch with an ADR), `FEATURES.md` (F-ids), and in agent-common `handovers/pos/V2_BUILD_PLAN.md` (D-items are decided) and `DECISIONS.md` (all locked Q-IDs). Rules: agent-common 01-09 plus 06-coding-standards v2 (no Tailwind; tokens plus CSS Modules).
4. Visual truth: agent-common `handovers/pos/assets/stall-mockups-locked/20-polish` and `21-polish2`, night and day, with tokens in `polish.css`. Side-by-side pairs are in `21-polish2/pairs/`.
5. Code map: `src/contract` (op log and money types), `src/data` (IndexedDB adapters and the sync engine with a pluggable transport; the fake transport is used now), `src/store` (fold, rules, counter and catalog actions, testkit), `src/tokens` (night and day tokens), and `src/ui/counter/{menu,billing,payment}` as the model for new screens (one folder each, with a `*.module.css` and a `*Screen.tsx`).
6. Next, in order:
   - Money, with Paid by including Mixed, and Received.
   - Settlement: Settle up, Partners and Mark cleared.
   - Stock, with the paste parser rules in DECISIONS Q-STOCK-SET.
   - Float, History and Settings, with Appearance set to Night or Day.
   - Sheet transport and `docs/SHEET_SETUP.md`, which covers Steve's 5-minute Apps Script steps.
   - Token slip component (F-42, about 58 mm wide, printable).
   - Money: show cancelled orders with refund due (`order.cancel` `refundDue`) and a way to settle them (Q-CANCEL-1 A; no refund UI yet).
   - When the plan is complete: a thorough loophole review of the whole plan (Steve 16 Nov 17:45 IST).
   - When the app is built, before go-live and alongside the verify + break-it run: a thorough walk-through test of every function, listing missing features/functions (Steve 16 Nov 17:45 IST).
   - Verify and break-it run, then `docs/VERIFY_LOG.md`, then the go-live step with Steve: v2 goes straight to the main address, because v1 was never used.
7. Quota: Steve is low on quota. Keep runs lean, and ask him before the full test run.
