// data/ entry: builds the DataSource from the browser, or a fake one for tests and e2e.
import { createDeviceStore } from './adapters/deviceStore';
import { createLocalIdb } from './adapters/localIdb';
import { createMemoryOpStore } from './adapters/memory';
import { createTabChannel } from './adapters/tabChannel';
import type { DataSource, Transport } from './types';

export type { DataSource, DevicePrefs, OpStore, Transport, TabChannel, DeviceStore } from './types';
export { createSyncEngine, type SyncEngine, type SyncStatus } from './sync/engine';
export { createMemoryOpStore, createMemoryChannelHub } from './adapters/memory';
export { createFakeHub, createFakeTransport, type FakeHub } from './adapters/fakeTransport';
export { createDeviceStore } from './adapters/deviceStore';

function safeLocalStorage(): Storage | null {
  try { return globalThis.localStorage; } catch (e) {
    console.warn('localStorage blocked', e);
    return null;
  }
}

/** The browser data source. No transport until the Sheet bridge is set up (F-35). */
export function createBrowserDataSource(makeId: () => string, transports: readonly Transport[] = []): DataSource {
  const idb = typeof indexedDB === 'undefined' ? null : indexedDB;
  return {
    ops: idb ? createLocalIdb(idb) : createMemoryOpStore(),
    device: createDeviceStore(safeLocalStorage(), makeId),
    channel: createTabChannel(),
    transports,
  };
}
