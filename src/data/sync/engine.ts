// F-03 F-37 Sync engine: one outbox and pull cursor per transport; any number of transports side by side
// (ARCHITECTURE §4.3). Ops are idempotent by opId, so a lost ack or a repeated pull is harmless.
// Failures are never silent: every error is reported in the status, and polling backs off.
import { CONFIG } from '../../config';
import { isValidOp, type Op } from '../../contract';
import type { Transport } from '../types';

export interface SyncStatus { readonly pending: number; readonly lastOkAt: number | null; readonly error: string | null; readonly online: boolean }
export interface SyncEngine {
  enqueue(ops: readonly Op[]): void;
  /** One push + pull round on every transport. Resolves with ops new to this device. */
  round(): Promise<Op[]>;
  status(): SyncStatus;
  nextDelayMs(): number;
}

interface Lane { t: Transport; outbox: Map<string, Op>; cursor: string; failures: number }

export function createSyncEngine(transports: readonly Transport[], known: (opId: string) => boolean, now: () => number): SyncEngine {
  const lanes: Lane[] = transports.map((t) => ({ t, outbox: new Map(), cursor: '', failures: 0 }));
  let lastOkAt: number | null = null;
  let error: string | null = null;

  async function laneRound(l: Lane): Promise<Op[]> {
    const batch = [...l.outbox.values()].slice(0, CONFIG.sync.pushBatch);
    if (batch.length) for (const id of await l.t.push(batch)) l.outbox.delete(id);
    const { ops, cursor } = await l.t.pull(l.cursor);
    l.cursor = cursor;
    return ops.filter(isValidOp);
  }

  return {
    enqueue(ops) { for (const l of lanes) for (const op of ops) l.outbox.set(op.opId, op); },
    async round() {
      const fresh = new Map<string, Op>();
      for (const l of lanes) {
        try {
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
    status() {
      const pending = lanes.reduce((n, l) => Math.max(n, l.outbox.size), 0);
      return { pending, lastOkAt, error, online: lanes.length > 0 && error === null };
    },
    nextDelayMs() {
      const worst = lanes.reduce((n, l) => Math.max(n, l.failures), 0);
      return Math.min(CONFIG.sync.pollMaxMs, CONFIG.sync.pollMinMs * CONFIG.sync.backoff ** worst);
    },
  };
}
