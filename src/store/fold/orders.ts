// F-09..F-18 Order ops in the fold. Stock moves when lines are committed (sent or paid) and moves back
// when committed qty drops or the order is deleted. Sales may push stock below 0 (offline oversell):
// the count clamps at 0 and the item is flagged `oversold` (plan §8).
import type { Item, Line, Op, Order } from '../../contract';
import type { Folded } from './state';
import { lww } from './lww';

type OrderKind = 'order.create' | 'line.add' | 'line.qty' | 'line.note' | 'line.status' | 'line.finish' | 'order.note'
  | 'order.discount' | 'order.roundoff' | 'order.send' | 'order.delete' | 'order.priority' | 'order.cancel' | 'order.client' | 'payment.add' | 'refund.add';
const ORDER_KINDS: ReadonlySet<string> = new Set<OrderKind>([
  'order.create', 'line.add', 'line.qty', 'line.note', 'line.status', 'line.finish', 'order.note', 'order.discount',
  'order.roundoff', 'order.send', 'order.delete', 'order.priority', 'order.cancel', 'order.client', 'payment.add', 'refund.add',
]);
export const isOrderOp = (op: Op): op is Op<OrderKind> => ORDER_KINDS.has(op.kind);

function moveStock(items: Folded['items'], itemId: string, sold: number): Folded['items'] {
  const it = items[itemId];
  if (!it || sold === 0) return items;
  const next: Item = it.count === null
    ? { ...it, sold: it.sold + sold }
    : { ...it, sold: it.sold + sold, count: Math.max(0, it.count - sold), oversold: it.count - sold < 0 ? true : sold < 0 ? false : it.oversold };
  return { ...items, [itemId]: next };
}

/** Commit every line: draft lines go to the kitchen (waiting) and their qty leaves stock. */
function commit(s: Folded, o: Order): { state: Folded; order: Order } {
  let items = s.items;
  const lines = o.lines.map((l) => {
    items = moveStock(items, l.itemId, l.qty - l.committed);
    return { ...l, committed: l.qty, status: l.status === 'draft' ? 'waiting' as const : l.status };
  });
  return { state: { ...s, items }, order: { ...o, lines, sent: true } };
}

function withOrder(s: Folded, o: Order): Folded {
  return { ...s, orders: { ...s.orders, [o.id]: o } };
}

function create(s: Folded, op: Op<'order.create'>): Folded {
  if (s.orders[op.body.orderId]) return s;
  const o: Order = {
    id: op.body.orderId, dayId: op.body.dayId, token: Math.trunc(op.body.token), servedBy: op.body.servedBy, createdAt: op.wallAt,
    lines: [], note: '', discount: null, roundOff: null, sent: false, deleted: false, priority: false, client: '', cancel: null, payments: [], refunds: [], revision: 0,
  };
  return { ...withOrder(s, o), orderIds: [...s.orderIds, o.id] };
}

function setQty(s: Folded, o: Order, lineId: string, rawQty: number): Folded {
  const line = o.lines.find((l) => l.lineId === lineId);
  if (!line) return s;
  const qty = Math.max(0, Math.trunc(rawQty));
  let items = s.items;
  const committed = line.status === 'draft' ? 0 : qty;
  if (committed !== line.committed) items = moveStock(items, line.itemId, committed - line.committed);
  const lines = qty === 0 ? o.lines.filter((l) => l.lineId !== lineId) : o.lines.map((l) => (l.lineId === lineId ? { ...l, qty, committed } : l));
  const revision = o.sent ? o.revision + 1 : o.revision;
  return withOrder({ ...s, items }, { ...o, lines, revision });
}

function addLine(s: Folded, o: Order, b: Op<'line.add'>['body']): Folded {
  if (o.lines.some((l) => l.lineId === b.lineId)) return s;
  const line: Line = { lineId: b.lineId, itemId: b.itemId, name: b.name, price: Math.trunc(b.price), category: b.category,
    stationId: b.stationId, qty: 0, note: '', status: 'draft', committed: 0, byCounter: false };
  const next = { ...o, lines: [...o.lines, line] };
  return setQty(withOrder(s, next), next, b.lineId, b.qty);
}

function mapLine(s: Folded, o: Order, lineId: string, f: (l: Line) => Line): Folded {
  return withOrder(s, { ...o, lines: o.lines.map((l) => (l.lineId === lineId ? f(l) : l)) });
}

/** Q-CANCEL-1 A: lines not started give their stock back; started ones were made. Paid money is flagged as refund due. */
const NOT_STARTED: ReadonlySet<string> = new Set(['draft', 'waiting', 'held', 'paused']);
function cancel(s: Folded, o: Order, op: Op<'order.cancel'>): Folded {
  let items = s.items;
  for (const l of o.lines) if (NOT_STARTED.has(l.status)) items = moveStock(items, l.itemId, -l.committed);
  const lines = o.lines.map((l) => (NOT_STARTED.has(l.status) ? { ...l, committed: 0 } : l));
  const refundDue = o.payments.reduce((t, p) => t + p.cash + p.upi, 0) - o.refunds.reduce((t, r) => t + r.amount, 0);
  return withOrder({ ...s, items }, { ...o, lines, cancel: { reason: op.body.reason.trim(), at: op.wallAt, by: op.writer, refundDue: Math.max(0, refundDue) } });
}

function remove(s: Folded, o: Order): Folded {
  let items = s.items;
  for (const l of o.lines) items = moveStock(items, l.itemId, -l.committed);
  return withOrder({ ...s, items }, { ...o, deleted: true, lines: o.lines.map((l) => ({ ...l, committed: 0 })) });
}

/** Kitchen status ops. The "Marked by counter" label (Q-COUNTER-FINISH) lasts while the line stays Ready or Handed over. */
function lineStatus(s: Folded, o: Order, op: Op<'line.status'> | Op<'line.finish'>): Folded {
  if (op.kind === 'line.finish') return mapLine(s, o, op.body.lineId, (l) => (l.status === 'draft' || l.status === 'handed' ? l : { ...l, status: 'ready', byCounter: true }));
  const status = op.body.status;
  return mapLine(s, o, op.body.lineId, (l) => (l.status === 'draft' ? l : { ...l, status, byCounter: l.byCounter && (status === 'ready' || status === 'handed') }));
}

export function applyOrderOp(s: Folded, op: Op<OrderKind>): Folded {
  if (op.kind === 'order.create') return create(s, op);
  const o = s.orders[op.body.orderId];
  if (!o || o.deleted) return s; // ops for unknown or deleted orders are kept in the log but change nothing
  if (o.cancel && op.kind !== 'refund.add') return s; // a cancelled order only takes refunds
  switch (op.kind) {
    case 'line.add': return addLine(s, o, op.body);
    case 'line.qty': return setQty(s, o, op.body.lineId, op.body.qty);
    case 'line.note': return mapLine(lww(s, `line:${op.body.lineId}`, 'note', op).state, o, op.body.lineId, (l) => ({ ...l, note: op.body.note }));
    case 'line.status': case 'line.finish': return lineStatus(s, o, op);
    case 'order.note': return withOrder(lww(s, `order:${o.id}`, 'note', op).state, { ...o, note: op.body.note });
    case 'order.discount': {
      const st = lww(s, `order:${o.id}`, 'discount', op).state;
      const { kind, value, allowedBy, note } = op.body;
      const discount = value > 0 ? { kind, value: Math.trunc(value), allowedBy, note } : null;
      return withOrder(st, { ...o, discount });
    }
    case 'order.roundoff': {
      const st = lww(s, `order:${o.id}`, 'roundOff', op).state;
      const roundOff = op.body.amount === 0 ? null : { amount: Math.trunc(op.body.amount), forTotal: Math.trunc(op.body.forTotal) };
      return withOrder(st, { ...o, roundOff });
    }
    case 'order.send': { const r = commit(s, o); return withOrder(r.state, r.order); }
    case 'order.delete': return remove(s, o);
    case 'order.cancel': return cancel(s, o, op);
    case 'order.client': return withOrder(lww(s, `order:${o.id}`, 'client', op).state, { ...o, client: op.body.name });
    case 'order.priority': return withOrder(lww(s, `order:${o.id}`, 'priority', op).state, { ...o, priority: op.body.on });
    case 'payment.add': {
      if (o.payments.some((p) => p.paymentId === op.body.paymentId)) return s;
      const { orderId: _o, ...b } = op.body;
      const r = commit(s, o);
      return withOrder(r.state, { ...r.order, payments: [...o.payments, { ...b, at: op.wallAt, writer: op.writer }] });
    }
    case 'refund.add': {
      if (o.refunds.some((x) => x.refundId === op.body.refundId)) return s;
      const refund = { refundId: op.body.refundId, amount: op.body.amount, source: op.body.source, at: op.wallAt };
      return withOrder(s, { ...o, refunds: [...o.refunds, refund] });
    }
  }
}
