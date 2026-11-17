// F-03 F-37 Sync engine: one outbox and pull cursor per transport; any number of transports side by side
// (ARCHITECTURE §4.3). Ops are idempotent by opId, so a lost ack or a repeated pull is harmless.
// Failures are never silent: every error is reported in the status, and polling backs off.
import { CONFIG } from '../../config';
import { isValidOp, type Op } from '../../contract';
import type { Beat, Transport } from '../types';

export interface SyncStatus { readonly pending: number; readonly lastOkAt: number | null; readonly error: string | null; readonly online: boolean }
/** s127: a phone heard from, on this device's clock (`heardAt` = now − the bridge's age). */
export interface Presence { readonly deviceId: string; readonly label: string; readonly orderId: string; readonly heardAt: number }
export interface SyncEngine {
  enqueue(ops: readonly Op[]): void;
  /** One push + pull round on every transport (and a presence beat when given). Resolves with ops new to this device. */
  round(beat?: Beat): Promise<Op[]>;
  /** s127: phones heard from by presence beats; empty when no bridge keeps presence. */
  presence(): readonly Presence[];
  /** True once a bridge has answered a beat (so leases can trust presence, not only ops). */
  hasPresence(): boolean;
  status(): SyncStatus;
  nextDelayMs(): number;
}

interface Lane { t: Transport; outbox: Map<string, Op>; cursor: string; failures: number; noBeat: boolean }

/** Push one batch; drop what was stored; queue a resend of any seq gap the other side reports (Q-HARM-10). */
async function pushLane(l: Lane, batch: readonly Op[], local: (writer: string, fromSeq: number) => readonly Op[]) {
  const r = await l.t.push(batch);
  const got = new Set(r.stored);
  for (const id of got) l.outbox.delete(id);
  const again = r.resend.flatMap((g) => local(g.writer, g.fromSeq)).filter((op) => !got.has(op.opId));
  for (const op of again) l.outbox.set(op.opId, op);
}

/** s127: one presence beat; a bridge without presence (null) is not asked again this load. */
async function beatLane(l: Lane, b: Beat, seen: Map<string, Presence>, now: () => number) {
  if (l.noBeat || !l.t.beat) return;
  const got = await l.t.beat(b);
  if (got === null) { l.noBeat = true; return; }
  const t = now();
  for (const x of got) seen.set(x.deviceId, { deviceId: x.deviceId, label: x.label, orderId: x.orderId, heardAt: t - x.ageMs });
}

/** `local(writer, fromSeq)`: this device's own ops of that writer from that seq, for a gap resend (Q-HARM-10). */
export function createSyncEngine(transports: readonly Transport[], known: (opId: string) => boolean, now: () => number, local: (writer: string, fromSeq: number) => readonly Op[] = () => []): SyncEngine {
  const lanes: Lane[] = transports.map((t) => ({ t, outbox: new Map(), cursor: '', failures: 0, noBeat: !t.beat }));
  let lastOkAt: number | null = null;
  let error: string | null = null;
  const seen = new Map<string, Presence>();

  async function laneRound(l: Lane): Promise<Op[]> {
    const batch = [...l.outbox.values()].slice(0, CONFIG.sync.pushBatch);
    if (batch.length) await pushLane(l, batch, local);
    const { ops, cursor } = await l.t.pull(l.cursor);
    l.cursor = cursor;
    return ops.filter(isValidOp);
  }

  return {
    enqueue(ops) { for (const l of lanes) for (const op of ops) l.outbox.set(op.opId, op); },
    async round(beat) {
      const fresh = new Map<string, Op>();
      for (const l of lanes) {
        try {
          if (beat) await beatLane(l, beat, seen, now);
          const got = (await laneRound(l)).filter((op) => !known(op.opId));
          got.forEach((op) => fresh.set(op.opId, op));
          l.failures = 0; lastOkAt = now(); error = null;
        } catch (e) {
          l.failures += 1;
          error = `${l.t.name}: ${e instanceof Error ? e.message : String(e)}`;
          // STYLE_GUIDE 13: a retry is never silent; the next round waits longer (nextDelayMs).
          console.warn(`sync round failed (${String(l.failures)} in a row)`, error);
        }
      }
      return [...fresh.values()];
    },
    presence() { return [...seen.values()]; },
    hasPresence() { return lanes.some((l) => !l.noBeat) && seen.size > 0; },
    status() { return { pending: lanes.reduce((n, l) => Math.max(n, l.outbox.size), 0), lastOkAt, error, online: lanes.length > 0 && error === null }; },
    nextDelayMs() {
      const worst = lanes.reduce((n, l) => Math.max(n, l.failures), 0);
      return Math.min(CONFIG.sync.pollMaxMs, CONFIG.sync.pollMinMs * CONFIG.sync.backoff ** worst);
    },
  };
}
