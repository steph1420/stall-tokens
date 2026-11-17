// Kitchen and station actions (F-19..F-22; P3 safe taps F-59). Screens only call these; every rule about a status tap lives here
// or in rules/kitchen.ts. Counter confirms Done? and hands over (Q-KITCHEN-3 A).
import { CONFIG } from '../config';
import type { LineStatus, Order } from '../contract';
import type { Core, Log } from './core';
import { liveOrders } from './fold/fold';
import { autoPrepLines, finishedAt, neededStations, nextStatus, stationOrders, STATUS_WORD } from './rules/kitchen';
import { formatToken } from './rules/tokens';
import type { StationPlace, ToastAction, UiState } from './ui';

export function makeCtx(core: Core, log: Log) {
  const st = () => core.get();
  const ui = (patch: Partial<UiState>) => { core.set((s) => ({ ui: { ...s.ui, ...patch } })); };
  const order = (id: string): Order | null => { const o = st().folded.orders[id]; return o && !o.deleted && !o.cancel ? o : null; };
  const setLines = (o: Order, from: (s: LineStatus) => boolean, to: LineStatus): number => {
    const ls = o.lines.filter((l) => l.qty > 0 && l.status !== 'draft' && from(l.status));
    for (const l of ls) log.dispatch('line.status', { orderId: o.id, lineId: l.lineId, status: to });
    return ls.length;
  };
  /** Q-AUTOPREP: once this order is finished at the station, start the next one there. */
  const autoPrep = (o: Order, station: string) => {
    if (!st().prefs.autoPrep) return;
    const after = order(o.id);
    if (!after || !finishedAt(after, station)) return;
    const next = autoPrepLines(liveOrders(st().folded), station, o.id);
    if (!next) return;
    for (const l of next.lines) log.dispatch('line.status', { orderId: next.order.id, lineId: l.lineId, status: 'preparing' });
  };
  const toast = (text: string, action?: ToastAction) => {
    core.set((s) => ({ ui: { ...s.ui, toast: { text, id: (s.ui.toast?.id ?? 0) + 1, ...(action ? { action, ms: CONFIG.kitchen.undoToastMs } : {}) } } }));
  };
  /** W-30 PK-4: one step per line per CONFIG.kitchen.stepGapMs, so a double or triple tap moves it once. */
  const lastStep = new Map<string, number>();
  const gapOk = (orderId: string, lineId: string): boolean => {
    const k = `${orderId}/${lineId}`;
    const t = core.env.now();
    if (t - (lastStep.get(k) ?? -Infinity) < CONFIG.kitchen.stepGapMs) return false;
    lastStep.set(k, t);
    return true;
  };
  /** PK-4: "Veg Momos #012 → Preparing" with Undo (5 s). */
  const stepToast = (o: Order, lineId: string, from: LineStatus, to: LineStatus) => {
    const l = o.lines.find((x) => x.lineId === lineId);
    toast(`${l?.name ?? 'Line'} ${formatToken(o.token, CONFIG.tokens.pad)} → ${STATUS_WORD[to]}`, { label: 'Undo', run: 'undoStep', orderId: o.id, lineId, status: from, from: to });
  };
  return { st, ui, order, setLines, autoPrep, log, toast, gapOk, stepToast };
}
export type Ctx = ReturnType<typeof makeCtx>;

function navActions({ st, ui, toast }: Ctx) {
  return {
    openKitchen() { ui({ screen: 'kitchen', sheet: null }); },
    filterKitchen(station: string | null) { ui({ kitchenFilter: station }); },
    openStation(id: string, from: StationPlace['from']) {
      const first = stationOrders(liveOrders(st().folded), id)[0];
      ui({ screen: 'station', sheet: null, station: { id, from, orderId: first?.id ?? null } });
    },
    /** Q-BACK-1 A */
    closeStation() { ui({ screen: st().ui.station?.from ?? 'launch', sheet: null }); },
    showStationOrder(orderId: string) { const p = st().ui.station; if (p) ui({ station: { ...p, orderId } }); },
    /** W-28: the shown order is pinned; once it has left (after its veil) move to the next one and say so. */
    moveOn(nextId: string | null, label: string | null) {
      const p = st().ui.station;
      if (!p || p.orderId === nextId) return;
      ui({ station: { ...p, orderId: nextId } });
      if (label) toast(`Now ${label}`);
    },
    /** Swipe left / right between this station's orders (Q-STN-LOOK D). */
    stepStationOrder(dir: 1 | -1) {
      const p = st().ui.station;
      if (!p) return;
      const list = stationOrders(liveOrders(st().folded), p.id);
      const i = list.findIndex((o) => o.id === p.orderId);
      const next = list[Math.min(list.length - 1, Math.max(0, (i < 0 ? 0 : i) + dir))];
      if (next) ui({ station: { ...p, orderId: next.id } });
    },
  };
}

function stepActions({ st, order, autoPrep, log, toast, gapOk, stepToast }: Ctx) {
  return {
    /** One tap on a station's own line (Waiting → Preparing → Done?). Returns false when nothing moves.
     * W-30: a second tap on the same line inside the step gap is ignored; PK-4: every step gets an Undo toast. */
    advance(orderId: string, lineId: string): boolean {
      const o = order(orderId);
      const l = o?.lines.find((x) => x.lineId === lineId);
      if (!o || !l || l.status === 'draft') return false;
      if (l.status === 'paused' && !o.priority && neededStations(liveOrders(st().folded)).has(l.stationId)) {
        toast('Paused for a Priority order'); // Q-PAUSE-1 A: resumes by itself when the Priority order is done here
        return false;
      }
      const to = nextStatus(l.status);
      if (!to || !gapOk(orderId, lineId)) return false;
      log.dispatch('line.status', { orderId, lineId, status: to });
      stepToast(o, lineId, l.status, to);
      if (to === 'done?') autoPrep(o, l.stationId);
      return true;
    },
    /** Press and hold a line: On hold, or back to Waiting; W-31: hold on Done? takes it back to Preparing. */
    toggleHold(orderId: string, lineId: string): boolean {
      const o = order(orderId);
      const l = o?.lines.find((x) => x.lineId === lineId);
      if (!o || !l || !(l.status === 'waiting' || l.status === 'preparing' || l.status === 'held' || l.status === 'done?')) return false;
      const to: LineStatus = l.status === 'held' ? 'waiting' : l.status === 'done?' ? 'preparing' : 'held';
      log.dispatch('line.status', { orderId, lineId, status: to });
      gapOk(orderId, lineId);
      stepToast(o, lineId, l.status, to);
      return true;
    },
    /** PK-4 Undo from the toast: put the line back to `status`, only while it is still where the step left it (`now`),
     * so an Undo can't pull back a line the Counter or another phone has moved on since. */
    undoStep(orderId: string, lineId: string, status: LineStatus, now: LineStatus): boolean {
      const o = order(orderId);
      const l = o?.lines.find((x) => x.lineId === lineId);
      if (!o || !l || l.status !== now) { toast('Too late to undo · it has moved on'); return false; }
      log.dispatch('line.status', { orderId, lineId, status });
      toast(`Undone · ${l.name} is ${STATUS_WORD[status]} again`);
      return true;
    },
  };
}

function orderActions({ order, setLines, log, toast }: Ctx) {
  const setPriority = (o: Order, on: boolean, undo: boolean) => {
    log.dispatch('order.priority', { orderId: o.id, on });
    const tok = formatToken(o.token, CONFIG.tokens.pad);
    if (undo) toast(`Priority ${on ? 'on' : 'off'} · ${tok}`, { label: 'Undo', run: 'undoPriority', orderId: o.id, on: !on });
    else toast(`Undone · Priority ${on ? 'on' : 'off'} for ${tok}`);
  };
  return {
    /** W-40: Priority on or off always says so, with Undo. */
    togglePriority(orderId: string): boolean { const o = order(orderId); if (!o) return false; setPriority(o, !o.priority, true); return true; },
    undoPriority(orderId: string, on: boolean): boolean { const o = order(orderId); if (!o || o.priority === on) return false; setPriority(o, on, false); return true; },
    /** Counter, Q-KITCHEN-3 A: Confirm turns Done? into Ready; Send back returns it to Preparing (W-31). */
    confirmDone(orderId: string): boolean { const o = order(orderId); return o ? setLines(o, (s) => s === 'done?', 'ready') > 0 : false; },
    sendBack(orderId: string): boolean {
      const o = order(orderId);
      const n = o ? setLines(o, (s) => s === 'done?', 'preparing') : 0;
      if (o && n > 0) toast(`Sent back to the kitchen · ${formatToken(o.token, CONFIG.tokens.pad)}`);
      return n > 0;
    },
    /** Q-COUNTER-FINISH: any sent line, any kitchen status, straight to Ready (shown as "Marked by counter"). */
    finishLine(orderId: string, lineId: string): boolean {
      const l = order(orderId)?.lines.find((x) => x.lineId === lineId);
      if (!l || l.qty === 0 || l.status === 'draft' || l.status === 'handed' || (l.status === 'ready' && l.byCounter)) return false;
      log.dispatch('line.finish', { orderId, lineId });
      return true;
    },
    handOver(orderId: string): boolean { const o = order(orderId); return o ? setLines(o, (s) => s === 'ready', 'handed') > 0 : false; },
  };
}
export function kitchenActions(core: Core, log: Log) {
  const x = makeCtx(core, log);
  return { ...navActions(x), ...stepActions(x), ...orderActions(x) };
}
export type KitchenActions = ReturnType<typeof kitchenActions>;
