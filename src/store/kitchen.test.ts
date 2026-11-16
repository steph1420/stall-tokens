// F-19..F-22 kitchen and station store flow.
import { describe, expect, it } from 'vitest';
import { DEMO_MENU } from '../mock/fixtures';
import { isOpen, kitchen, liveOrders } from '.';
import { makeTestStore } from './testkit';

async function ready() {
  const t = makeTestStore();
  await t.store.getState().start();
  const s = () => t.store.getState();
  for (const m of DEMO_MENU) s().catalog.saveItem(null, { name: m.name, price: m.price, swatch: m.swatch, category: m.category, stationId: m.stationId, count: null });
  const idOf = (name: string) => Object.values(s().folded.items).find((i) => i.name === name)?.id ?? '';
  /** One sent order with the named items; returns its id. */
  const send = (...names: string[]) => {
    s().counter.newOrder();
    for (const n of names) s().counter.addItem(idOf(n));
    s().counter.sendToKitchen();
    return s().ui.orderId ?? '';
  };
  const order = (id: string) => { const o = s().folded.orders[id]; if (!o) throw new Error('no order'); return o; };
  const statuses = (id: string) => order(id).lines.map((l) => `${l.name}:${l.status}`);
  return { s, send, order, statuses };
}

describe('kitchen and station (F-19..F-22)', () => {
  it('station taps, auto-prep, Counter confirm and hand over close the order', async () => {
    const { s, send, order, statuses } = await ready();
    const a = send('Tea', 'Samosa');
    const b = send('Coffee');
    const orders = () => liveOrders(s().folded);
    expect(kitchen.toMake(orders(), null)).toBe(3);
    expect(kitchen.toMake(orders(), 'Beverages')).toBe(2);
    const tea = order(a).lines[0]?.lineId ?? '';
    expect(s().kitchen.advance(a, tea)).toBe(true); // Waiting → Preparing
    expect(s().kitchen.advance(a, tea)).toBe(true); // Preparing → Done?, so Beverages starts the next order
    expect(s().kitchen.advance(a, tea)).toBe(false); // Done? waits for the Counter
    expect(statuses(b)).toEqual(['Coffee:preparing']);
    expect(kitchen.counterStep(order(a))).toBe('confirm');
    expect(s().kitchen.sendBack(a)).toBe(true);
    expect(statuses(a)[0]).toBe('Tea:preparing');
    s().kitchen.advance(a, tea);
    expect(s().kitchen.confirmDone(a)).toBe(true);
    expect(kitchen.counterStep(order(a))).toBe('handover');
    expect(s().kitchen.handOver(a)).toBe(true);
    expect(kitchen.handedMeta(order(a))).toBe('1 of 2 handed over'); // Q-KITCHEN-4 A: handed line stays, muted
    expect(kitchen.kitchenOrders(orders()).map((o) => o.id)).toEqual([a, b]);
    const samosa = order(a).lines[1]?.lineId ?? '';
    s().kitchen.advance(a, samosa); s().kitchen.advance(a, samosa); s().kitchen.confirmDone(a); s().kitchen.handOver(a);
    expect(kitchen.kitchenOrders(orders()).map((o) => o.id)).toEqual([b]);
    expect(isOpen(order(a))).toBe(true); // still unpaid: the Counter keeps it open
  });

  it('priority goes first, hold toggles, auto-prep can be switched off, back returns to the opener', async () => {
    const { s, send, order, statuses } = await ready();
    const a = send('Tea');
    const b = send('Coffee');
    s().kitchen.togglePriority(b);
    expect(kitchen.kitchenOrders(liveOrders(s().folded)).map((o) => o.id)).toEqual([b, a]);
    const coffee = order(b).lines[0]?.lineId ?? '';
    expect(s().kitchen.toggleHold(b, coffee)).toBe(true);
    expect(statuses(b)).toEqual(['Coffee:held']);
    expect(s().kitchen.toggleHold(b, coffee)).toBe(true);
    s().setPrefs({ autoPrep: false });
    s().kitchen.advance(b, coffee); s().kitchen.advance(b, coffee);
    expect(statuses(a)).toEqual(['Tea:waiting']);
    s().kitchen.openKitchen();
    s().kitchen.openStation('Beverages', 'kitchen');
    expect(s().ui.station?.orderId).toBe(b);
    s().kitchen.stepStationOrder(1);
    expect(s().ui.station?.orderId).toBe(a);
    s().kitchen.closeStation();
    expect(s().ui.screen).toBe('kitchen');
    expect(kitchen.overview(liveOrders(s().folded), 'Beverages').items).toEqual([{ name: 'Tea', qty: 1 }]);
  });
});
