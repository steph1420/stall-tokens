# FEATURES.md — Stall Tokens v2
Every feature has a row before work starts. IDs appear in code (`// F-xx`) and in commits. Source mockups are in agent-common `handovers/pos/assets/stall-mockups-locked/`. Status: `planned`, `building`, `LIVE (<version>)`, `deferred`, `dropped`. The Test column names only test files that exist (06 rule 12). `npm run check:ids` fails if code cites an ID with no row, or a `building`/`LIVE` row is cited nowhere in `src/`. Rewrite column: v1 → v2 (Steve OKs every row before go-live; v1 was never used, 16 Nov 15:48 IST).

| ID | Feature | Source (mock / turn) | Status | Test | Rewrite (keep / change / drop) |
| --- | --- | --- | --- | --- | --- |
| F-01 | Stall theme night + day, Appearance setting | 20-polish/polish.css, Q-DAY-1, ADR-0003 | building | `npm run contrast` (336 pairs); UI/e2e theme test not written yet | change |
| F-02 | Op log, fold, version vectors, conflicts | plan §2, Q-HARM-10 | building | src/store/fold/fold.test.ts | change |
| F-03 | Local data (IndexedDB) + fake transport + tab channel | plan §2, Q-HARM-1 | building | src/data/data.test.ts (incl. IndexedDB fallback) | change |
| F-04 | Launch screen (Counter, Kitchen, Stations, quiet Stall section) | 21-polish2/launch.html, Q-KITCHEN-1, Q-LAUNCH-1 B, D-NAV | building | none yet (UI tests deferred to the verify run) | change |
| F-05 | Counter header: New Orders / Open Orders top tabs, page tabs, single current-order line (chips row dropped, Q-ORDERS-2 A) | 20-polish/*.html header, Q-ORDERS-1, Q-ORDERS-2 A | building | src/ui/counter/open/OpenOrdersScreen.test.tsx | change |
| F-06 | Menu grid: tap to add, −/+, item note, fixed price, stock badges, sold out | 20-polish/menu.html, 12-stock/menu-plain.html, Q-POLISH-SET1, Q-STOCK-SET | building | src/store/counter.test.ts (store); UI none yet | change |
| F-07 | Add / edit menu item (name, price, colour, category, station, stock) | 20-polish/menu.html Add item tile | building | src/store/counter.test.ts (store); UI none yet | change |
| F-08 | Menu press-and-hold stock panel (−/+, Mark sold out) | 21-polish2/menu-stock.html, Q-STOCK-SET | building | src/store/counter.test.ts (store); UI none yet | planned |
| F-09 | Billing table, line + order notes, qty strip, Delete (hold) | 20-polish/billing.html | building | src/store/counter.test.ts (store); UI none yet | change |
| F-10 | Discount (₹ or %, allowed by, note) | billing.html, spec order rules | building | src/store/rules/bill.test.ts | change |
| F-11 | Round-off at billing, both ways | Q-ROUND-1 A | building | bill.test.ts | planned |
| F-12 | To kitchen (unpaid send) / Pay sends too | Q-POLISH-SET1 wording | building | src/store/counter.test.ts (store); UI none yet | change |
| F-13 | Tokens per day, Counter ranges (1–500, 501+) | D-TOKEN | building | src/store/rules/tokens.test.ts | change |
| F-14 | Payment: To collect, Cash/UPI split, numpad, slider ₹10 snap, Waived row | 20-polish/payment.html, 03-payment v5 | building | src/store/rules/pay.test.ts, e2e | change |
| F-15 | Dynamic UPI QR (upi://pay pa pn am tn), named payees | payment.html, Q-UPI-1 A (manual confirm) | building | src/store/rules/upi.test.ts | change |
| F-16 | Count notes (₹5–500, More notes), cash received, change | payment.html | building | pay.test.ts | change |
| F-17 | Tip chips None/₹10/₹20/Other, separate pot | 21-polish2/tips.html, D-TIP, D-MONEY | building | pay.test.ts | planned |
| F-18 | Edit a placed order: collect the extra or refund | spec edit rules | building | pay.test.ts, e2e | planned |
| F-19 | Kitchen: station pills, status icons, Done? proposal, Priority (hold # or Billing switch) with automatic pause, Completed/Cancelled veil (Q-OVERLAY) | 21-polish2/kitchen.html, Q-PILLS-1, Q-ICON, Q-OPEN-1 | building | src/store/kitchen.test.ts, src/ui/kitchen/KitchenScreen.test.tsx | change |
| F-20 | Counter confirms a station's Ready (Done?) line; Mark ready per line (`line.finish`, "Marked by counter"); Cancel order (`order.cancel`) | Q-KITCHEN-3 A, Q-COUNTER-FINISH, Q-MARK-1 B, Q-CANCEL-1 A | building | src/store/kitchen.test.ts, src/ui/counter/open/OpenOrdersScreen.test.tsx | planned |
| F-21 | Station page, three looks, swipe between orders, Overview, hand over a Ready line | 21-polish2/station.html, Q-STN-LOOK D, Q-BACK-1 A | building | src/store/kitchen.test.ts, src/ui/kitchen/KitchenScreen.test.tsx | planned |
| F-22 | Auto-prep next order at a station (setting) | Q-AUTOPREP | building | src/store/kitchen.test.ts | planned |
| F-23 | Money: home (today's totals, Refunds due from cancels, entries) + Spent / Received entry with keypad | 21-polish2/money.html, received.html, Q-MONEY-V8, Q-RECV, Q-CANCEL-1 A, D-MONEY-HOME | building | src/store/money.test.ts | planned |
| F-24 | Paid by / Received in sheet with Mixed | paidby.html, paidby-mixed.html, Q-PAIDBY, Q-MIXED-1 | building | src/store/money.test.ts | planned |
| F-25 | Donation kind on Received | Q-VOUCH-1 | building | src/store/money.test.ts | planned |
| F-26 | Settle up (repay others, partner split, Repay all) | settle.html, Q-NEXT-2 A, Q-PART-1 C | building | src/store/settle.test.ts | planned |
| F-27 | Partners: shares per fair, pending warning, Split anyway | partners.html, Q-SETTLE-GAPS | building | src/store/settle.test.ts | planned |
| F-28 | Person sheet: Pay (partial), Mark cleared with reasons + note, undo | settlesheet.html, clearnote.html | building | src/store/settle.test.ts | planned |
| F-29 | Lock day / reopen, carry-over, loss day | Q-SETTLE-GAPS | building | src/store/settle.test.ts | planned |
| F-30 | Stock screen with navrail categories, Low / Sold out filters | 21-polish2/stock.html, Q-STOCK-SET | planned | | planned |
| F-31 | Stock paste sheet (parser + one Spent entry) | 21-polish2/stockpaste.html, Q-PASTE-1 A, Q-STOCK-SET | planned | | planned |
| F-32 | Open the stall (float count) | 21-polish2/float.html | planned | | planned |
| F-33 | History per day with Edit / Refund / Hold to cancel | 21-polish2/history.html | planned | | planned |
| F-34 | Settings (Appearance, Feel/haptics, Sync, token range, payees, passcode, Developer, footer) | 21-polish2/settings.html, D-ACCESS, D-THEME | planned | | change |
| F-35 | Sheet bridge transport + Apps Script (TEST Sheet first) | D-SYNC | planned | | planned |
| F-36 | Backup export / import (no duplicates) | plan §7.3 | planned | | change |
| F-37 | Sync status pill + conflicts review | Q-HARM-10 | planned | | planned |
| F-38 | Now Serving screen (v1 feature) | v1 | deferred | | Steve to decide |
| F-39 | v1 data import | D-MIGRATE | dropped (Steve 16 Nov 15:48 IST: v1 never used) | | drop |
| F-40 | Bluetooth / local-peer sync transport | Steve 16 Nov 15:48 IST | deferred (backlog) | | |
| F-41 | Bluetooth printing | paused by Steve | deferred | | |
| F-42 | Token slip (about 58 mm wide, printable) | docs/STATUS.md plan, D-TOKEN | planned | | planned |
| F-43 | Open Orders tab: cyan band + Overview, one big squircle per order (header swipe / tap = order sheet with client name, Priority, Edit in Billing, Cancel), Lines / Cards looks, Confirm / Confirm all, hidden tap-to-change status, bar Cancel order + Handover | pos-work 22-orders-tabs rough v3, Q-ORDERS-1, Q-ORDERS-3..6, Q-COMPLETE-1 A, D-OPEN-TAP | building | src/ui/counter/open/OpenOrdersScreen.test.tsx | planned |
