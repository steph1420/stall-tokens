// F-02 The fold: state = fold(sorted op log). Pure and idempotent. Rules that must hold for any log
// (including ops from other devices) live here; rules about what a tap may do live in store actions.
import { compareOps, type Item, type ItemFields, type Op, type Order } from '../../contract';
import { emptyFolded, type Folded } from './state';
import { applyOrderOp, isOrderOp } from './orders';
import { lww } from './lww';
import { applyMoneyOp } from './money';

const ITEM_DEFAULTS: ItemFields = {
  name: '', price: 0, swatch: 0, category: '', stationId: '', count: null, unit: '', lowAt: 0, soldOut: false, order: 0, removed: false,
};

function fieldOk(key: keyof ItemFields, value: unknown): boolean {
  if (key === 'count') return value === null || (typeof value === 'number' && Number.isFinite(value));
  return value !== undefined && typeof value === typeof ITEM_DEFAULTS[key] && (typeof value !== 'number' || Number.isFinite(value));
}

function applyItem(s: Folded, op: Op<'item.set'>): Folded {
  const { itemId, fields } = op.body;
  const prev: Item = s.items[itemId] ?? { ...ITEM_DEFAULTS, id: itemId, sold: 0, oversold: false };
  let next: Item = prev;
  let st = s;
  for (const key of Object.keys(fields) as (keyof ItemFields)[]) {
    const value = fields[key];
    if (!fieldOk(key, value)) continue;
    const r = lww(st, `item:${itemId}`, key, op);
    st = r.state;
    next = { ...next, [key]: value };
  }
  if (next.count !== null && next.count >= 0) next = { ...next, oversold: false };
  return { ...st, items: { ...st.items, [itemId]: next } };
}

function applyStock(s: Folded, op: Op<'stock.adjust'>): Folded {
  const item = s.items[op.body.itemId];
  if (!item || item.count === null) return s;
  // Manual edits never take stock below 0 (plan §7.2).
  const count = Math.max(0, item.count + Math.trunc(op.body.delta));
  return { ...s, items: { ...s.items, [item.id]: { ...item, count, oversold: false } } };
}

function applyOne(s: Folded, op: Op): Folded {
  switch (op.kind) {
    case 'item.set': return applyItem(s, op);
    case 'stock.adjust': return applyStock(s, op);
    case 'day.start':
      if (s.days.some((d) => d.id === op.body.dayId)) return s;
      return { ...s, days: [...s.days, { id: op.body.dayId, label: op.body.label, startedAt: op.wallAt }] };
    case 'payee.set': {
      const st = lww(s, `payee:${op.body.payeeId}`, 'all', op).state;
      const id = op.body.payeeId;
      const payees = op.body.removed
        ? Object.fromEntries(Object.entries(st.payees).filter(([k]) => k !== id))
        : { ...st.payees, [id]: { id, name: op.body.name, upiId: op.body.upiId } };
      return { ...st, payees };
    }
    case 'setting.set': {
      const st = lww(s, 'settings', op.body.key, op).state;
      return { ...st, settings: { ...st.settings, [op.body.key]: op.body.value } };
    }
    case 'person.set': case 'entry.add': case 'entry.void': return applyMoneyOp(s, op);
    default:
      return isOrderOp(op) ? applyOrderOp(s, op) : s;
  }
}

function track(s: Folded, op: Op): Folded {
  const applied = new Set(s.applied).add(op.opId);
  const had = s.seen[op.writer] ?? 0;
  const seen = { ...s.seen, [op.writer]: Math.max(had, op.seq) };
  return { ...s, applied, seen, lamport: Math.max(s.lamport, op.lamport) };
}

/** Apply one op on top of a state. Duplicates (same opId) change nothing. */
export function applyOp(s: Folded, op: Op): Folded {
  if (s.applied.has(op.opId)) return s;
  return track(applyOne(s, op), op);
}

/** Fold a whole log. Sorts by (lamport, writer, seq) so every device gets the same answer. */
export function fold(log: readonly Op[]): Folded {
  const sorted = [...log].sort(compareOps);
  let s = emptyFolded();
  for (const op of sorted) s = applyOp(s, op);
  return { ...s, gaps: findGaps(sorted) };
}

function findGaps(log: readonly Op[]): Record<string, number> {
  const seqs: Record<string, Set<number>> = {};
  for (const op of log) (seqs[op.writer] ??= new Set()).add(op.seq);
  const gaps: Record<string, number> = {};
  for (const [w, set] of Object.entries(seqs)) {
    const missing = Math.max(...set) - set.size;
    if (missing > 0) gaps[w] = missing;
  }
  return gaps;
}

export const liveOrders = (s: Folded): Order[] =>
  s.orderIds.map((id) => s.orders[id]).filter((o): o is Order => o !== undefined && !o.deleted);
