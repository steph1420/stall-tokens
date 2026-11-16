// store/: the single owner of app state (06 rule 2; ARCHITECTURE §3). Built on Zustand.
// Screens read and write only through here. Only the store calls the data layer (ARCHITECTURE §2, §4).
import { createContext, createElement, useContext, type ReactNode } from 'react';
import { createStore as createZustand, useStore, type StoreApi } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { createBrowserDataSource, createSyncEngine, type DataSource, type DevicePrefs } from '../data';
import { catalogActions } from './catalog';
import { conflictActions } from './conflicts';
import { createLog, initialCore, type Core, type CoreState } from './core';
import { counterActions } from './counter';
import { kitchenActions } from './kitchen';
import { openActions } from './open';
import { moneyActions } from './money';
import { settleActions } from './settle';
import { stockActions } from './stock';
export { kindKey, type NewKinds } from './stock';
import { liveOrders as live } from './fold/fold';
import { pauseMoves } from './rules/kitchen';
import type { Screen, Sheet, StallScreen } from './ui';

export type { CounterTab, Screen, Sheet, StallScreen, StationPlace } from './ui';
export type { EntryDraft } from './money';
export * as money from './rules/money';
export * as settle from './rules/settle';
export * as stock from './rules/stock';
export * as amounts from './rules/amounts';
export type { Split } from './rules/settle';
export * as kitchen from './rules/kitchen';
export type { Folded } from './fold/state';
export type { DevicePrefs } from '../data';
export { isSheetUrl, joinUrl, readJoin, type JoinLink, bluetoothPrint, canBluetoothPrint, dropReceipt, getReceipt, putReceipt, receiptIds } from '../data';
export { escposSlip, type SlipText } from './rules/escpos';
export type { OrderStatus, Page } from './rules/status';
export * as bill from './rules/bill';
export * as pay from './rules/pay';
export { orderStatus, isOpen } from './rules/status';
export { formatToken } from './rules/tokens';
export { ago, istClock, istDay } from './rules/time';
export { upiLink } from './rules/upi';
export { liveOrders } from './fold/fold';

export interface AppState extends CoreState {
  readonly counter: ReturnType<typeof counterActions>;
  readonly catalog: ReturnType<typeof catalogActions>;
  readonly conflicts: ReturnType<typeof conflictActions>;
  readonly kitchen: ReturnType<typeof kitchenActions>;
  readonly open: ReturnType<typeof openActions>;
  readonly money: ReturnType<typeof moneyActions>;
  readonly settle: ReturnType<typeof settleActions>;
  readonly stock: ReturnType<typeof stockActions>;
  /** D-NAV: open a Stall screen; Back returns to the launch screen or the Counter. */
  readonly openStall: (screen: StallScreen) => void;
  readonly closeStall: () => void;
  readonly unlock: () => void;
  readonly go: (screen: Screen) => void;
  readonly openSheet: (sheet: Sheet | null) => void;
  readonly setPrefs: (patch: Partial<DevicePrefs>) => void;
  readonly retrySave: () => void;
  readonly start: () => Promise<void>;
  readonly syncNow: () => Promise<void>;
}
export type AppStore = StoreApi<AppState>;

export interface StoreOptions { makeId?: () => string; now?: () => number; loadId?: string }

function navActions(core: Core) {
  const up = (f: (u: CoreState['ui']) => Partial<CoreState['ui']>) => { core.set((s) => ({ ui: { ...s.ui, ...f(s.ui) } })); };
  return {
    go(screen: Screen) { up(() => ({ screen, sheet: null })); },
    openStall(screen: StallScreen) { up((u) => ({ screen, sheet: null, stallFrom: u.screen === 'counter' ? 'counter' : 'launch' })); },
    closeStall() { up((u) => ({ screen: u.stallFrom, sheet: null, unlocked: false })); },
    unlock() { up(() => ({ unlocked: true })); },
    openSheet(sheet: Sheet | null) { up(() => ({ sheet })); },
  };
}

export function createAppStore(ds: DataSource, opts: StoreOptions = {}): AppStore {
  const makeId = opts.makeId ?? (() => crypto.randomUUID());
  const now = opts.now ?? (() => Date.now());
  const prefs = ds.device.read();
  const writer = `${prefs.deviceId.slice(0, 8)}.${opts.loadId ?? makeId().slice(0, 4)}`;
  let log: ReturnType<typeof createLog> | null = null;
  const engine = createSyncEngine(ds.transports, (id) => store.getState().folded.applied.has(id), now, (w, from) => (log?.all() ?? []).filter((o) => o.writer === w && o.seq >= from));
  const store = createZustand<AppState>()((set, get) => {
    const core: Core = { get, set: (p) => { set(p as Partial<AppState>); }, env: { ds, engine, makeId, now } };
    // Q-PAUSE-1 A: Priority pauses / resumes other orders' lines through real ops (rules/kitchen.ts pauseMoves).
    log = createLog(core, writer, (f) => pauseMoves(live(f)));
    const l = log;
    return {
      ...initialCore(prefs),
      counter: counterActions(core, l),
      catalog: catalogActions(core, l),
      conflicts: conflictActions(l),
      kitchen: kitchenActions(core, l),
      open: openActions(core, l),
      money: moneyActions(core, l),
      settle: settleActions(core, l),
      stock: stockActions(core, l, (amount, label, note, parts) => get().money.addEntry({ dir: 'spent', amount, label, kind: 'normal', parts, note, personId: null })),
      ...navActions(core),
      setPrefs(patch) { const next = { ...get().prefs, ...patch }; ds.device.write(next); set({ prefs: next }); },
      retrySave() { l.retrySave(); },
      async start() {
        l.load(await ds.ops.load());
        ds.channel.subscribe((ops) => { l.intake(ops, false); });
        if (ds.transports.length === 0) return;
        const tick = () => { void get().syncNow().finally(() => { setTimeout(tick, engine.nextDelayMs()); }); };
        tick();
      },
      async syncNow() {
        const fresh = await engine.round();
        l.intake(fresh, true);
        set({ sync: engine.status() });
      },
    };
  });
  return store;
}

export const createDefaultStore = (): AppStore => createAppStore(createBrowserDataSource(() => crypto.randomUUID()));

const StoreContext = createContext<AppStore | null>(null);
export function StoreProvider({ store, children }: { store: AppStore; children: ReactNode }) {
  return createElement(StoreContext.Provider, { value: store }, children);
}
export function useApp<T>(select: (s: AppState) => T): T {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useApp needs <StoreProvider>');
  // Shallow-compared so selectors may return fresh arrays/objects of stable parts without re-render loops.
  return useStore(store, useShallow(select));
}
