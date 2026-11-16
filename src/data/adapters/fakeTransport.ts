// Fake transport (06 rule 4): a shared in-memory "Sheet" that several fake devices talk to.
// Replays trouble on purpose: offline, errors, timeouts, lost acks and duplicate deliveries.
import type { Op } from '../../contract';
import type { Transport } from '../types';

export interface FakeHub { readonly log: Op[]; offline: boolean; failNext: number; duplicatePulls: boolean }
export const createFakeHub = (): FakeHub => ({ log: [], offline: false, failNext: 0, duplicatePulls: false });

export function createFakeTransport(hub: FakeHub, name = 'fake'): Transport {
  const trouble = (): Error | null => {
    if (hub.offline) return new Error('offline');
    if (hub.failNext > 0) { hub.failNext -= 1; return new Error('bridge error'); }
    return null;
  };
  return {
    name,
    push(ops) {
      const err = trouble();
      if (err) return Promise.reject(err);
      const ids = new Set(hub.log.map((o) => o.opId));
      for (const op of ops) if (!ids.has(op.opId)) { ids.add(op.opId); hub.log.push(op); }
      return Promise.resolve(ops.map((o) => o.opId));
    },
    pull(cursor) {
      const err = trouble();
      if (err) return Promise.reject(err);
      const from = Number(cursor) || 0;
      const back = hub.duplicatePulls ? Math.max(0, from - 2) : from;
      return Promise.resolve({ ops: hub.log.slice(back), cursor: String(hub.log.length) });
    },
  };
}
