# ARCHITECTURE.md — Stall Tokens v2
Based on `steph1420/agent-common` `templates/ARCHITECTURE.md` and the starter `steph1420/app-starter` v0.1.0 (`0746f7b`, checks from agent-common `88c9672`). Plan: agent-common `handovers/pos/V2_BUILD_PLAN.md` (`36b2e06`) with Steve's 16 Nov 15:48 IST changes (§10). The doc leads; the code follows (`06` rule 0). Every commit states `fits ARCHITECTURE §x`.

## 1. Context
Stall Tokens is the ordering, billing and token app for Steve's fair stall: one or two Counter phones, a Kitchen screen and per-station screens, plus money, settle-up and stock. It is an offline-first PWA. Every device keeps the whole op log in IndexedDB and works with no network. A Google Sheet (through an Apps Script web app, the "Sheet bridge") is the locked cloud copy and the way devices see each other (Q-HARM-1, Sheets locked 16 Nov). Screens follow the locked mockups in agent-common `handovers/pos/assets/stall-mockups-locked/` (final look: `20-polish/`, `21-polish2/`, night and day).

Not in v2.0.0: Bluetooth printing (paused), UPI auto-detection (Q-UPI-1 manual), Bluetooth / local-peer sync (backlog, §4.3), hold/fire timing, merge/move lines, cancellation resolver, PDF share, v1 import (dropped, §10).

## 2. Layers and allowed imports
| Layer | Folder | May import | Must not import |
| --- | --- | --- | --- |
| config/tokens | `src/config/`, `src/tokens/` | nothing | anything else |
| contract | `src/contract/` (op shapes, money, validation) | config/tokens | data, store, ui, motion, mock |
| data | `src/data/` (interfaces + `adapters/`, `sync/`) | contract, config/tokens | store, ui, motion, mock; network/storage except inside its own adapters |
| store (Zustand) | `src/store/` (actions, `fold/`, `rules/`) | contract, data, config/tokens | ui, motion, mock, network, storage |
| motion | `src/motion/` | contract, config/tokens, framer-motion | data, store, ui, mock, network, storage |
| ui | `src/ui/` (screens, `kit/`) | contract, store, config/tokens, motion | data, network, storage, framer-motion |
| mock | `src/mock/` | contract, config/tokens | production app (tests and e2e only) |

Rules are checked by `.dependency-cruiser.cjs` and ESLint (no `fetch`/storage globals in ui, store, motion). Pure domain rules (bill maths, paste parser, settlement) live in `store/rules/` and are unit-tested on their own; the fold lives in `store/fold/`.

## 3. State owners
| State | Owner (module) | Who may write | Who may read |
| --- | --- | --- | --- |
| Op log (the only truth for shared data) | `data/adapters/localIdb.ts` (persisted), mirrored in memory by `store/index.ts` | store `dispatch` only (local ops) and `store/sync` intake (remote ops) | store |
| Shared state (menu, orders, payments, money, people, stock, days, settings) | `store/fold/` = `fold(log)` | nobody: always derived | ui via `useApp` |
| Device prefs (deviceId, theme, serving name, token range, haptics, passcode) | `data/adapters/deviceStore.ts` | store actions | store |
| UI place (screen, current order, each order's last page, open sheet, Kitchen pill, Station place + opener) | `store/ui.ts` | store actions | ui |
| Storage mode (IndexedDB or memory-only fallback) | `data/adapters/fallback.ts`, surfaced as `memoryOnly` by `store/core.ts` | data adapter | ui (calm banner) |
| Sync status (pending count, last pull, errors) | `data/sync/engine.ts` | engine | store → ui (sync pill) |
| Conflicts | `store/fold/` (recorded during the fold) | nobody: derived | Settings › Sync › Review |

One owner per piece of state; no second copy. Device prefs are per device on purpose (not synced).

## 4. Data flow
1. A tap goes to the screen's interaction owner (§5).
2. The screen calls a store action (an intent). It never calls data, network or storage.
3. The store checks the rule (e.g. "Pay only if something is due"), builds one op, applies it to memory at once and appends it to the op log through `OpStore` (IndexedDB). A failed write (quota, private mode) is shown calmly in a banner with Retry; the op stays in memory and the pending list, nothing is silently dropped.
4. The store hands the op to the sync engine, which sends it through the active transport(s).
5. Remote ops come back through the transport (or BroadcastChannel from another tab), are de-duplicated by `opId`, appended, and the state is re-folded.
6. UI reads from the store and redraws.

### 4.1 Op log (Q-HARM-10)
Every op: `{ v, opId = writer:seq, writer, seq, lamport, vv, kind, body, wallAt }` (`contract/op.ts`).
- `writer` = deviceId + a short per-page-load id, so two tabs on one phone never reuse a `seq`.
- `lamport` = 1 + highest lamport seen; `vv` = highest seq seen per writer when the op was made.
- State = `fold(sort(log))`, sorted by (lamport, writer, seq). The same log gives the same state on every device; wall clocks are display-only, so a phone clock set wrong (±1 day) changes nothing.
- Duplicates are ignored by `opId`; a gap in a writer's seq is fine (ops are independent facts) and is listed in Sync status until filled.
- Field sets (item fields, notes, discount, settings) are last-writer-wins by the sort order, and when two writers set the same field without having seen each other (vv check) a conflict is recorded; both values stay in the log, nothing is lost.
- Money ops (payments, refunds, Spent, Received, Pay, Mark cleared, reversals) only add; they never clash. Undo is a reversal op that references the op it undoes.
- Money is stored in whole paise (integers); `contract/money.ts` formats en-IN (₹1,23,456.50).

### 4.2 Data source interface (Q-HARM-1)
`data/index.ts` exposes one `DataSource` = `{ ops: OpStore, device: DeviceStore, channel: TabChannel, transports: Transport[] }`.
- `OpStore`: `load()`, `append(ops)`. Adapters: `LocalIdb` (always, DB name prefixed `stall-tokens.v2`), `MemoryOpStore` (tests).
- `Transport`: `push(ops) → acked opIds`, `pull(cursor) → { ops, cursor }`, `name`, `health()`. Adapters: `FakeTransport` (tests and dev, replays delay, loss, duplicates, errors, timeouts) and `SheetBridge` (Apps Script; built last, TEST Sheet first).
- `TabChannel`: BroadcastChannel between tabs on one device.

### 4.3 Pluggable transport (Steve 16 Nov 15:48 IST)
The op log does not know how ops travel. The sync engine (`data/sync/engine.ts`) keeps a per-transport outbox (ops not yet acked) and pull cursor, polls with the adaptive interval in `CONFIG.sync`, and merges what each transport returns by `opId`. Any number of transports can run side by side, because ops are idempotent. v2.0.0 ships the Sheet bridge. **Backlog:** a Bluetooth / local-peer transport (nearby phones with no internet) implements the same `Transport` interface; nothing in contract, fold, store or ui changes for it.

## 5. Interaction owners
| Screen | Interaction owner | Gestures (one per direction) |
| --- | --- | --- |
| Launch | `ui/launch/LaunchScreen.tsx` | tap |
| Counter shell (header, order strip, Open orders) | `ui/counter/CounterShell.tsx` | strip: horizontal scroll; tap a tab = switch order, tap the current tab = Open orders list |
| Menu | `ui/counter/menu/MenuScreen.tsx` | tap card = +1; press-and-hold card = stock panel; −/+; pencil = note |
| Billing | `ui/counter/billing/BillingScreen.tsx` | −/+, tap qty = number strip; tap totals = Discount / Round-off sheet; hold Delete = delete |
| Payment | `ui/counter/payment/PaymentScreen.tsx` | tap Cash/UPI = numpad; drag slider (₹10 snap); tip chips; vertical scroll to Count notes |
| Kitchen (F-19) | `ui/kitchen/KitchenScreen.tsx` (+ `KitchenCard.tsx`) | pills: horizontal scroll, tap = filter; line: tap = next status, hold = On hold; hold the token = Priority; list: vertical scroll |
| Station (F-21) | `ui/station/StationScreen.tsx` | order tabs: horizontal scroll, tap = show; body: swipe left/right = next/previous order (`CONFIG.gesture.swipePx`), vertical scroll; line: tap = next status, hold = On hold |
| Open orders Done? row (F-20) | `ui/counter/CounterShell.tsx` | Send back / Confirm; Hand over for Ready |
| Sheets (note, item, discount, payee, numpad, station Overview) | `ui/kit/Sheet.tsx` + each sheet | tap scrim or Done to close |

Page changes use the header tabs and Back/Next buttons only; no page swipe, so the strip's horizontal scroll and the menu's vertical scroll never fight. Holds use `HOLD.durationMs`; motion springs come from the motion tokens; reduced motion = short fade.

### 5.1 Kitchen status flow (F-19..F-22)
Station tap: Waiting → Preparing → Done?; On hold → Preparing; Ready → Handed over (Q-HANDOVER-1 C, the Counter can hand over too). Counter (Open orders): Done? → Ready (Confirm) or → Preparing (Send back); Ready → Handed over. Mark ready (Q-COUNTER-FINISH): from Open orders the Counter can finish any sent line whatever its kitchen status, as a `line.finish` op; it goes straight to Ready with `byCounter`, and Kitchen/Station show it muted with the Ready icon, labelled "Marked by counter" (the flag clears if the line moves off Ready/Handed over). Handed-over lines stay on the card, muted (Q-KITCHEN-4 A). When an order is finished at a station, the next order's waiting lines there go to Preparing (Q-AUTOPREP, device pref `autoPrep`, default On). Priority is an order flag (`order.priority` op), set by holding the order number on a Kitchen card or by the Billing switch (Q-PRIORITY-1 C); priority orders sort first. Pause (Q-PAUSE-1 A): after each local op that can change it, `store/core.ts` writes the derived `line.status` ops from `rules/kitchen.ts` `pauseMoves` (a station a Priority order still needs pauses other orders' Preparing lines; when none needs it, they go back to Preparing). The moves are pure and reach a fixed point, so every device folds the same log; a tap on a paused line is refused with a toast while the pause holds. Rules: `store/rules/kitchen.ts`; actions: `store/kitchen.ts`. Status colours: `--dl-stall-st-*`; the Priority bob is `motion/` `Bob` (`LOOPS` in `motion/tokens.ts`).

## 6. Display scales and test viewports
| Scale | Viewports |
| --- | --- |
| Standard | 360×780, 390×844 (the locked mockups' size) |
| Large text (root font 125%) | 390×844 |
| Landscape check | 844×390 |

Night (`stall-night`) and day (`stall-day`) at every row. Contrast for every theme pair runs in `npm run contrast`. Sizes are in rem so large system text scales the layout.

## 7. Theming (ADR-0003)
`<html data-theme="stall-night|stall-day">`. Semantic colours are the `stall` family in `src/tokens/tokens.json` (contrast-checked); stall-only values (gradients, glows, item accents, CTA) are `--dl-stall-*` in `src/tokens/stall.tokens.css`. Fonts: system (D-FONT), no web font.

## 8. Live worktree
| Copy | Repo | Branch | Tag | Path | Owner | Release pointer | Rollback sha | Live bundle hash |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| v1 (live, unused) | steph1420/stall-tokens | main | v1.0.0 | `/stall-tokens/` | Pos | main | d9daa49 | v1 single file |
| backup | steph1420/stall-tokens | backup/pre-v2.0.0 | v1.0.0 | — | Pos | — | d9daa49 | — |
| v2 (building) | steph1420/stall-tokens | feat/v2.0.0 | — | not deployed | Pos | — | d9daa49 | — |

## 9. Risks
| Risk | What we do | Check |
| --- | --- | --- |
| Shared github.io origin | Every DB name and storage key starts `stall-tokens.v2` | unit test on adapter names |
| Two devices issue the same token offline | Counter devices pick a token range (1–500, 501–1000) in Settings (D-TOKEN) | `rules/tokens.test.ts` |
| Double taps create two payments | Button locks while busy and the store refuses Pay when nothing is due | e2e double-tap + store test |
| Storage full / private mode | Calm banner with Retry, op kept in memory | data test with failing OpStore |
| PWA stale version | Calm "Update ready" prompt, never mid-order | manual |
| Offline overselling stock | Allowed, flagged after sync | fold test |
| Sheet bridge load / latency | Adaptive polling, load check before go-live | SheetBridge contract test (TEST Sheet) |
| Secrets or real names pushed | Leak scan pre-push; names typed in the app only | `checks/leak-scan.mjs` |

## 10. Changes from the plan (Steve 16 Nov 15:48 IST)
- "V2 is live. V1 never used": **D-MIGRATE dropped** (no v1 import code, screen or tests) and **D-HOST changed**: no `/beta/` path; v2 replaces v1 at the main address once every test passes. v1 is kept as `legacy/v1/index.html`, tag `v1.0.0` and branch `backup/pre-v2.0.0`.
- Bluetooth local sync is backlog; the sync layer is a pluggable transport (§4.3).
- ADR numbering: the starter already uses ADR-0002 (framer-motion pin), so the plan's "ADR-0002 accent" is `ADR-0003-stall-accent.md`.
- Tokens are issued when an order is opened (the locked strip shows `#048 New`), not when it is placed; a deleted order leaves a gap in the numbers.

## 11. Decisions
- ADR-0001: one styling system, Driftline tokens + CSS Modules.
- ADR-0002: framer-motion pinned exactly at 12.43.0.
- ADR-0003: stall accent family (locked cyan/vibrant) beside Driftline blue.
