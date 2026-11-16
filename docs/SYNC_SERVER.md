# Sync server (Go) — design (Q-SYNC-GO, Q-SHEET-FLUSH)
Written by Pos, 16 Nov 2026, 23:40 IST. **Design only; no server code yet.**

**Locks this follows (Steve)**
- **Q-SYNC-GO (t77u):** devices sync directly with a Go server using JSON, not through Google Sheets. Devices report regularly; the server sends updates to any device that is behind. A quick check tells whether a device is up to date.
- **Q-SHEET-FLUSH (t78u):** the server keeps the Google Sheet updated and never sleeps with unsent changes.

**Also follows**
- Q-HARM-10, unchanged: op log, Lamport + version vectors, duplicates ignored, seq gaps resent, Sheet edits come in as writer `sheet`, conflicts are recorded and never silent.
- Q-SYNC-ALL and Q-RECEIPT-SYNC C: every change is an op; no images are synced.
- The earlier spec `handovers/pos/state/SPEC_SHEET_2026-11-16.md` (a Go server on Render, a database as the source of truth, the Sheet as a mirror).
- 07-stack-reference (the LFPS Go relay pattern) and LFPS-SOW `SERVER_SHEET_V2_PLAN` §12.

## 1. Shape
```
devices (PWA, IndexedDB op log)  ⇄  JSON over HTTPS  ⇄  Go server (SQLite op store = source of truth)
                                                              │  mirror (Sheets API, service account)
                                                              ▼
                                                     Google Sheet "Stall Tokens — Data (v2)" (readable view + hand edits)
```
- The app's `Transport` interface (ARCHITECTURE §4.3) gains a `goTransport` adapter. The contract, fold and screens don't change.
- The Apps Script `Code.gs` transport stays as a **fallback** (§7).

## 2. Repo layout (`server/` in stall-tokens; Go 1.23, exact pins in `go.mod`/`go.sum`)
```
server/
  cmd/stallsync/main.go          start-up, config from env, graceful shutdown (SIGTERM → flush mirror)
  internal/op/                   the op contract in Go (mirrors src/contract/op.ts; contract tests share JSON fixtures)
  internal/store/                SQLite op store: ops(op_id PK, writer, seq, lamport, vv_json, kind, body_json, wall_at, recv_at), writers(writer, max_seq), pending_mirror(op_id, tries, last_error)
  internal/digest/               freshness digest (§4)
  internal/api/                  HTTP handlers: heartbeat, push, pull, health; auth middleware
  internal/mirror/               Sheet mirror: debounce/batch writer, Sheets API client behind an interface + fake
  internal/sheetin/              Sheet edits → ops from writer `sheet` (diff of info tabs vs last mirrored values)
  internal/*/..._test.go         table tests; `go test -race ./...` in CI
  Dockerfile, fly.toml|render.yaml (per Q-GO-HOST)
```
06 rules apply to the server too: 0, 1, 4 (each outside system has an interface and a fake), 6, 7, 10–13. It carries a version string, and all limits and URLs live in one config block.

## 3. Endpoints (JSON, HTTPS; header `Authorization: Bearer <stall key>`; protocol 3)
| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /v1/heartbeat` | `{ device, app_version, digest }` | `{ state: "latest" \| "behind" \| "ahead" \| "diverged", ops?: Op[] (missing, up to batch), want?: {writer, fromSeq}[], server_digest, mirror: {last_at, pending} }` |
| `POST /v1/ops` (push) | `{ ops: Op[] }` | `{ stored: opId[], resend: {writer, fromSeq}[] }`. Idempotent by `op_id`; sets `recv_at`. |
| `GET /v1/ops?after=<cursor>&limit=` (pull) | — | `{ ops, cursor }` (cursor = server row id) |
| `GET /v1/health` | — | `{ ok, version, ops, writers, mirror: {last_at, pending, last_error} }` (no secrets) |
| optional `GET /v1/stream` | SSE | `ops` events as they are stored (Q-GO-PUSH) |

## 4. Freshness digest (the "quick way to check", t77u)
- `digest = { vv: {writer: maxSeq}, count: totalOps, sum: first 8 hex chars of SHA-256(sorted opIds joined by "\n") }`.
- The server compares it per writer:
  - every `vv` entry and the count equal **and** the sum matches → `latest`;
  - the device is missing seqs → `behind`, and the server sends those ops in the same reply;
  - the device has seqs the server lacks → `ahead`, and the server lists `want`, so the device pushes them;
  - same vv but a different sum → `diverged` (a hole in the middle), so both sides exchange their op-id lists for the writers involved.
- The device sends a heartbeat every `CONFIG.sync.heartbeatMs` (15 s when visible, 60 s when hidden), and at once after any local op (debounced 500 ms), on app open, and when the device comes back online.
- Cost: one small POST; the reply is empty when `latest`.

## 5. Offline-first (unchanged on the device)
- Every op is saved to IndexedDB first, then queued in the transport outbox (Q-HARM-2). While offline, the outbox grows and the Sync dot shows a cloud with a slash. On reconnect: heartbeat → push → pull.
- Ops are idempotent and the fold sorts by Lamport order, so any arrival order gives the same state.

## 6. Sheet mirror (Q-SHEET-FLUSH)
- Each stored op is added to `pending_mirror` **in the same SQLite transaction**. A mirror worker batches pending ops every `mirrorDebounceMs` (2 s; max batch 500) and writes:
  - the hidden `ops` log;
  - the projections (the readable info tabs, rewritten from the fold, as Code.gs does now).
- **Never sleeps with unsent changes:**
  - On SIGTERM: stop taking requests, flush the mirror (up to `shutdownFlushMs` 20 s), then exit.
  - On boot: retry everything in `pending_mirror` first.
  - Retries use backoff with a limit and are logged (STYLE_GUIDE 13). The last error shows in `/v1/health` and in the app's Settings › Sync ("Sheet updated 23:41 · 0 waiting").
  - On a host that idles (free tiers), the server refuses to idle while `pending_mirror` isn't empty. A keep-alive ping from the device's heartbeat keeps it awake while devices are active; Q-GO-HOST decides the rest.
- **Sheet edits:** `sheetin` polls the info tabs every `sheetPollMs` (30 s) and diffs them against the last mirrored values. Each changed cell becomes an op from writer `sheet` (the Sheet wins a true clash, Q-HARM-10). Invalid rows are listed in `conflicts`, never silently dropped (LFPS-SOW kit).
- **Auth to Google:** a service account JSON in the host's secret store only. Never in the repo, the app or chat. Steve shares the Sheet with the service account's email.

## 7. What happens to Code.gs 2.0.0 (already deployed)
- It stays deployed as the **fallback transport** and the **Sheet-edit hook**. If the Go server is down, the app can still sync through Code.gs (a transport list setting; ops are idempotent, so both paths can run).
- When the Go server is live, Code.gs stops writing projections (the server owns them) and keeps only its `onEdit` hook, which posts edits to the server's `sheet` intake. This is cheaper than polling.
- The 60-day compaction (Q-SHEET-COMPACT A) moves to the server: SQLite → Drive backup first, then compact. If Q-GO-WHEN puts the server in 2.2.0, Code.gs 2.1.0 does it as BUILD_PLAN §5 says.

## 8. Auth and secrets
- The stall key is a server env secret. Devices hold it in their sync settings (it's per-device and never synced, FEATURES §0.1) and get it through sign-in links. It is never in the repo; the leak scan checks for it.
- Rate limit per device. A wrong key gets 401 and the app shows "Sync key not right".
- Beta (Q-BETA-PATH B) has no server config by default and must never point at Steve's real server unless he sets it on that device.

## 9. Tests
- Go: table tests for the digest, idempotent push, gap resend and the diverged case; a mirror with a fake Sheets client (debounce, crash between store and mirror → retried on boot, SIGTERM flush); `sheetin` diffs → `sheet` ops; `go test -race`.
- Shared JSON fixtures between Vitest and Go (the same ops must give the same fold hash on both sides).
- TS: `goTransport` against a fake server; the existing transport contract tests.

## 10. Open choices (Q-IDs; ★ = Pos recommendation; Steve locks)
- **Q-GO-HOST** (Render free has an ephemeral disk, so SQLite would be lost on a restart):
  - A Render Starter + persistent disk (paid, about $7/month + disk); the simplest of the always-on options.
  - B ★ Fly.io with a small volume for SQLite (a free allowance may cover it; machines can auto-stop, but the server refuses to stop while the mirror is pending, §6).
  - C Render free + a hosted DB (Turso libSQL or Neon Postgres, free tiers) instead of a local SQLite file. No disk to lose, but it sleeps after 15 minutes idle.
  - D Steve's own PC or a Raspberry Pi with a tunnel (free, but down when it's off).
- **Q-GO-PUSH** (how a device hears about new ops):
  - A heartbeat polling only (15 s visible / 60 s hidden).
  - B ★ A + SSE stream while a screen is open (near-instant kitchen tickets, plain HTTP, auto-reconnect).
  - C WebSocket (two-way, more moving parts).
- **Q-GO-WHEN**:
  - A build the server inside 2.1.0 (a new phase P6b; adds about a third more work).
  - B ★ 2.1.0 ships on the current Code.gs bridge with the digest heartbeat added to it; the Go server is 2.2.0, built as its own release with Beta first.
  - C the Go server first, then the rest of 2.1.0.
