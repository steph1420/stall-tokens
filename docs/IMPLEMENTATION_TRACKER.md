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
| P1-04 | Implement secondary units and multiplier effects | Blocked | Need confirmation of multiplier direction/meaning before changing price and stock conversions |
| P1-05 | Verify primary units | Pending | Display, billing and stock must agree |
| P1-06 | Verify whole-order notes | Pending | Save, reload and display |
| P1-07 | Verify individual item notes | Pending | Save, reload and display |
| P1-08 | Verify cart calculations | Pending | Discounts, quantities, rounding and totals |
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
