# Stall POS — Master Implementation Tracker

Last updated: 21 November 2026  
Authoritative repository: `steph1420/stall-tokens`  
Active branch: `feat/pos-hardening-2026-11-21`  
Production branch: `main` (must remain untouched until release approval)  
Recovery branch: `backup/main-2026-11-21`

## Status rules

- **Done** — acceptance criteria passed with recorded evidence.
- **In progress** — work has started; not accepted yet.
- **Blocked** — cannot proceed until a dependency, device, decision or external condition is resolved.
- **Pending** — not started.
- Code existing, compiling or being committed is not enough to mark a task Done. Hardware tasks require actual hardware tests.

## Phase 0 — Establish the correct project

| ID | Task | Status | Evidence / note |
|---|---|---|---|
| P0-01 | Inspect original and mobile repositories | Done | Compared repository history and source |
| P0-02 | Identify latest implementation | Done | Identified v2.1.0 Beta branch and separate mobile repository |
| P0-03 | Identify deployment workflow | Done | Inspected CI and deployment configuration |
| P0-04 | Establish authoritative production repository | Done | `stall-tokens` is production; mobile repo is separate |
| P0-05 | Establish working branch and backup | Done | Backup branch matches production `main`; isolated work branch created |
| P0-06 | Run baseline build and tests | Done | [Baseline CI passed](https://github.com/steph1420/stall-tokens/actions/runs/44868414884); 259 tests |
| P0-07 | Record existing defects before changes | Done | [Baseline record](./BASELINE.md) |

**Exit:** one authoritative codebase, recoverable baseline and reproducible CI gate. Complete.

## Phase 1 — Core POS reliability

| ID | Task | Status | Evidence / note |
|---|---|---|---|
| P1-01 | Implement item discounts; correct price on ordinary item taps | Done | Item editor + menu price + line-price snapshot; [CI #100](https://github.com/steph1420/stall-tokens/actions/runs/44869565766), 263 tests |
| P1-02 | Verify variant pricing | Done | Variant replaces base price; UI and order-line tests pass; [CI run](https://github.com/steph1420/stall-tokens/actions/runs/44871032905) |
| P1-03 | Verify add-on pricing | Done | Add-ons sum with selected variant/base price; UI and order-line tests pass; [CI run](https://github.com/steph1420/stall-tokens/actions/runs/44871032905) |
| P1-04 | Implement secondary units and multiplier effects | In progress | Core path now wired: item editor, primary/secondary sale-unit selection, measured quantity entry (up to configured cap), unit-aware draft availability, immutable order-line snapshots, converted billing, fractional stock and stock lifecycle, kitchen/history/refund/receipt quantity labels. Automated tests have been added for measured sale, stock cap, billing, send/delete, quantity edits, refund restock/undo, legacy replay, repeating ratios and snapshot immutability. Commits are recorded in the Stage 1 execution logs below. GitHub Actions CI run #217 passed on commit `f7d7520`: TypeScript, ESLint, Stylelint, dependency checks, contrast checks, all 57 test files / 284 tests, and production build. Still not accepted: Apps Script has not been deployed to the live Sheet, and Android/iPad plus physical printer checks remain. |
| P1-05 | Verify primary units | Done | Primary-unit UI/store regression passed: default kg selection, captured kg rate and multiplier 1, ₹200 bill total, and one-for-one stock deduction. Included in CI #229 (57 files / 287 tests, production build passed). |
| P1-06 | Verify whole-order notes | Done | Added a store-reload persistence test and a kitchen-ticket display test for the order note. CI #229 passed (57 files / 287 tests). |
| P1-07 | Verify individual item notes | Done | Added a store-reload persistence test and a kitchen-ticket display test for line notes. CI #229 passed (57 files / 287 tests). |
| P1-08 | Verify cart calculations | In progress | Added an end-to-end customizer/cart regression combining variant price, add-on price, item discount, 250 g conversion, order-level percentage discount, round-off, final total and stock deduction. CI #235 pending. |
| P1-09 | Verify order lifecycle | Pending | Create, send, ready, complete, cancel and refund |
| P1-10 | Verify persistence after reload | Pending | Orders, settings and menu survive reload |

**Exit:** fundamental POS operations pass functional tests.

## Phase 2 — UI and input reliability

| ID | Task | Status |
|---|---|---|
| P2-01 | Android keyboard regression test | Pending |
| P2-02 | iPad keyboard regression test | Pending |
| P2-03 | Fix Settings clipping and overlap | Pending |
| P2-04 | Verify Home navigation on every main screen | Pending |
| P2-05 | Verify app version display | Pending |
| P2-06 | Phone portrait layout | Pending |
| P2-07 | Phone landscape layout | Pending |
| P2-08 | Tablet layout | Pending |
| P2-09 | iPad layout | Pending |
| P2-10 | Accessibility and text scaling | Pending |

**Exit:** no critical input, navigation or layout defects on supported devices.

## Phase 3 — Independent printing engine

| ID | Task | Status |
|---|---|---|
| P3-01 | Identify Cysno printer protocols and interfaces | Pending |
| P3-02 | Design printer abstraction: transport separate from receipt rendering | Pending |
| P3-03 | Implement ESC/POS command engine | Pending |
| P3-04 | Implement and physically verify Bluetooth printing | Pending |
| P3-05 | Implement and verify supported Android USB printing | Pending |
| P3-06 | Printer discovery and selection | Pending |
| P3-07 | Persist printer preferences correctly | Pending |
| P3-08 | Accurate connection status | Pending |
| P3-09 | Physical test print from target device(s) | Pending |
| P3-10 | Print queue; prevent overlapping or lost jobs | Pending |
| P3-11 | Retry and timeout handling | Pending |
| P3-12 | Verify actual 58 mm and 80 mm formatting | Pending |
| P3-13 | Remove external printer-app dependencies | Pending |

**Exit:** real receipts print from each supported device/transport without third-party branding. iPad support must be tested separately; browser Web Bluetooth is not assumed to work there.

## Phase 4 — Receipt Template Studio

| ID | Task | Status |
|---|---|---|
| P4-01 | Receipt document model | Pending |
| P4-02 | Template editor: add, remove and reorder blocks | Pending |
| P4-03 | Variable library | Pending |
| P4-04 | Conditional blocks | Pending |
| P4-05 | Typography controls | Pending |
| P4-06 | Dividers and spacing | Pending |
| P4-07 | Logo/image support and monochrome raster conversion | Pending |
| P4-08 | Live preview matching actual paper width | Pending |
| P4-09 | Welcome, order, kitchen, payment and thank-you presets | Pending |
| P4-10 | Multiple templates | Pending |
| P4-11 | Per-template print-field selection | Pending |
| P4-12 | Verify variable rendering against physical receipts | Pending |

**Exit:** templates can be edited, previewed and physically printed accurately. Do not start before the printer foundation is stable.

## Phase 5 — Google Sheets integration

| ID | Task | Status |
|---|---|---|
| P5-01 | Identify production Apps Script endpoint | Pending |
| P5-02 | Bake configuration into deployment; no manual pairing | Pending |
| P5-03 | Remove unnecessary token-range UI | Pending |
| P5-04 | Automatic first sync on fresh installation | Pending |
| P5-05 | Verify order sync has no missing or duplicate orders | Pending |
| P5-06 | Menu sync | Pending |
| P5-07 | Multi-device conflict handling | Pending |
| P5-08 | Offline POS operation | Pending |
| P5-09 | Recovery after connection loss | Pending |
| P5-10 | Backup export and restore | Pending |

**Exit:** reliable sync without user-side setup or silent data loss.

## Phase 6 — Final QA and release

| ID | Task | Status |
|---|---|---|
| P6-01 | Full automated test suite | Pending |
| P6-02 | Android phone testing | Pending |
| P6-03 | Android tablet testing | Pending |
| P6-04 | iPad testing | Pending |
| P6-05 | Printer stress testing | Pending |
| P6-06 | Offline and recovery testing | Pending |
| P6-07 | Google Sheets round-trip | Pending |
| P6-08 | Regression tests | Pending |
| P6-09 | Version and release notes | Pending |
| P6-10 | Production deployment | Pending |
| P6-11 | Post-deployment verification | Pending |

## Change-control rules

1. Keep task IDs stable; add new IDs rather than renumbering.
2. Update this file after every accepted development batch.
3. Record commit IDs, CI runs, test evidence and device evidence.
4. Keep failed checks visible; never hide or silently skip them.
5. Do not merge into or deploy from production `main` without a separate release decision.
6. Keep the production backup recoverable.
7. A CI pass does not replace real Android, iPad, Bluetooth or USB testing.

## Staged execution roadmap — implementation order

This roadmap governs the remaining work. Each stage is a set of reviewable code batches, not a promise that a feature is complete merely because its UI exists. Update the relevant task rows with commit, CI and device evidence after each accepted batch.

### Stage 0 — Protect the baseline and execute only on the feature branch
**Status: Complete.**
- Keep `main` and `backup/main-2026-11-21` untouched.
- Work only on `feat/pos-hardening-2026-11-21`; no production deployment without explicit release approval.
- Keep the existing baseline record, CI gate and tracker as the source of truth.
- Existing evidence: P1-01 through P1-03 are accepted; the last recorded full gate passed 57 test files / 271 tests. This does not cover later code changes or physical device behaviour.

### Stage 1 — Finish the core data, unit, stock and pricing model
**Implementation batch complete; automated CI passed. External acceptance remains open.**
1. Extend the item contract with primary-unit and optional secondary-unit configuration. Define the multiplier as primary units represented by one secondary unit.
2. Make old item records and old operations fold safely with primary-unit defaults. Do not invalidate historical orders.
3. Snapshot the selected sale unit and conversion factor on each new order line. Historical lines must not change when an item is edited later.
4. Use paise-safe arithmetic. Calculate converted line totals from the captured rate, quantity and conversion factor, with rounding at the defined line-total boundary; do not round a sub-paise unit price first and multiply it later.
5. Support the fractional primary-stock quantities required by conversions (for example, 0.25 kg). Keep inventory precision bounded and validation consistent; do not allow negative stock through rounding drift.
6. Apply converted quantities to every stock path: draft holds/availability, commit, quantity change, cancel, remove, refund/restock and refund void. Preserve replay determinism and idempotency.
7. Add unit-aware item editing, menu display and billing quantity entry. Ordinary items must remain unchanged when no secondary unit is configured.
8. Explicitly define how variants and add-ons are priced for converted items. Never silently scale a flat add-on as though it were a per-kg rate; ambiguous combinations must be clearly represented or prevented.
9. Add contract, fold/replay, pricing, counter, UI and regression tests.

**Stage 1 acceptance examples:** At ₹200/kg, 1 kg totals ₹200, 250 g totals ₹50 and 100 g totals ₹20; selling 250 g reduces 1.00 kg stock to 0.75 kg; cancellation/restock restores exactly 0.25 kg; insufficient stock is rejected; changing the menu unit/rate does not rewrite an older order; old op logs still fold.

### Stage 2 — Complete everyday POS workflows
- Finish and verify whole-order notes and individual line notes.
- Verify cart arithmetic across discounts, variants, add-ons, quantities, rounding and payment splits.
- Exercise the full order lifecycle: create, edit, send, ready, handover/complete, cancel, refund, restock and void/refund reversal.
- Verify first-day/new-day behaviour, reload recovery and persistence of menu, orders, settings and captured line details.
- Add failing regression tests for every defect found; do not close a task based only on a visual inspection.

**Exit gate:** an automated order-to-payment-to-stock-to-refund scenario passes from a clean store and after reload/replay.

### Stage 3 — Make the interface reliable on phone and tablet
- Fix keyboard focus/visibility and input dismissal regressions; test numeric and text inputs in every relevant sheet.
- Fix Settings clipping/overlap and verify Home navigation and app version on every main screen.
- Complete phone portrait/landscape, tablet and iPad layouts, including text scaling and small viewport checks.
- Add Playwright end-to-end specs. The dependency is present, but the current repository documentation says no E2E specs exist.
- Test touch targets, scrolling, modal/sheet behaviour and navigation under realistic viewport sizes.

**Exit gate:** automated browser/device-size tests pass, followed by hands-on checks on the actual Android phone and iPad. A simulated viewport alone is not device acceptance.

### Stage 4 — Make Google Sheets sync turnkey and recoverable
- Trace the deployed Apps Script bridge and the actual production endpoint before changing configuration.
- Inject production sync configuration through deployment secrets/variables; never commit a live key into source.
- Remove manual URL/key and token-range setup from the normal user path; retain an explicit developer/diagnostic route only if needed.
- Verify first-install sync, two-device order visibility, menu changes, duplicate delivery, sequence-gap recovery, offline operation, reconnect and conflict review.
- Add a tested backup export and restore path.

**Exit gate:** clean installation joins without manual pairing; two devices exchange orders and menu edits; offline work converges after reconnect; no lost or duplicated orders in the test log.

### Stage 5 — Printer compatibility spike (do this before building the full printer UI)
- Identify the exact Cysno model/revision from its self-test page or label.
- Determine its real Bluetooth mode/profile (BLE GATT or Bluetooth Classic/SPP), USB interface, ESC/POS compatibility and supported paper width.
- Test connection and one raw ESC/POS test receipt on the actual Android device and iPad. Do not infer iPad compatibility from Android or from a printer name.
- Choose the transport architecture only after these results: browser transport where supported, native platform bridge where required, or a supported network/print path. Record any device/transport limitation honestly.

**Exit gate:** a written compatibility matrix for Android Bluetooth, Android USB, iPad Bluetooth/USB or an explicitly supported alternative. If the printer cannot connect directly to iPad, surface that as a hardware constraint before further investment.

### Stage 6 — Build the independent printing foundation
- Separate receipt rendering from transport. Keep the ESC/POS byte generator pure and unit-tested.
- Implement only the transport(s) proven in Stage 5, with permission handling, discovery/selection, real connection state, reconnect, timeouts and a serialized print queue.
- Make printer preferences persistent without treating a saved device name as a live connection.
- Wire paper width to the actual renderer; verify 58 mm and 80 mm independently where supported.
- Remove third-party printer-app branding/dependencies from the print path.
- Physically test partial writes, retries, duplicate prevention, power loss, paper-out and repeated receipts.

**Exit gate:** repeatable receipts print from each claimed platform and connection path, with no unwanted middleware text. Each claim needs device evidence.

### Stage 7 — Build Receipt Template Studio on the stable printer engine
- Define a versioned receipt-template document model and variable registry.
- Implement add/remove/reorder blocks, field visibility, conditional blocks, alignment, emphasis, font sizing, spacing and dividers.
- Add business/event identity, logo/image support and monochrome raster conversion.
- Provide live 58 mm / 80 mm previews that match the renderer, plus welcome, order, kitchen, payment and thank-you presets.
- Persist multiple templates and per-template print-field choices; test every variable against a rendered and physical receipt.

**Dependency:** do not start template-builder polish before Stage 6's renderer and transport contracts are stable.

### Stage 8 — Full acceptance, release candidate and controlled deployment
- Run the complete CI gate and end-to-end suite on the final candidate.
- Run Android phone, Android tablet, iPad, printer, multi-device sync, offline/recovery and data round-trip checks.
- Complete a regression sweep of every tracker item and record the evidence in a verification log.
- Fix release-blocking defects, prepare version/changelog/rollback notes and produce a release candidate.
- Merge/deploy only after a separate explicit release approval. Verify the deployed build and data path after release.

**Exit gate:** every required tracker row is Done or explicitly documented as a known limitation; no silent failures or untested hardware claims.

## Execution discipline
- Work in small vertical slices: contract/model → domain logic → UI → tests → CI → tracker update.
- After every batch, record the changed files, commit, tests and remaining gaps. Mark Done only when its acceptance gate passes.
- If a batch exposes a structural issue, stop and correct the model before layering more UI on top.
- Do not import the separate mobile experiment repository wholesale; selectively port only reviewed ideas that fit this repository's contract and architecture.
- Do not merge, tag as production, or deploy without explicit release approval.


### Stage 1 execution log — first domain batch (21 November 2026)
- Implemented reusable conversion math and tests for integer sale quantities, signed stock deltas, discount handling, paise rounding and repeating ratios.
- Added additive item fields for secondary unit and multiplier; old items fold with multiplier 1.
- Added optional line.add unit, price-unit and stock-multiplier snapshots; old line.add operations replay with the item's primary unit and multiplier 1.
- Updated order folding so send, quantity changes, cancel, delete, refund restock and refund void convert sale quantities into primary inventory quantities.
- Updated billing line totals to calculate from the captured primary-unit rate and conversion factor.
- Enabled fractional inventory counts and adjustments, with a small floating-point tolerance to avoid false oversold flags at zero.
- Added fold and bill regression tests for 250 g from 1 kg, historical line snapshots and legacy operation replay.
- Commits: `67fdd343778d0a7e1ea6b03c162ffcbc43a0cd32`, `e193b4c18ce038ff4268303a83fbaf7ed92008a1`, `6d93b81c123b2bd57a9b0b63290bab903b78018a`, `0033dac35097db65a2381c175b781de5992d2395`, `4cea41e222fe5bff422b224035ed75e4456b75e5`, `06326230fb56f057d030080a1635891dc6302bf2`, `0800c33042d3c8ac8a5e15f2175fd08ab7825096`, `2be6afad46665a6101b5e6394e1be40f2673f21b`, `26b7f6bd9f18189573004f2e24072a26a47878f0`, `01701a16d90c3c5899c20dc6f2ad71a779dd1d64`, `53f5f03e93d4a25aa3aaf3c6577e255762f711ff`, `dd2569153cc4ed5f8d64d56ed32782c04ab66b2b`, `80c0dae7b46066123e76b7a13059ce262ce8bef9`, `0d4cec887db8b8f2307ad3c5ff819467b810dc8b`, `1038b2505624e042236b02c0cfb2840af52d71cb`.
- Verification limitation: this environment could not resolve `github.com`, so a local checkout/test run was unavailable. GitHub combined-status queries returned no status entries for these commits. Do not treat the added tests as executed or P1-04 as accepted.


### Stage 1 execution log — integrated measured-sale path (21 November 2026)
- Item editor now stores a primary unit, optional secondary unit and multiplier. Multiplier range is bounded; stock accepts up to twelve decimal places to preserve repeating conversions such as 1/12.
- Menu routes measured items through the customizer. Staff can choose the primary or secondary sale unit and type the quantity (e.g. 250 g); quantity is capped by available primary stock and a separate measured-quantity safety limit.
- Counter draft holds and quantity changes now compare converted primary-stock quantities. The new-day pending-item flow preserves the selected unit, multiplier and quantity.
- Each line snapshots its sale unit, rate unit and conversion multiplier. Later item edits do not rewrite existing lines.
- Billing, Open Orders, kitchen/station tickets, order details, drafts, history, refund selection and token slips now show measured units. Bill and receipt totals use converted line totals.
- Kitchen overview groups the same item separately when sold in different units. Menu item counts and "most sold" sorting account for measured quantities in a consistent way.
- Stock conversion covers send/commit, quantity reduction, cancellation, deletion, refund restock and refund undo. Repeating dozen-to-piece conversion is covered by a regression test.
- Added tests in `CustomizeItemSheet.test.tsx`, `counter.test.ts`, `fold.test.ts` and `bill.test.ts`.
- Key commits in this batch: `b10bd6e`, `990c522`, `d684378`, `6728e71`, `d5a069f`, `040daea`, `eb7f112`, `f8f057e`, `ca7e0fa`, `7d7f96d`, `48ce29a`, `e1b2f3f`, `ac960a4`, `ea5d6f7`, `6b8e8ac`, `35ce724`, `67def6e`, `6bd2a2b`, `7a6a985`, `30b8c17`, `455e989`, `3b9ab58`, `5d0e607`, `4e81cce`, `65a3970`, `b135513`, `238fe3a`, `a5faccf`, `84eb77c`, `83d5433`, `b66620a`, `085619c`, `4b956a0`, `5d03c84`, `55598fd`, `6501ef7`.
- Verification remains outstanding. The CI workflow is configured for pushes to `feat/**`, but the GitHub connector returned no status entries. A local clone/test attempt failed because this environment could not resolve `github.com`. No tests are claimed as executed; P1-04 remains In progress.


### Verification update — CI run #217 (21 November 2026)
- Commit: `f7d7520d78f361be88b2edf143548ff1a4ea9017`
- Workflow: [GitHub Actions run #217](https://github.com/steph1420/stall-tokens/actions/runs/44889259879)
- Result: **success**.
- Passed: exact pins and lockfile, leak scan, generated-output guard, feature-ID consistency, dependency installation, token consistency, TypeScript, ESLint, Stylelint, dependency rules, light/dark contrast checks, test suite, and production build.
- Tests: **57 test files, 284 tests passed**.
- Build: Vite production build completed successfully (601 modules transformed).
- No merge or deployment was performed.
- Remaining acceptance gates for P1-04: deploy the matching Apps Script schema v4 to the live Sheet and verify sync; exercise measured sales, stock, refunds and history on Android and iPad; verify the actual 58mm Cysno receipt output. Until those are completed, P1-04 stays In progress.


### Primary-unit regression follow-up — 21 November 2026
- Added a dedicated UI/store regression for an item configured as `kg` with a `g` secondary unit.
- The test asserts that the default primary selection records `kg`, uses multiplier 1, charges the primary rate, bills ₹200 for 1 kg and deducts exactly 1 kg from stock.
- This explicitly checks the no-conversion path beside the measured secondary-unit path. CI is pending for this latest test commit; P1-05 remains In progress until that run passes.


### Verification update — CI run #229 (21 November 2026)
- Workflow: [GitHub Actions run #229](https://github.com/steph1420/stall-tokens/actions/runs/44889688697)
- Result: **success** on commit `08c69adafff259197f64c1034284c4a88a7ce625`.
- Passed all CI steps: TypeScript, ESLint, Stylelint, dependency checks, contrast checks, tests and production build.
- Tests: **57 test files, 287 tests passed**.
- The run includes the explicit primary-unit pricing/stock regression and the whole-order/line-note persistence and kitchen-display regressions.
- P1-05, P1-06 and P1-07 are now accepted as automated/code-path tasks. P1-04 remains open for live Apps Script deployment and physical Android/iPad/printer acceptance.


### Cart calculation regression — 21 November 2026
- Added an end-to-end UI/store test for a measured item with a selected variant and add-on.
- Example: ₹240/kg variant + ₹20/kg add-on, 10% item discount = ₹234/kg; 250 g bills ₹58.50.
- Then a 10% order discount rounds to ₹6 off under the existing nearest-rupee rule; a ₹0.50 round-off produces a ₹53.00 final total.
- Sending the order deducts 0.25 kg from stock.
- This test is intended to exercise the full chain from option selection to final cart total and stock. CI run #235 is pending; P1-08 remains In progress until it passes and the broader regression review is complete.
