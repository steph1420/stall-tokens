// Test helper: a store on memory data, with deterministic ids. Imported by tests only.
import { createDeviceStore, createFakeTransport, createMemoryChannelHub, createMemoryOpStore, type FakeHub } from '../data';
import { createAppStore } from '.';

export function makeTestStore(opts: { hub?: FakeHub; channels?: ReturnType<typeof createMemoryChannelHub>; device?: string; now?: () => number } = {}) {
  let n = 0;
  const device = opts.device ?? 'dev00001';
  const ops = createMemoryOpStore();
  const store = createAppStore({
    ops, device: createDeviceStore(null, () => `${device}-id`), channel: (opts.channels ?? createMemoryChannelHub()).make(),
    transports: opts.hub ? [createFakeTransport(opts.hub)] : [],
  }, { makeId: () => `${device}-${String(++n)}`, now: opts.now ?? (() => Date.UTC(2026, 10, 16, 10, 0)), loadId: 'L1' });
  return { store, ops };
}
