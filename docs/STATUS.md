# v2.0.0 build status (2026-11-16 16:20 IST) — untested WIP

Stopped early on Steve's request (quota). Nothing deployed; main untouched.

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
- docs/SHEET_SETUP.md; Sheet transport; token slip component (F-42); Kitchen, stations and remaining screens.
- IndexedDB-unavailable fallback (shows an error screen now); ₹0 orders on the payment screen.
- PWA PNG icons (SVG only now); agent-common plan note.

## How to continue (for the next agent)
1. Repo `steph1420/stall-tokens`, branch `feat/v2.0.0` (head 6cc892b + this note). Backup: tag `v1.0.0` and branch `backup/pre-v2.0.0`. v1 is kept at `legacy/v1/index.html`. Never touch `main` or deploy without Steve's OK; never force-push; commit by explicit path.
2. Setup: `npm ci`, then `npm run dev`. Before every commit run `npm run check`, which covers typecheck, lint, lint:css, depcruise, leak-scan, contrast, tests, build and the build-output check.
3. Read first: `docs/ARCHITECTURE.md` (doc leads, code follows; fix any mismatch with an ADR), `FEATURES.md` (F-ids), and in agent-common `handovers/pos/V2_BUILD_PLAN.md` (D-items are decided) and `DECISIONS.md` (all locked Q-IDs). Rules: agent-common 01-09 plus 06-coding-standards v2 (no Tailwind; tokens plus CSS Modules).
4. Visual truth: agent-common `handovers/pos/assets/stall-mockups-locked/20-polish` and `21-polish2`, night and day, with tokens in `polish.css`. Side-by-side pairs are in `21-polish2/pairs/`.
5. Code map: `src/contract` (op log and money types), `src/data` (IndexedDB adapters and the sync engine with a pluggable transport; the fake transport is used now), `src/store` (fold, rules, counter and catalog actions, testkit), `src/tokens` (night and day tokens), and `src/ui/counter/{menu,billing,payment}` as the model for new screens (one folder each, with a `*.module.css` and a `*Screen.tsx`).
6. Next, in order:
   - Kitchen and station screens.
   - Money, with Paid by including Mixed, and Received.
   - Settlement: Settle up, Partners and Mark cleared.
   - Stock, with the paste parser rules in DECISIONS Q-STOCK-SET.
   - Float, History and Settings, with Appearance set to Night or Day.
   - Sheet transport and `docs/SHEET_SETUP.md`, which covers Steve's 5-minute Apps Script steps.
   - Token slip component (F-42, about 58 mm wide, printable).
   - The known gaps listed above.
   - Verify and break-it run, then `docs/VERIFY_LOG.md`, then the go-live step with Steve: v2 goes straight to the main address, because v1 was never used.
7. Quota: Steve is low on quota. Keep runs lean, and ask him before the full test run.
