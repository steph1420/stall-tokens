# Build plan — Stall Tokens 2.1.0
Written by Pos, 16 Nov 2026, 23:40 IST. This plan fits ARCHITECTURE §2–§6 (06 rule 0). Where it changes ARCHITECTURE, the change is listed in §9 and goes in with the phase that needs it.

- **Branch:** `feat/v2.1.0` off `main` @ e383374.
- **Go:** Steve t66u ("overhaul the app now. No quick build.").
- **Sequence change:** Steve 23:00 IST. The feature sheet, this plan and the mockups go to LFPS-SOW and Lippy first. Build phases P1–P7 start only when Pos resumes the work with their feedback.
- **The feature reference is `docs/FEATURES.md`.** W-xx refers to the walkthrough report (`agent-common handovers/pos/walkthrough-2026-11-16.md`).

## 0. Rules for every phase
- Commit and push at the end of each phase, staging files by explicit path. Never force-push. Never commit to main.
- CI must be green: pins, leak scan, ids, types, ESLint, Stylelint, dependency rules, contrast night/day, Vitest and build.
- Update `/FEATURES.md` statuses, `CHANGELOG.md` and ARCHITECTURE in the same commit as the code they describe (06 rules 0, 7, 12).
- Tests use local data or the fake transport only. The live-sync test uses a **TEST Sheet** that Steve owns and sets up, never his real Sheet or bridge. The STALL_KEY and /exec URL never go in the repo or in chat.
- If the same error happens twice, stop and report.
- Night and day screenshot pairs for every new or changed screen go to `pos-shots/pairs/` (s111+).

## 1. Phases
| # | Phase | Main W / lock items | Files touched (main) | Done when |
| --- | --- | --- | --- | --- |
| P0 | **Channel plumbing** (Q-CHANNEL A) | Beta URL, storage namespace, About shows the channel | `src/config/index.ts` (`channel`, `storage.prefix` by channel), `vite.config.ts` (SW `navigateFallbackDenylist: [/\/beta\//]` on Stable), `scripts/stamp.mjs` (build date = commit time, so a Stable rebuild is byte-identical), `.github/workflows/deploy-pages.yml` (Stable root + Beta `/beta/` in one artifact), `.github/workflows/beta-ping.yml` (on push to `beta`, dispatches deploy on main) | Beta deploys without changing Stable's bytes (checked by diffing the root artifact before/after). **Needs Q-BETA-PATH (§8).** |
| P1 | **Data + rules** (no UI) | W-05/06/08/11/12/22/27/32/36, Q-COMPLETE-2 A, Q-HANDOVER-PAY, Q-REFUND-1 A data, categories (P-3), stations (PK-6), day notes (P-13) | `contract/op.ts`, `contract/state.ts`, `store/fold/orders.ts`, `store/fold/fold.ts`, `store/rules/status.ts`, `store/rules/kitchen.ts`, `store/rules/catalog.ts` (new: categories + stations from records with virtual seeds), `store/counter.ts` (`available`, newOrder reuse, day rollover), `store/open.ts` (handover/complete), `store/refund.ts` (new), `data/types.ts` (prefs: orderId, page, menuSort, lastRole, display prefs) | Unit + harm10 tests in §6 pass. |
| P2 | **Counter** | W-01/02/03/04/07/09/12/13/14/15/16/17/18/19/21/24, Unpaid tab, Complete hold, drafts nav + big +, Prioritise, Refund sheet, Order sheet actions, menu sort + search, Back nav | `ui/counter/CounterShell.tsx`, `ui/counter/open/*`, `ui/counter/unpaid/UnpaidScreen.tsx` (new), `ui/counter/refund/RefundSheet.tsx` (new), `ui/counter/drafts/DraftsSheet.tsx` (new), `ui/counter/menu/*`, `ui/counter/CounterSheets.tsx` (split: `ItemSheet.tsx`), `ui/counter/payment/*`, `ui/slip/TokenSlip.tsx`, `store/nav.ts` (new: history owner), `ui/kit/HoldRing.tsx` (new, timed ring, motion tokens) | Playwright W-scenarios for the Counter pass in night and day. |
| P3 | **Kitchen + Station** | W-25/26/28/29/30/31/33/35/36/37/38/39/40/41/42/43/44, PK-1/2/3/4/5/10 | `ui/kitchen/*`, `ui/station/*`, `ui/kitchen/Leaving.tsx` (synchronous leave, inert veil, 4 veils, HOLD_MS → motion token), `ui/kit/alerts.ts` (new: chime/flash; audio behind an interface + fake, 06 rule 4), `ui/kit/wakeLock.ts` (new), `store/kitchen.ts` (step gap, undo, pinned order) | Playwright kitchen scenarios plus 1024×768 and 844×390 shots. |
| P4 | **History, Money, Close day, Day notes, Stock** | W-08/10/18/21/23, Order History, Close day, Day summary, day notes, Unpaid tile, Refunds line | `ui/stall/HistoryScreen.tsx` (rewrite: Orders · Money, search, chips), `ui/stall/CloseDayScreen.tsx` (new), `ui/stall/DayNotesSheet.tsx` (new), `ui/money/MoneyScreen.tsx`, `store/money.ts`, `store/rules/money.ts`, `store/rules/stock.ts` (W-23), `ui/stock/StockScreen.tsx` | Unit tests for money/close maths; Playwright History + Close day. |
| P5 | **Settings + Data** | W-20, Backup / Restore / Snapshots / Reset, Categories, Stations, Display, About (channel), Install, Updates dot, Dev 7 taps (Q-DEV-7TAP) | `ui/stall/SettingsScreen.tsx` (split per group under `ui/stall/settings/`), `store/backup.ts` (new), `data/adapters/backupFile.ts` (new: file export/import behind an interface + fake), `data/adapters/snapshots.ts` (new IDB store `<prefix>.snapshots`), `data/adapters/reset.ts` (deleteDatabase + prefs + caches) | Backup → Reset → Restore round-trip test gives the same fold hash. |
| P6 | **Sheet bridge Code.gs 2.1.0** | Q-SHEET-COMPACT A (60-day Drive backup, then compact), new info tabs `categories`, `day_notes`, new op kinds pass through, app-version register | `apps-script/Code.gs`, `src/data/sheetSchema.test.ts`, `docs/SHEET_SETUP.md` | Schema tests pass. A TEST Sheet run is done by Steve (or by Pos on a TEST copy he shares). Code.gs carries version `2.1.0`. |
| P7 | **Release to Beta** | CHANGELOG, What's New, FEATURES statuses, screenshots, draft PR | `CHANGELOG.md`, `src/ui/stall/whatsNew.ts`, `/FEATURES.md`, `docs/STATUS.md` | Beta live at `/stall-tokens/beta/`. Draft PR to main is open. **Stable is untouched until Steve's go.** |

The order is chosen so that the data rules (P1) land before any screen depends on them, and the kitchen (P3) reuses P2's veil and undo kit.

## 2. Op schema changes (contract v2, additive; 06 rule 6)
All new things are **additive kinds or optional fields**. `CONTRACT_VERSION` stays 2, so old ops fold unchanged. Each one gets a contract test.
| Op / field | Body | Why |
| --- | --- | --- |
| `order.complete` (new kind) | `{ orderId, unpaid: boolean, dueAt: Paise, reason: string }` | Q-HANDOVER-PAY revised / Q-COMPLETE-2 A. Completed = this op OR (all handed AND due ≤ 0). |
| `refund.add` + optional `reason: string`, `lines: {lineId, qty}[]`, `restock: boolean` | Old refunds have none, which reads as reason "", no lines, no restock. | Q-REFUND-1 A. `restock` moves the picked qty back to stock in the fold (once, keyed by refundId). |
| `record.set` table `category` (new table) | `{ name, sort_order, default_station, default_swatch }`, `removed` = hidden | P-3 A, rename by id. |
| `record.set` table `day_note` (new table) | id = dayId; `{ text, tags }` | P-13, editable days later. |
| `record.set` table `station` (exists) | `{ name, icon, colour, sort_order }`, `removed` = inactive | PK-6. |
| `item.set` field `categoryId` (optional) | category record id | P-3 A. The legacy `category` text is kept as a fallback. |
| `refund.void` (new kind) | `{ refundId, reason }` | Q-REFUND-INSTANT: Undo of an instant refund as a compensating op. The fold marks the refund voided (it stays in the record, shown struck through in History) and reverses its `restock`. |
| `order.create` + optional `device: string` | the device label (serving name + short device id) | Q-DRAFT-SYNC: shows whose draft it is on every Counter. |
| `device.set` (new kind) | `{ deviceId, label, rangeIndex, role }` | Q-SYNC-ALL device registry. |
| `snapshot.note` (new kind) | `{ snapshotId, at, reason, opCount, hash }` | Q-SYNC-ALL backup metadata. |
| `receipt.set` (new kind, if Q-RECEIPT-SYNC A) | `{ entryId, fileId }` | Q-SYNC-ALL receipt photos through Drive. |
| `setting.set` keys `autoPrep`, `stationLook`, `openLook`, `menuSort`, `askNameOnUnpaid`, `refundAllowedByOverPaise`, `ageWarnMin`, `ageLateMin` | strings | Shared settings (flags in FEATURES §30). |

**Migration (no migration ops written):**
- **Categories:** the list is the category records **plus virtual categories** with deterministic ids `name:<text>` for each distinct legacy `item.category`. Editing a virtual category writes `record.set category name:<text>`. Two phones doing the same edit converge on one id (no duplicates), and old items match by name.
- **Stations:** the list is the station records plus virtual stations from `CONFIG.stations`. A station's **id stays its first name** (today's `line.stationId` values), so no line or item changes. A rename only sets `fields.name`.
- **Forward compatibility:** 2.1.0's `isOp` keeps well-formed ops of **unknown kinds** in the log (they fold as no-ops and are re-folded after an update) instead of refusing them. A 2.0.0 phone can't do this, so before Stable gets 2.1.0 every phone must take the update. Sync › About shows a warning when the bridge has seen a 2.0.0 device in the last day (the bridge records the app version per writer, P6).
- **Automatic local snapshot** before the first 2.1.0 fold on a phone (LFPS-SOW kit: back up before any migrate).

### Everything syncs (Q-SYNC-ALL, Steve t76u)
Audit of what is on the device today (v2.0.0 `DevicePrefs`, the IDB stores) and where each goes:
| Today on the device | 2.1.0 |
| --- | --- |
| `servingName`, `rangeIndex`, `role` | new op `device.set {deviceId, label, rangeIndex, role}`, a device registry folded on every device. A clash on the same range = Conflict row plus a toast "Range 1–500 is also used by Ravi". |
| `autoPrep`, `stationLook`, `openLook`, new `menuSort` | `setting.set` shared keys |
| `passcode`, `passcodeOff` | shared setting `passcodeHash` (salted SHA-256) + `passcodeOn` (Q-PASSCODE-SYNC A ★; until it is answered, it stays as today) |
| `haptics` | stays on the device if Steve confirms (FEATURES §0.1), else a shared setting |
| `theme`, kitchen text size, Quiet / volume, `deviceId`, `syncUrl`, `syncKey`, screen place | stay on the device (the only exceptions, FEATURES §0.1) |
| receipt photos (IDB `receipts`) | Q-RECEIPT-SYNC A ★: the bridge uploads to Drive; new op `receipt.set {entryId, fileId}`; the photo cache on the device stays only as a cache |
| snapshots (new, IDB) | content = the op log (already on the server); new op `snapshot.note {snapshotId, at, reason, opCount, hash}` so every device and the Sheet see when backups were made |
| Undo stack | the stack is session memory; every undo is a synced compensating op |

Migration: on first 2.1.0 start, each device writes one `device.set` and the `setting.set` ops for its old local values, but **only if no shared value exists yet** (the first device's choice wins; later devices adopt it). Then it drops the local copies.
Code.gs: `device.set`, `snapshot.note` and `receipt.set` are stored in the hidden `ops` log only. The device registry is projected into the existing hidden register (not a readable info tab).

### Drafts sync (Q-DRAFT-SYNC, Steve t75u)
- Drafts were already written as ops (`order.create`, `line.add`, `line.qty`, `line.note`, `order.note`, `order.discount`, `order.delete`). 2.1.0 makes this explicit and complete:
  - **create** = `order.create`; **edit / line add / remove** = `line.add` / `line.qty` (0 removes); **discard** = `order.delete`; **open as order** = `order.send` or `payment.add`.
  - All go through the same outbox to the Sheet bridge at every step (no device-only draft state). Every device folds them, so the Drafts sheet lists drafts from every Counter.
- Only the "which order is on screen" pointer stays on the device (FEATURES §0.1).
- Stock held by drafts counts on every device (`available()` already uses all live orders). Old drafts are visible to all and can be discarded by anyone (the discard is an op, so it syncs).
- Token clash: each Counter device keeps its own token range (D-TOKEN), so two devices never make the same draft token.
- **Code.gs:** no new tab. Draft ops land in the hidden `ops` log only. The readable info tabs and `records_log` keep excluding orders that aren't sent or paid (checked in `sheetSchema.test.ts`). `refund.void` is projected into the hidden refunds log as a void row.

## 3. Fold / rule changes (P1)
- **Status rules**
  - `rules/kitchen.ts`: `lineComplete = handed` only. A Counter-marked Ready line stays on kitchen and station views, muted, as "Marked by counter" until handed (W-06, W-27).
  - `openOrders`: becomes `isOpen` (not cancelled, not deleted, not completed). `kitchenOrders` stays "any line not handed".
  - `rules/status.ts`: `completed(o)`, `unpaid(o) = sent && due(o) > 0 && !completed-unpaid`, `orderStatus` words: `Unpaid`, `Handed over`, `Written off`.
- **Stock**
  - `store/counter.ts available()`: skip cancelled/deleted orders and committed qty (W-32). Drafts still hold stock, but the Drafts sheet shows it (W-11).
  - Back-to-stock on refund: `fold/orders.ts` applies `restock` once per refundId, and only for lines whose committed qty covers it.
- **Payments**
  - A payment after `order.complete {unpaid}` clears the write-off.
  - A concurrent `payment.add` vs `order.complete unpaid` writes a Conflict row (rule `causal`) through `lww(order:<id>, 'complete')`. Money from the payment is never dropped (money ops only add).
- **Counter flow**
  - `newOrder`: reuse an empty current draft (W-07/W-14).
  - Day rollover: on a new IST date with the last day not locked, the Counter asks (W-22).
- **Fix the latent bug:** `fold/orders.ts` order fields now honour `lww().apply` (report §3 latent).

## 4. Data layer (P5)
- `BackupFile` interface: `export(ops, prefs) → Blob`, `read(file) → {ops, meta}`. A browser adapter (download/share) plus a fake.
- `Snapshots` interface: `save(reason)`, `list()`, `load(id)`. IDB `<prefix>.snapshots`, keeping `CONFIG.backup.keep` = 20.
- `Reset`: deletes `<prefix>.log`, `<prefix>.receipts`, `<prefix>.snapshots` (after the pre-reset snapshot has been exported) and the prefs key, except the device id (P-8 A). It also clears the SW runtime caches but keeps the app shell.
- All of these are called only from `store/backup.ts` (06 rule 1, dependency-cruiser).

## 5. Code.gs 2.1.0 (P6; server rules 0, 1, 4, 6, 7, 10–13)
- **Version string:** `CODE_VERSION = '2.1.0'`, schema 3 (append-only: new tabs and columns only), protocol 2 (unchanged wire format).
- **Info tabs:** add `categories` and `day_notes` (editable; hand edits become `sheet` ops like F-48); `stations` gains `icon` and `colour`.
- **Unknown op kinds:** they are stored in `ops` as they are (append-only, idempotent by `op_id`) and ignored by the projections.
- **Device register:** add `app_version` and `last_seen` per writer (from a new optional push field `client`). Shown in Sync › About.
- **Compaction (Q-SHEET-COMPACT A):** a daily time trigger at 03:30 IST.
  1. If the oldest op is younger than 60 days, stop.
  2. **Back up to Drive first:** make a copy of the whole spreadsheet in Drive folder "Stall Tokens backups", named `ops-backup-<IST date>`. **If the copy fails, stop: never compact without a backup.**
  3. Under the script lock, collect ops older than 60 days **whose day is locked (F-29)** and is not the current or previous event (the SoW rule).
  4. Write `base` ops (writer `base`, lamport 0, deterministic opIds `base:<n>`) that reproduce those days' final state: item fields, settings, payees, people, records, and per-day closed order and money summaries as `record.set day_summary`. Then move the old rows to a hidden `ops_archive` tab in the backup copy only, and delete them from `ops`.
  5. Write a `_meta` row: compacted count, backup file id, time (IST).
  - Phones that pull after this get the `base` ops. Their own older ops stay in their local logs, and duplicates are ignored.
- **Tests:** `sheetSchema.test.ts` checks the new tabs and columns. A compaction dry-run function `compactPlan_()` returns what it would do, with no writes, run on a TEST copy.

## 6. Test plan
**Unit (Vitest)**, named per W / lock:
- **Folds and refunds**
  - `fold/complete.test.ts`: Q-COMPLETE-2 A; Ready by the counter never completes; handover-unpaid stays open; complete-unpaid; a payment after a write-off; harm10 concurrent pay vs complete (conflict row); duplicates and gaps.
  - `fold/refund.test.ts`: whole / lines / custom; it can't refund more than is held; restock applied once; the order isn't cancelled.
  - `store/stock.test.ts`: cancel gives back availability (W-32); drafts are listed.
- **Counter, kitchen, data**
  - `store/counter.test.ts`: newOrder reuses an empty draft (W-07/14); resume (W-12); day rollover (W-22); discount bound (W-16).
  - `store/kitchen.test.ts`: step gap (W-30); hold Done? reopens (W-31); Send back; station filter = stationOrders (W-36); pinned order (W-28).
  - `rules/catalog.test.ts`: virtual categories and stations, rename keeps the id, convergence of two phones.
  - `store/backup.test.ts`: export → reset → import gives the same fold hash; restore twice adds nothing.
  - `contract.test.ts`: new kinds and fields; unknown-kind forward compatibility.
- **Clock skew:** ±1 day on the phone clock changes nothing (Q-HARM-10 replay).

**UI (Vitest + Testing Library):**
- Swatch background not transparent (W-02).
- Unpaid tab count.
- Complete button yellow + toast on tap.
- Refund sheet chips.
- Kitchen PK-2 header shows note / client / age / Unpaid.

**Browser (Playwright, `e2e/w-scenarios.spec.ts`):**
- One test per W-01…W-44 scenario, built from the walkthrough scripts (`pos-work/24-walkthrough`, `25-kitchen`). Each runs in **night and day** at 390×844, and the kitchen ones also at 1024×768 and 844×390.
- Requests to script.google.com, docs.google.com and googleapis.com are blocked in the test context.
- The double-tap break-it cases (W-09, W-14, W-29, W-30) use real pointer double taps at 40 ms.
- The output is a table W-xx → pass/fail written to `e2e/W_STATUS.md`.

**Not automatable here (stated, 06 rule 12):**
- Two real phones over a TEST Sheet.
- Real audio and haptics.
- Bluetooth printing.
- Android PWA kill/restore.

These are listed for Steve's verify run on Beta.

## 7. Risks
| Risk | Effect | Guard |
| --- | --- | --- |
| Drafts syncing add Sheet traffic | More pushes during service | Ops are already batched (`pushBatch`, adaptive poll); a draft step is one small op. Measured in the TEST Sheet run. |
| A 2.0.0 phone meets 2.1.0 ops | It refuses unknown kinds, so state differs between phones | Beta uses its own namespace and a test bridge. At Stable cutover, every phone updates first; the bridge version register warns. |
| Stable rebuild on each Beta deploy | Stable phones get a needless "Update ready" | Build date = commit time, so the Stable artifact is byte-identical. CI diff check. |
| Stable SW serves its index.html for `/beta/` | Beta never loads on a phone that has Stable | 2.0.1 adds `navigateFallbackDenylist /beta/` (Q-BETA-PATH A), or a separate repo (B). |
| Compaction loses data | Unrecoverable | Drive copy first, stop on failure, locked days only, dry-run first, never the current or previous event. |
| Categories split by typos (existing data) | Duplicate categories | Virtual categories show the duplicates side by side in Settings › Categories, with "Merge into…" (a rename to the same name), done by Steve. |
| Back-button owner breaks a sheet | Phone Back exits | Playwright: Back from every screen and sheet. |
| Wake lock not supported | The tablet sleeps | Feature-detected. Settings shows "Keep screen on isn't available on this browser". |
| Audio blocked | Silent alerts | The first-tap unlock plus a visible flash always (PK-1). |
| Scope creep (gap features) | A late 2.1.0 | Gap rows are vetoable; each is its own commit, so dropping one is a revert of that commit. |

## 8. Beta channel deploy (Q-CHANNEL A, Steve t71u) and **Q-BETA-PATH**
**Facts checked on 16 Nov, 23:3x IST:**
- The `github-pages` environment only lets the `main` and `gh-pages` branches deploy.
- Pages serves one artifact for the whole site, so every deploy re-uploads the root.
- The Stable service worker's scope `/stall-tokens/` covers `/stall-tokens/beta/`, and its `navigateFallback` would answer Beta navigations with Stable's `index.html`.

**Q-BETA-PATH**
- **A ★** Beta at `/stall-tokens/beta/` (as Steve said), through a one-time **2.0.1 Stable plumbing release** on Steve's go. It has no visible change: the Stable SW ignores `/beta/`, the build date becomes the commit time, and `deploy-pages.yml` builds main at the root and the `beta` branch at `/beta/` in one artifact. A `beta-ping.yml` on the `beta` branch dispatches the main workflow (workflow_dispatch is allowed from GITHUB_TOKEN). After that, Beta updates never change Stable's bytes.
- **B** Beta in its own public repo `steph1420/stall-tokens-beta`, URL `/stall-tokens-beta/`. Stable is never touched at all, but it means a second repo and a second Pages site.

Beta build settings (both options):
- `VITE_CHANNEL=beta`, storage prefix `stall-tokens-beta.v2`.
- No baked-in sync URL or key (`VITE_SYNC_*` unset).
- The manifest name is "Stall Tokens Beta", so the installed icon differs.

## 9. ARCHITECTURE changes (made with each phase)
- §3 state owners: add `store/nav.ts` (history), `store/refund.ts` and `store/backup.ts`.
- §4.1: add `order.complete`, the refund fields, the category / day_note tables, and unknown-kind forward compatibility.
- §4.5: snapshots IDB and the Beta storage prefix.
- §5 interaction owners: Unpaid tab, Refund sheet, Drafts sheet, Close day, History.
- §6 viewports: add 421×927 and 1024×768.
- §5.1 kitchen flow: Q-COMPLETE-2 A replaces "Marked by counter completes".

## 10. Rollback
- **Beta:** redeploy the previous `beta` commit, or switch Beta off. Stable isn't affected.
- **Stable** (after a later go): Stable keeps the v2.0.0 tag and the `backup/pre-v2.0.0` branch. Before any 2.1.0 Stable go there will be a `backup/pre-v2.1.0` branch and tag `v2.0.0`/`v2.0.1`. Rollback = redeploy the previous tag through `workflow_dispatch` with that ref. **No force-push, no moved tags.**
- **Data:** every phone has snapshots plus Back up now. The Sheet has the Drive copy from before any compaction.

## 11. Progress note
- **16 Nov, 23:45 IST:** FEATURES.md, this plan, DECISIONS (agent-common) and roughs s111+ are done. **Build not started** (Steve's 23:00 IST sequence change). Next: Pos resumes with the LFPS-SOW and Lippy feedback and Steve's answers to FEATURES §30, then P0 (needs Q-BETA-PATH) or P1.

## 12. Resumable checklist (tick and push as each item lands)
- [x] D1 `docs/FEATURES.md` (5c443a9)
- [x] D2 this plan
- [x] D3 DECISIONS in agent-common (locks + PK-1…PK-10 + Prioritise + Q-CHANNEL A)
- [x] D4 first mockup pairs (s111+; see report)
- [ ] D5 feedback from LFPS-SOW / Lippy folded in; Steve answers FEATURES §30
- [ ] P0 channel plumbing (needs Q-BETA-PATH)
- [ ] P1 data + rules + unit tests
- [ ] P2 Counter
- [ ] P3 Kitchen + Station
- [ ] P4 History / Money / Close day / Day notes / Stock
- [ ] P5 Settings + Data (backup, snapshots, reset)
- [ ] P6 Code.gs 2.1.0 (compaction dry-run first, TEST copy)
- [ ] P7 Beta release + draft PR to main
