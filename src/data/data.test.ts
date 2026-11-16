import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { opMaker } from '../mock/fixtures';
import { createDeviceStore, PREFS_KEY } from './adapters/deviceStore';
import { createFakeHub, createFakeTransport } from './adapters/fakeTransport';
import { createFallbackOpStore } from './adapters/fallback';
import { createLocalIdb, DB_NAME } from './adapters/localIdb';
import { createSyncEngine } from './sync/engine';

describe('LocalIdb (F-03)', () => {
  it('stores ops once, survives reopen, and drops corrupt rows', async () => {
    const mk = opMaker('idb.1');
    const a = mk('day.start', { dayId: 'd', label: '' });
    const b = mk('order.create', { orderId: 'o', dayId: 'd', token: 1, servedBy: '' });
    const s1 = createLocalIdb(indexedDB);
    await s1.append([a, b, a]);
    await s1.append([b]);
    await s1.append([{ ...b, opId: 'junk', seq: 99 }]);
    const again = await createLocalIdb(indexedDB).load();
    expect(again.map((o) => o.opId).sort()).toEqual(['idb.1:1', 'idb.1:2']);
  });
  it('names start with the storage prefix (shared github.io origin)', () => {
    expect(DB_NAME.startsWith('stall-tokens.v2')).toBe(true);
    expect(PREFS_KEY.startsWith('stall-tokens.v2')).toBe(true);
  });
});

describe('device prefs', () => {
  it('fall back to defaults on corrupt or hostile data', () => {
    localStorage.setItem(PREFS_KEY, '{"theme":"neon","rangeIndex":9,"deviceId":"x"}');
    const p = createDeviceStore(localStorage, () => 'abcdef0123456789').read();
    expect(p).toMatchObject({ theme: 'night', rangeIndex: 0, deviceId: 'abcdef0123456789' });
    localStorage.setItem(PREFS_KEY, 'not json');
    expect(createDeviceStore(localStorage, () => 'zzzzzzzz1').read().deviceId).toBe('zzzzzzzz1');
  });
  it('work with no storage at all (private mode)', () => {
    const d = createDeviceStore(null, () => 'private01');
    d.write({ ...d.read(), theme: 'day' });
    expect(d.read().theme).toBe('day');
  });
});

describe('sync engine with the fake transport (F-03)', () => {
  it('pushes, pulls, survives errors, offline and duplicate pulls, and backs off', async () => {
    const hub = createFakeHub();
    const seenA = new Set<string>();
    const a = createSyncEngine([createFakeTransport(hub)], (id) => seenA.has(id), () => 1);
    const b = createSyncEngine([createFakeTransport(hub)], () => false, () => 1);
    const mk = opMaker('devA.1');
    const op1 = mk('day.start', { dayId: 'd', label: '' });
    seenA.add(op1.opId);
    a.enqueue([op1]);
    hub.offline = true;
    expect(await a.round()).toEqual([]);
    expect(a.status()).toMatchObject({ pending: 1, online: false });
    expect(a.status().error).toContain('offline');
    expect(a.nextDelayMs()).toBeGreaterThan(4000);
    hub.offline = false;
    hub.failNext = 1;
    await a.round();
    expect(a.status().pending).toBe(1);
    await a.round();
    expect(a.status()).toMatchObject({ pending: 0, online: true, error: null });
    hub.duplicatePulls = true;
    const got = await b.round();
    expect(got.map((o) => o.opId)).toEqual(['devA.1:1']);
    expect(a.nextDelayMs()).toBe(4000);
  });
});

describe('IndexedDB fallback (F-03)', () => {
  it('works in memory and says so when the saved log cannot open', async () => {
    const broken = { load: () => Promise.reject(new Error('blocked')), append: () => Promise.resolve() };
    const s = createFallbackOpStore(broken);
    expect(s.persistent?.()).toBe(true);
    expect(await s.load()).toEqual([]);
    expect(s.persistent?.()).toBe(false);
    expect(createFallbackOpStore(null).persistent?.()).toBe(false);
  });
});
