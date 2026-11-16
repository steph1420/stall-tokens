// store/: the single owner of app state (06 rule 2; ARCHITECTURE §3). Built on Zustand.
// Screens read and write only through here. Only the store calls the data layer (ARCHITECTURE §2, §4).
import { createContext, createElement, useContext, type ReactNode } from 'react';
import { createStore as createZustand, useStore, type StoreApi } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { createBrowserDataSource, createSyncEngine, type DataSource, type DevicePrefs } from '../data';
import { catalogActions } from './catalog';
import { createLog, initialCore, type Core, type CoreState } from './core';
import { counterActions } from './counter';
import { kitchenActions } from './kitchen';
import { openActions } from './open';
import { liveOrders as live } from './fold/fold';
import { pauseMoves } from './rules/kitchen';
import type { Screen, Sheet } from './ui';

export type { CounterTab, Screen, Sheet, StationPlace } from './ui';
export * as kitchen from './rules/kitchen';
export type { Folded } from './fold/state';
export type { DevicePrefs } from '../data';
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
  readonly kitchen: ReturnType<typeof kitchenActions>;
  readonly open: ReturnType<typeof openActions>;
  readonly go: (screen: Screen) => void;
  readonly openSheet: (sheet: Sheet | null) => void;
  readonly setPrefs: (patch: Partial<DevicePrefs>) => void;
  readonly retrySave: () => void;
  readonly start: () => Promise<void>;
  readonly syncNow: () => Promise<void>;
}
export type AppStore = StoreApi<AppState>;

export interface StoreOptions { makeId?: () => string; now?: () => number; loadId?: string }

export function createAppStore(ds: DataSource, opts: StoreOptions = {}): AppStore {
  const makeId = opts.makeId ?? (() => crypto.randomUUID());
  const now = opts.now ?? (() => Date.now());
  const prefs = ds.device.read();
  const writer = `${prefs.deviceId.slice(0, 8)}.${opts.loadId ?? makeId().slice(0, 4)}`;
  let log: ReturnType<typeof createLog> | null = null;
  const engine = createSyncEngine(ds.transports, (id) => store.getState().folded.applied.has(id), now);
  const store = createZustand<AppState>()((set, get) => {
    const core: Core = { get, set: (p) => { set(p as Partial<AppState>); }, env: { ds, engine, makeId, now } };
    // Q-PAUSE-1 A: Priority pauses / resumes other orders' lines through real ops (rules/kitchen.ts pauseMoves).
    log = createLog(core, writer, (f) => pauseMoves(live(f)));
    const l = log;
    return {
      ...initialCore(prefs),
      counter: counterActions(core, l),
      catalog: catalogActions(core, l),
      kitchen: kitchenActions(core, l),
      open: openActions(core, l),
      go(screen) { set((s) => ({ ui: { ...s.ui, screen, sheet: null } })); },
      openSheet(sheet) { set((s) => ({ ui: { ...s.ui, sheet } })); },
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
