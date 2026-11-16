# Changelog
All notable changes to Stall Tokens. SemVer. Times IST.

## [Unreleased] — 2.0.0 (branch `feat/v2.0.0`)
### Changed (16 Nov 20:30, Paste stock asks Menu or Stock only, F-46, Q-SUPPLY-CONFIRM B)
- Each new thing in Paste stock shows Menu / Stock only; Add stays off until every new thing is chosen. Menu = a menu item in category New at ₹0 (set its price on the Menu); Stock only = a supply item (was: every new thing became a supply, D-STOCK-SUPPLY).

### Added (16 Nov 20:20, shared tip choices / round-off steps, F-45)
- Tip choices and round-off steps are shared `setting.set` values (`tipChips`, `roundOffSteps`, comma-separated paise), synced to every phone and the Sheet `settings` tab; CONFIG keeps the defaults. Edit them in Settings > Money, with the pencil on the Payment tip row, or under Round-off in the Billing discount sheet (`ui/kit/AmountsEdit.tsx`).

### Added (16 Nov 20:05, sign-in links, F-44)
- Developer > Sign-in links: one link per person / role; URL, stall key, role and name ride in the #fragment (`src/data/join.ts`). Opening it sets up sync, the serving name and the role screen (Counter, Kitchen, a station or the start screen). Revoke by changing STALL_KEY.
- Passcode lock (D-ACCESS) now off by default (code kept; Settings > Developer > Passcode lock turns it on). No pairing.
- Builds can bake the bridge in: `VITE_SYNC_URL`, `VITE_SYNC_KEY` (empty by default).

### Added (16 Nov 19:45, Sheet schema v1)
- Q-SHEET-DEPLOY: Google Sheet "Stall Tokens — Data (v2)" made with `_meta`, `_schema`, append-only `ops` and 14 projection tabs plus 4 formula views; `apps-script/Code.gs` v1 matches it (projections, header-name columns, append-only migrations). Web app not deployed (Steve authorises it). 1 schema test.
### Added (16 Nov 20:10, Token slip)
- Token slip (F-42): 58 mm printable slip; Print token on the paid screen opens the print dialog. 1 UI test.
### Added (16 Nov 20:00, Sheet bridge)
- Sheet bridge transport (F-35): client `createSheetTransport` on the pluggable Transport, `apps-script/Code.gs` (append-only op log in a Sheet tab, stall key check), `docs/SHEET_SETUP.md`, Settings > Sync (URL + stall key, status). Not deployed; needs Steve's TEST Sheet. 2 tests with a fake web app.
### Added (16 Nov 19:45, Open the stall / History / Settings)
- Open the stall (F-32): float on a keypad, last fair's closing cash, sync pill, Start day (starts today's day if needed, saves `float:<dayId>`).
- History (F-33): per day, paid / cancelled orders and money entries with Refunded / Edited / Cancelled / Voided tags; order sheet with Edit, Refund, Hold to cancel order; entry sheet with Hold to void.
- Settings (F-34): Kitchen, Money (partner shares, tip choices, round-off), Feel (haptics, Night / Day), Counter, Passcode, Developer, footer. D-ACCESS passcode gate for Money, Settle up and Settings (device prefs `passcode`, `passcodeOff`). 2 UI tests.
### Added (16 Nov 19:20, Stock)
- Stock (F-30): search, navrail of categories + Low · n + Sold out, counts amber when low, dimmed Sold out, tap a row for −/+ (never below 0). Paste stock (F-31): paste box with format hint, Will add preview (+qty unit, paid, discount, New item; unclear lines amber), Paid by, "Add n · Spent ₹total"; adds stock and one Spent entry (Q-PASTE-1 A). New pasted things become supply items (additive item field `supply`, D-STOCK-SUPPLY), never on the Menu. 3 tests.
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
