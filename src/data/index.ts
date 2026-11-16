// data/ entry: builds the DataSource from the browser, or a fake one for tests and e2e.
import { createDeviceStore } from './adapters/deviceStore';
import { createFallbackOpStore } from './adapters/fallback';
import { createLocalIdb } from './adapters/localIdb';
import { createTabChannel } from './adapters/tabChannel';
import { createSheetTransport, isSheetUrl } from './adapters/sheetTransport';
import type { DataSource, Transport } from './types';

export type { DataSource, DevicePrefs, OpStore, Transport, TabChannel, DeviceStore } from './types';
export { createSyncEngine, type SyncEngine, type SyncStatus } from './sync/engine';
export { createMemoryOpStore, createMemoryChannelHub } from './adapters/memory';
export { createFakeHub, createFakeTransport, type FakeHub } from './adapters/fakeTransport';
export { createDeviceStore } from './adapters/deviceStore';
export { createFallbackOpStore } from './adapters/fallback';
export { createSheetTransport, isSheetUrl, type SheetConfig } from './adapters/sheetTransport';

function safeLocalStorage(): Storage | null {
  try { return globalThis.localStorage; } catch (e) {
    console.warn('localStorage blocked', e);
    return null;
  }
}

/** The browser data source. The Sheet bridge joins when this phone has a sync URL and key (F-35); else local only. */
export function createBrowserDataSource(makeId: () => string, transports?: readonly Transport[]): DataSource {
  const idb = typeof indexedDB === 'undefined' ? null : indexedDB;
  const device = createDeviceStore(safeLocalStorage(), makeId);
  const { syncUrl, syncKey } = device.read();
  const sheet = isSheetUrl(syncUrl) && syncKey ? [createSheetTransport({ url: syncUrl, key: syncKey })] : [];
  return { ops: createFallbackOpStore(idb ? createLocalIdb(idb) : null), device, channel: createTabChannel(), transports: transports ?? sheet };
}
