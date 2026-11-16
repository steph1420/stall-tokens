// Counter actions (F-05..F-18). Every rule about what a tap may do lives here; screens only call these.
import { CONFIG } from '../config';
import type { Discount, Line, Order, PaySource, PaymentBody } from '../contract';
import type { Core, Log } from './core';
import { liveOrders } from './fold/fold';
import { due, preRound, total } from './rules/bill';
import { checkPayment } from './rules/pay';
import { isOpen, type Page } from './rules/status';
import { nextToken } from './rules/tokens';
import type { UiState } from './ui';

const istDate = (ms: number): string => new Date(ms + 330 * 60_000).toISOString().slice(0, 10);

function makeCtx(core: Core, log: Log) {
  const st = () => core.get();
  const toast = (text: string) => { core.set((s) => ({ ui: { ...s.ui, toast: { text, id: (s.ui.toast?.id ?? 0) + 1 } } })); };
  const ui = (patch: Partial<UiState>) => {
    core.set((s) => ({ ui: { ...s.ui, ...patch } }));
  };
  const current = (): Order | null => {
    const id = st().ui.orderId;
    const o = id ? st().folded.orders[id] : undefined;
    return o && !o.deleted && !o.cancel ? o : null;
  };
  const currentDay = (): string => {
    const days = st().folded.days;
    const last = days[days.length - 1];
    if (last) return last.id;
    const now = core.env.now();
    const dayId = `${istDate(now)}-${core.env.makeId().slice(0, 4)}`;
    log.dispatch('day.start', { dayId, label: istDate(now) });
    return dayId;
  };
  /** Stock left for new taps: count minus what is already in draft lines anywhere. */
  const available = (itemId: string): number => {
    const it = st().folded.items[itemId];
    if (!it || it.removed || it.soldOut || it.supply) return 0;
    if (it.count === null) return Number.POSITIVE_INFINITY;
    const drafts = liveOrders(st().folded).reduce((n, o) => n + o.lines.filter((l) => l.itemId === itemId).reduce((m, l) => m + l.qty - l.committed, 0), 0);
    return it.count - drafts;
  };
  const editable = (l: Line) => l.status === 'draft' || l.status === 'waiting';
  return { core, log, st, toast, ui, current, currentDay, available, editable };
}
type Ctx = ReturnType<typeof makeCtx>;

function navActions(x: Ctx) {
  const { core, log, st, ui, current, currentDay } = x;
  const ensure = (): Order | null => { const id = self.newOrder(); return st().folded.orders[id] ?? null; };
  const self = {
    newOrder(): string {
      const dayId = currentDay();
      const range = CONFIG.tokens.ranges[st().prefs.rangeIndex] ?? CONFIG.tokens.ranges[0];
      const token = nextToken(Object.values(st().folded.orders), dayId, range); // deleted orders keep their numbers
      const orderId = core.env.makeId();
      log.dispatch('order.create', { orderId, dayId, token, servedBy: st().prefs.servingName });
      core.set((s) => ({ ui: { ...s.ui, orderId, counterTab: 'new', pages: { ...s.ui.pages, [orderId]: 'menu' } } }));
      return orderId;
    },
    selectOrder(orderId: string) { ui({ orderId }); },
    setPage(page: Page) {
      const o = current() ?? ensure();
      if (!o) return;
      core.set((s) => ({ ui: { ...s.ui, pages: { ...s.ui.pages, [o.id]: page } } }));
    },
  };
  return self;
}
type Nav = ReturnType<typeof navActions>;

function lineActions(x: Ctx, nav: Nav) {
  const { core, log, st, toast, current, available, editable } = x;
  // Not `orders[newOrder()]`: the object would be read before newOrder() runs (stale state).
  const ensure = (): Order | null => { const id = nav.newOrder(); return st().folded.orders[id] ?? null; };
  const self = {
    /** Tap a menu card: +1 (F-06). */
    addItem(itemId: string) {
      const it = st().folded.items[itemId];
      if (!it || it.removed || it.supply) return;
      if (it.soldOut || available(itemId) < 1) { toast(`${it.name} is sold out`); return; }
      const o = current() ?? ensure();
      if (!o) return;
      const draft = [...o.lines].reverse().find((l) => l.itemId === itemId && l.status === 'draft');
      if (draft) { self.setQty(draft.lineId, draft.qty + 1); return; }
      if (o.lines.length >= CONFIG.limits.linesMax) { toast('This order is full; start another one'); return; }
      log.dispatch('line.add', { orderId: o.id, lineId: core.env.makeId(), itemId, name: it.name, price: it.price, category: it.category, stationId: it.stationId, qty: 1 });
    },
    /** Menu −: take one off the newest line of this item that is not being made yet. */
    removeItem(itemId: string) {
      const o = current();
      const line = o && [...o.lines].reverse().find((l) => l.itemId === itemId && editable(l));
      if (!line) { if (o?.lines.some((l) => l.itemId === itemId)) toast('Already being made; change it from the kitchen'); return; }
      self.setQty(line.lineId, line.qty - 1);
    },
    setQty(lineId: string, qty: number) {
      const o = current();
      const line = o?.lines.find((l) => l.lineId === lineId);
      if (!o || !line) return;
      const q = Math.max(0, Math.min(CONFIG.limits.qtyMax, Math.trunc(qty)));
      if (q === line.qty) return;
      if (!editable(line) && q < line.qty) { toast('Already being made; change it from the kitchen'); return; }
      const left = available(line.itemId);
      if (q > line.qty && left < q - line.qty) {
        toast(left <= 0 ? `${line.name} is sold out` : `Only ${String(left)} more ${line.name} left`);
        return;
      }
      log.dispatch('line.qty', { orderId: o.id, lineId, qty: q });
    },
  };
  return self;
}

function billActions(x: Ctx) {
  const { core, log, toast, current } = x;
  const self = {
    setLineNote(lineId: string, note: string) {
      const o = current();
      if (!o?.lines.some((l) => l.lineId === lineId)) return;
      log.dispatch('line.note', { orderId: o.id, lineId, note: note.trim().slice(0, CONFIG.limits.noteMaxChars) });
    },
    setOrderNote(note: string) {
      const o = current();
      if (o) log.dispatch('order.note', { orderId: o.id, note: note.trim().slice(0, CONFIG.limits.noteMaxChars) });
    },
    /** F-18 Refund what is owed after an edit. */
    refund(source: PaySource): boolean {
      const o = current();
      if (!o) return false;
      const owed = -due(o);
      if (owed <= 0) return false;
      log.dispatch('refund.add', { refundId: core.env.makeId(), orderId: o.id, amount: owed, source });
      return true;
    },
    setDiscount(d: Discount | null) {
      const o = current();
      if (!o) return;
      const value = d ? Math.max(0, Math.trunc(d.kind === 'pct' ? Math.min(d.value, 100) : d.value)) : 0;
      log.dispatch('order.discount', { orderId: o.id, kind: d?.kind ?? 'amount', value, allowedBy: d?.allowedBy ?? '', note: d?.note ?? '' });
    },
    /** Q-ROUND-1 A: set at billing, both ways, against the current total. */
    setRoundOff(amount: number) {
      const o = current();
      if (!o) return;
      const forTotal = preRound(o);
      const a = Math.trunc(amount);
      if (forTotal + a < 0) { toast('Round-off cannot take the total below ₹0'); return; }
      log.dispatch('order.roundoff', { orderId: o.id, amount: a, forTotal });
    },
  };
  return self;
}

function flowActions(x: Ctx) {
  const { core, log, st, toast, ui, current, editable } = x;
  const self = {
    /** F-12 To kitchen: sends the unpaid order. A second tap does nothing. */
    sendToKitchen(): boolean {
      const o = current();
      if (!o?.lines.some((l) => l.status === 'draft' && l.qty > 0)) return false;
      log.dispatch('order.send', { orderId: o.id });
      return true;
    },
    deleteOrder(): boolean {
      const o = current();
      if (!o) return false;
      const net = o.payments.reduce((t, p) => t + p.cash + p.upi, 0) - o.refunds.reduce((t, r) => t + r.amount, 0);
      if (net > 0) { toast('Refund the payment before deleting'); return false; }
      if (o.lines.some((l) => !editable(l))) { toast('The kitchen has started this order'); return false; }
      log.dispatch('order.delete', { orderId: o.id });
      const next = liveOrders(st().folded).filter((x) => x.id !== o.id).pop();
      ui({ orderId: next?.id ?? null });
      return true;
    },
    /** F-14 Confirm payment. Refused when nothing is due (double taps) or the parts do not add up. */
    pay(p: Omit<PaymentBody, 'paymentId' | 'orderId'>): string | null {
      const o = current();
      if (!o) return 'No order';
      const bill = due(o);
      const tip = Math.max(0, Math.trunc(p.tip));
      const check = checkPayment(p.cash, p.upi, bill + tip, tip);
      if (!check.ok) return check.reason;
      if (Math.abs(check.gap - p.waived) > 0) return 'Waived amount does not match';
      if (o.lines.every((l) => l.qty === 0)) return 'No items';
      log.dispatch('payment.add', { ...p, tip, paymentId: core.env.makeId(), orderId: o.id });
      return null;
    },
  };
  return self;
}

/** Q-CANCEL-1 A: cancel an order at any status, with an optional reason. Paid money is recorded as refund due. */
function cancelActions(x: Ctx) {
  const { log, st, toast, ui } = x;
  return {
    cancelOrder(orderId: string, reason: string): boolean {
      const o = st().folded.orders[orderId];
      if (!o || o.deleted || o.cancel) return false;
      log.dispatch('order.cancel', { orderId, reason: reason.slice(0, CONFIG.limits.noteMaxChars) });
      const due = st().folded.orders[orderId]?.cancel?.refundDue ?? 0;
      toast(due > 0 ? 'Order cancelled · refund due' : 'Order cancelled');
      if (st().ui.orderId === orderId) ui({ orderId: liveOrders(st().folded).filter((y) => isOpen(y)).pop()?.id ?? null });
      return true;
    },
  };
}

export function counterActions(core: Core, log: Log) {
  const x = makeCtx(core, log);
  const nav = navActions(x);
  return { ...nav, ...lineActions(x, nav), ...billActions(x), ...flowActions(x), ...cancelActions(x), totalOf: (o: Order) => total(o), available: x.available, toast: x.toast };
}
export type CounterActions = ReturnType<typeof counterActions>;
