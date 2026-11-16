# Changelog
All notable changes to Stall Tokens. SemVer. Times IST.

## [Unreleased] — 2.0.0 (branch `feat/v2.0.0`)
### Added (16 Nov 19:00, Settlement)
- Settlement (F-26..F-29): Settle up (Stall in hand, 1 Repay others with Pay, 2 Split between partners dimmed until step 1 is done, Repay all) and Partners (pending repayments warning with Review, To split, shares %, "Covering …'s ₹… · added back", Add a partner, Split anyway / Split and lock the day, Reopen). Person sheet: amount (partial ok), Via / When tiles, history with Undo, Mark cleared + Pay; Mark cleared asks Gifted / Paid directly / Written off / Shared cost + note. Ops `settle.pay`, `settle.clear`, `settle.undo`, `day.lock` (additive). A locked day refuses money changes. 2 store tests.
### Added (16 Nov 18:50, Money)
- Money (F-23..F-25): Stall screen with today's totals (sales cash / UPI, spent, received incl. donations, tips as own pot, register by the book), Refunds due from cancelled paid orders with Cash back / UPI back, and today's entries. Entry screen per Money v8 / Received v1: Spent | Received, For / Paid by (From / Received in) tiles, amount, keypad, Save. Paid by sheet: Register, UPI, Personal (people + Add a name), Mixed (amount per part, covered bar). Ops `person.set`, `entry.add`, `entry.void` (additive). Stall section on launch and in the Counter ⋯ sheet (D-NAV). 2 store tests.
### Added (16 Nov 18:40, New Orders / Open Orders)
- Counter top tabs New Orders | Open Orders (Q-ORDERS-1). New Orders keeps Menu / Billing / Payment with a single current-order line (chips row and the Open orders drop-down removed, Q-ORDERS-2 A).
- Open Orders (F-43): cyan band + Overview, one big squircle per order (swipe the header for previous / next, tap for the order sheet: client name, Priority, items, total, note, Edit in Billing, Cancel order), Lines / Cards, Mark ready, Ready + Confirm, Confirm all, hidden tap-to-change status, bar Cancel order + Handover. `order.client` op (additive). 2 UI tests.
### Added
- v2 rebuilt from `steph1420/app-starter` v0.1.0 (`0746f7b`; checks from agent-common `88c9672`): React 19, Vite 6, TypeScript strict, Driftline tokens + CSS Modules, Zustand, op-log sync with a pluggable transport.
- Docs first: `docs/ARCHITECTURE.md`, `FEATURES.md`, `docs/adr/ADR-0003-stall-accent.md`.
### Changed
- v1 single-file app moved to `legacy/v1/index.html` (kept byte for byte; rollback tag `v1.0.0`, branch `backup/pre-v2.0.0`).
### Added (16 Nov 17:30, Kitchen locks)
- Leaving veil revised (Q-OVERLAY, Steve 17:50): rounded frosted veil at the card radius with a centred circle badge, green check "Completed" / red × "Cancelled", gentle scale-in from `motion/` `PopIn` (reduced motion: fade).
- Cancel order (Q-CANCEL-1 A): `order.cancel` op at any status, confirm sheet with optional reason; paid money recorded as refund due for Money (no refund UI); Cancelled veil on Kitchen/Station; a cancelled Priority order releases the pause. Store + UI test.
- Open orders cards expand to their lines, each with its own inline Mark ready (Q-MARK-1 B); the per-order Mark ready sheet is gone.
- Leaving veil (Q-OVERLAY): orders whose lines are all complete (handed over, or marked by the Counter, by anyone) show "Completed" (bag icon), deleted ones "Cancelled" (red-tinted, muted) on Kitchen/Station cards for ~2.5 s, then drop off. View-only. A Cancel op for started orders is still pending.
- Mark ready (Q-COUNTER-FINISH): Open orders can finish any sent line straight to Ready (`line.finish` op); Kitchen and Station show it muted, "Marked by counter", with the Ready icon. 1 store test.
- Station hands over a Ready line with one more tap (Q-HANDOVER-1 C); Counter Hand over stays.
- Priority switch on Billing, beside the token (Q-PRIORITY-1 C); quiet "Hold # for Priority" cue on the first Kitchen card.
- Automatic pause / resume for Priority orders, written as real ops so sync stays consistent (Q-PAUSE-1 A).
### Added (16 Nov, Kitchen + Station)
- Kitchen screen (F-19): station pills with to-make counts, status icons with labels, Priority bob (motion/), handed-over lines muted, "Open <station>" only when a pill is picked.
- Station page (F-21): one order per screen, order tabs, swipe, three looks (Full card default, Item cards, Ticket), Overview sheet; Back returns to the opener.
- Counter Open orders: Done? amber row with Send back / Confirm, and Hand over for Ready orders (F-20). Auto-prep of the next order (F-22).
- `order.priority` op (additive, contract v2). Launch opens Kitchen and each station.
- Known gaps closed: ₹0 orders show "Nothing to collect" with To kitchen; no usable IndexedDB now runs in memory with a calm banner.
- CI runs on `feat/**` with the feature-ID step (Q-CI-1 A).
### Audit (16 Nov, vs agent-common 06 v2)
- Re-copied the build-output check (agent-common `ab6431f`); added the feature-ID check to `npm run check` (CI workflow change waits on a `workflow`-scoped login).
- Logged the two silent catch/retry spots; moved a slider threshold to config and an inline style to CSS Modules (no visual change).
- FEATURES.md test column made honest; F-42 row added; README fixed.
### Dropped
- v1 data import and the `/beta/` path (Steve 16 Nov 15:48 IST: v1 never used).

## [1.0.0] — d9daa49
- Initial single-file release (tagged later as the rollback point).
