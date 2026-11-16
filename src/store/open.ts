// F-43 Counter Open Orders actions (Q-ORDERS-1 rough v3, locked 16 Nov 18:21 IST). Screens only call these.
// Lines: Mark ready (store/kitchen finishLine), Ready + Confirm, Confirm all, hidden tap; Cards: tap; bar: Handover.
import { CONFIG } from '../config';
import type { Core, Log } from './core';
import { liveOrders } from './fold/fold';
import { makeCtx, type Ctx } from './kitchen';
import { counterNext, openOrders } from './rules/kitchen';
import type { CounterTab } from './ui';

function navActions(core: Core, { st, ui, order, log }: Ctx) {
  const list = () => openOrders(liveOrders(st().folded));
  return {
    showTab(tab: CounterTab) { ui({ counterTab: tab, sheet: null }); },
    showOpen(orderId: string) { ui({ openId: orderId }); },
    /** Swipe the header for the previous / next order. */
    stepOpen(dir: 1 | -1) {
      const l = list();
      const i = Math.max(0, l.findIndex((o) => o.id === st().ui.openId));
      const next = l[Math.min(l.length - 1, Math.max(0, i + dir))];
      if (next) ui({ openId: next.id });
    },
    setClient(orderId: string, name: string) {
      const o = order(orderId);
      const v = name.trim().replace(/\s+/g, ' ').slice(0, CONFIG.limits.nameMaxChars);
      if (o && v !== o.client) log.dispatch('order.client', { orderId, name: v });
    },
    /** Order sheet → Edit in Billing (Q-ORDERS-6 A). */
    editInBilling(orderId: string) {
      if (!order(orderId)) return;
      core.set((s) => ({ ui: { ...s.ui, counterTab: 'new', orderId, sheet: null, pages: { ...s.ui.pages, [orderId]: 'billing' } } }));
    },
  };
}

function lineActions({ order, setLines, toast, log }: Ctx) {
  return {
    /** Hidden tap (Lines) or card tap (Cards): one step on (D-OPEN-TAP). */
    tapLine(orderId: string, lineId: string): boolean {
      const l = order(orderId)?.lines.find((x) => x.lineId === lineId);
      const to = l && l.status !== 'draft' ? counterNext(l.status) : null;
      if (!l || !to) return false;
      log.dispatch('line.status', { orderId, lineId, status: to });
      return true;
    },
    /** A station's proposed-done line ("Ready" with Confirm on the right). */
    confirmLine(orderId: string, lineId: string): boolean {
      const l = order(orderId)?.lines.find((x) => x.lineId === lineId);
      if (l?.status !== 'done?') return false;
      log.dispatch('line.status', { orderId, lineId, status: 'ready' });
      return true;
    },
    confirmAll(orderId: string): boolean { const o = order(orderId); return o ? setLines(o, (s) => s === 'done?', 'ready') > 0 : false; },
    /** Bottom bar Handover: delivers every line still not handed over, whatever its status (Q-ORDERS-1). */
    handOverAll(orderId: string): boolean {
      const o = order(orderId);
      if (!o) return false;
      const n = setLines(o, (s) => s !== 'handed', 'handed');
      if (n > 0) toast(`Handed over #${String(o.token).padStart(CONFIG.tokens.pad, '0')}`);
      return n > 0;
    },
  };
}

export function openActions(core: Core, log: Log) {
  const x = makeCtx(core, log);
  return { ...navActions(core, x), ...lineActions(x) };
}
export type OpenActions = ReturnType<typeof openActions>;
