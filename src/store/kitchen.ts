// Kitchen and station actions (F-19..F-22). Screens only call these; every rule about a status tap lives here
// or in rules/kitchen.ts. Counter confirms Done? and hands over (Q-KITCHEN-3 A).
import type { LineStatus, Order } from '../contract';
import type { Core, Log } from './core';
import { liveOrders } from './fold/fold';
import { autoPrepLines, finishedAt, neededStations, nextStatus, stationOrders } from './rules/kitchen';
import type { StationPlace, UiState } from './ui';

function makeCtx(core: Core, log: Log) {
  const st = () => core.get();
  const ui = (patch: Partial<UiState>) => { core.set((s) => ({ ui: { ...s.ui, ...patch } })); };
  const order = (id: string): Order | null => { const o = st().folded.orders[id]; return o && !o.deleted ? o : null; };
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
  const toast = (text: string) => { core.set((s) => ({ ui: { ...s.ui, toast: { text, id: (s.ui.toast?.id ?? 0) + 1 } } })); };
  return { st, ui, order, setLines, autoPrep, log, toast };
}
type Ctx = ReturnType<typeof makeCtx>;

function navActions({ st, ui }: Ctx) {
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

function statusActions({ st, order, setLines, autoPrep, log, toast }: Ctx) {
  return {
    /** One tap on a station's own line (Waiting → Preparing → Done?). Returns false when nothing moves. */
    advance(orderId: string, lineId: string): boolean {
      const o = order(orderId);
      const l = o?.lines.find((x) => x.lineId === lineId);
      if (!o || !l || l.status === 'draft') return false;
      if (l.status === 'paused' && !o.priority && neededStations(liveOrders(st().folded)).has(l.stationId)) {
        toast('Paused for a Priority order'); // Q-PAUSE-1 A: resumes by itself when the Priority order is done here
        return false;
      }
      const to = nextStatus(l.status);
      if (!to) return false;
      log.dispatch('line.status', { orderId, lineId, status: to });
      if (to === 'done?') autoPrep(o, l.stationId);
      return true;
    },
    /** Press and hold a line: On hold, or back to Waiting. */
    toggleHold(orderId: string, lineId: string): boolean {
      const o = order(orderId);
      const l = o?.lines.find((x) => x.lineId === lineId);
      if (!o || !l || !(l.status === 'waiting' || l.status === 'preparing' || l.status === 'held')) return false;
      log.dispatch('line.status', { orderId, lineId, status: l.status === 'held' ? 'waiting' : 'held' });
      return true;
    },
    togglePriority(orderId: string): boolean {
      const o = order(orderId);
      if (!o) return false;
      log.dispatch('order.priority', { orderId, on: !o.priority });
      return true;
    },
    /** Counter, Q-KITCHEN-3 A: Confirm turns Done? into Ready; Send back returns it to Preparing. */
    confirmDone(orderId: string): boolean { const o = order(orderId); return o ? setLines(o, (s) => s === 'done?', 'ready') > 0 : false; },
    sendBack(orderId: string): boolean { const o = order(orderId); return o ? setLines(o, (s) => s === 'done?', 'preparing') > 0 : false; },
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
  return { ...navActions(x), ...statusActions(x) };
}
export type KitchenActions = ReturnType<typeof kitchenActions>;
