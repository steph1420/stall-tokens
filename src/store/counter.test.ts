import { describe, expect, it } from 'vitest';
import { createFakeHub, createMemoryChannelHub } from '../data';
import { DEMO_MENU } from '../mock/fixtures';
import { bill, isOpen, orderStatus } from '.';
import { makeTestStore, memoryStorage } from './testkit';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function ready(opts: Parameters<typeof makeTestStore>[0] = {}) {
  const t = makeTestStore(opts);
  await t.store.getState().start();
  const s = () => t.store.getState();
  return { ...t, s };
}
function seedMenu(s: () => ReturnType<Awaited<ReturnType<typeof ready>>['s']>) {
  const ids: Record<string, string> = {};
  for (const m of DEMO_MENU) {
    expect(s().catalog.saveItem(null, { name: m.name, price: m.price, swatch: m.swatch, category: m.category, stationId: m.stationId, count: m.count })).toBeNull();
    const it = Object.values(s().folded.items).find((i) => i.name === m.name);
    ids[m.itemId] = it?.id ?? '';
  }
  return ids;
}
const cur = (s: () => { ui: { orderId: string | null }; folded: { orders: Record<string, unknown> } }) => {
  const st = s() as ReturnType<Awaited<ReturnType<typeof ready>>['s']>;
  const o = st.folded.orders[st.ui.orderId ?? ''];
  if (!o) throw new Error('no current order');
  return o;
};

describe('counter flow (F-06..F-18)', () => {
  it('menu → billing → To kitchen → pay, with tokens and stock', async () => {
    const { s } = await ready();
    const id = seedMenu(s);
    s().counter.addItem(id.coffee ?? ''); s().counter.addItem(id.coffee ?? '');
    s().counter.addItem(id.vadapav ?? ''); s().counter.addItem(id.samosa ?? '');
    const o = cur(s);
    expect(o.token).toBe(1);
    expect(bill.subtotal(o)).toBe(10000);
    expect(orderStatus(o, 'billing')).toBe('Editing');
    s().counter.setDiscount({ kind: 'amount', value: 1000, allowedBy: 'S', note: '' });
    expect(bill.total(cur(s))).toBe(9000);
    expect(s().counter.sendToKitchen()).toBe(true);
    expect(s().counter.sendToKitchen()).toBe(false); // second tap: nothing to send
    expect(orderStatus(cur(s), 'billing')).toBe('Kitchen');
    const pay = { cash: 9000, upi: 0, upiPayeeId: null, tip: 0, waived: 0, waivedBy: '', waivedNote: '', cashGiven: 10000, notes: { 100: 1 } };
    expect(s().counter.pay(pay)).toBeNull();
    expect(s().counter.pay(pay)).toBe('Nothing to collect'); // double tap
    expect(cur(s).payments).toHaveLength(1);
    const second = s().counter.newOrder();
    expect(s().folded.orders[second]?.token).toBe(2);
  });

  it('sold out and low stock stop extra taps; stock never goes below 0 from the panel', async () => {
    const { s } = await ready();
    const id = seedMenu(s);
    s().counter.addItem(id.sandwich ?? '');
    expect(s().ui.toast?.text).toBe('Sandwich is sold out');
    for (let i = 0; i < 5; i++) s().counter.addItem(id.colddrink ?? '');
    expect(cur(s).lines[0]?.qty).toBe(3);
    expect(s().ui.toast?.text).toBe('Cold Drink is sold out');
    s().catalog.adjustStock(id.tea ?? '', -100);
    expect(s().folded.items[id.tea ?? '']?.count).toBe(24);
    s().catalog.setSoldOut(id.tea ?? '', true);
    s().counter.addItem(id.tea ?? '');
    expect(cur(s).lines.some((l) => l.itemId === id.tea)).toBe(false);
  });

  it('applies item discounts to ordinary menu taps and snapshots the discounted unit price', async () => {
    const { s } = await ready();
    expect(s().catalog.saveItem(null, { name: 'Discounted tea', price: 10000, swatch: 0, category: 'Drinks', stationId: 'Tea', count: null, discountPct: 15 })).toBeNull();
    const item = Object.values(s().folded.items).find((i) => i.name === 'Discounted tea');
    expect(item?.discountPct).toBe(15);
    if (!item) throw new Error('discounted item missing');

    s().counter.addItem(item.id);
    expect(cur(s).lines[0]?.price).toBe(8500);
    expect(bill.subtotal(cur(s))).toBe(8500);
    const firstOrderId = cur(s).id;

    const secondOrderId = s().counter.newOrder();
    expect(s().catalog.saveItem(item.id, { name: item.name, price: item.price, swatch: item.swatch, category: item.category, stationId: item.stationId, count: item.count, discountPct: 20 })).toBeNull();
    s().counter.addItem(item.id);
    expect(s().folded.orders[firstOrderId]?.lines[0]?.price).toBe(8500);
    expect(s().folded.orders[secondOrderId]?.lines[0]?.price).toBe(8000);
    expect(s().catalog.saveItem(item.id, { name: item.name, price: item.price, swatch: item.swatch, category: item.category, stationId: item.stationId, count: item.count, discountPct: 101 })).toBe('Discount must be between 0 and 100');
  });

  it('waived gap must match; tips are separate; over-collection is refused', async () => {
    const { s } = await ready();
    const id = seedMenu(s);
    for (let i = 0; i < 6; i++) s().counter.addItem(id.coffee ?? ''); // ₹180
    const base = { upiPayeeId: null, waivedBy: 'S', waivedNote: '', cashGiven: 0, notes: {} };
    expect(s().counter.pay({ ...base, cash: 10000, upi: 7000, tip: 0, waived: 0 })).toBe('Cash and UPI must add up to the amount');
    expect(s().counter.pay({ ...base, cash: 10000, upi: 9000, tip: 0, waived: 0 })).toBe('More than the amount to collect');
    expect(s().counter.pay({ ...base, cash: 10000, upi: 10000, tip: 2000, waived: 0 })).toBeNull();
    expect(bill.tips(cur(s))).toBe(2000);
    expect(bill.paid(cur(s))).toBe(18000);
    expect(bill.due(cur(s))).toBe(0);
  });

  it('editing a paid order: collect the extra, or refund the difference', async () => {
    const { s } = await ready();
    const id = seedMenu(s);
    s().counter.addItem(id.tea ?? ''); s().counter.addItem(id.tea ?? '');
    const base = { upiPayeeId: null, tip: 0, waived: 0, waivedBy: '', waivedNote: '', cashGiven: 0, notes: {} };
    expect(s().counter.pay({ ...base, cash: 4000, upi: 0 })).toBeNull();
    expect(cur(s).lines[0]?.status).toBe('waiting');
    s().counter.removeItem(id.tea ?? '');
    expect(bill.due(cur(s))).toBe(-2000);
    expect(orderStatus(cur(s), 'billing')).toBe('Refund');
    expect(s().counter.deleteOrder()).toBe(false); // paid: refund first
    expect(s().counter.refund('cash')).toBe(true);
    expect(s().counter.refund('cash')).toBe(false);
    expect(bill.due(cur(s))).toBe(0);
    s().counter.addItem(id.samosa ?? '');
    expect(bill.due(cur(s))).toBe(1500);
    expect(orderStatus(cur(s), 'menu')).toBe('Editing');
  });

  it('delete of an unpaid sent order returns its stock (started-line block is tested with the kitchen, F-19)', async () => {
    const { s } = await ready();
    const id = seedMenu(s);
    s().counter.addItem(id.tea ?? '');
    s().counter.sendToKitchen();
    const o = cur(s);
    const lineId = o.lines[0]?.lineId ?? '';
    expect(s().counter.deleteOrder()).toBe(true);
    expect(s().folded.orders[o.id]?.deleted).toBe(true);
    expect(s().folded.items[id.tea ?? '']?.count).toBe(24);
    expect(lineId).not.toBe('');
  });

  it('cancels a sent paid order, restores unstarted stock and refunds the recorded amount', async () => {
    const { s } = await ready();
    const ids = seedMenu(s);
    const teaId = ids.tea ?? '';
    const initialStock = s().folded.items[teaId]?.count;
    s().counter.addItem(teaId);
    const order = cur(s);
    expect(s().counter.sendToKitchen()).toBe(true);
    expect(s().folded.items[teaId]?.count).toBe((initialStock ?? 0) - 1);
    expect(s().counter.pay({ cash: 2000, upi: 0, upiPayeeId: null, tip: 0, waived: 0, waivedBy: '', waivedNote: '', cashGiven: 2000, notes: {} })).toBeNull();

    expect(s().counter.cancelOrder(order.id, 'Guest left')).toBe(true);
    const cancelled = s().folded.orders[order.id];
    expect(cancelled?.cancel).toMatchObject({ reason: 'Guest left', refundDue: 2000 });
    expect(s().folded.items[teaId]?.count).toBe(initialStock);

    const refund = s().refund.offer({ orderId: order.id, ask: { kind: 'whole' }, source: 'cash', reason: 'Cancelled order', restock: false });
    expect(refund.ok).toBe(true);
    if (!refund.ok) throw new Error(refund.reason);
    expect(refund.amount).toBe(2000);
    expect(s().folded.orders[order.id]?.refunds[0]?.amount).toBe(2000);
    expect(s().refund.undo(order.id, refund.refundId)).toBe(true);
    expect(s().folded.orders[order.id]?.refunds[0]?.voided).toBe('Undo');
  });

  it('deleting an order releases its token for the next new order', async () => {
    const { s } = await ready();
    const id = seedMenu(s);
    s().counter.addItem(id.tea ?? '');
    expect(cur(s).token).toBe(1);
    const id2 = s().counter.newOrder();
    s().counter.addItem(id.samosa ?? '');
    expect(s().folded.orders[id2]?.token).toBe(2);
    expect(s().counter.deleteOrder()).toBe(true);
    expect(s().folded.orders[id2]?.deleted).toBe(true);
    const id3 = s().counter.newOrder();
    expect(s().folded.orders[id3]?.token).toBe(2);
  });

  it('round-off at billing, both ways, refuses below ₹0', async () => {
    const { s } = await ready();
    const id = seedMenu(s);
    s().counter.addItem(id.samosa ?? ''); s().counter.addItem(id.tea ?? ''); // ₹35
    s().counter.setRoundOff(500);
    expect(bill.total(cur(s))).toBe(4000);
    s().counter.setRoundOff(-500);
    expect(bill.total(cur(s))).toBe(3000);
    s().counter.setRoundOff(-99999);
    expect(s().ui.toast?.text).toContain('below ₹0');
    s().counter.addItem(id.tea ?? '');
    expect(bill.total(cur(s))).toBe(5500); // bill changed: old round-off no longer applies
  });

  it('notes are trimmed and capped; names are capped; bad prices refused', async () => {
    const { s } = await ready();
    expect(s().catalog.saveItem(null, { name: '   ', price: 100, swatch: 0, category: '', stationId: '', count: null })).toBe('Give the item a name');
    expect(s().catalog.saveItem(null, { name: 'X', price: -1, swatch: 0, category: '', stationId: '', count: null })).toBe('Check the price');
    expect(s().catalog.saveItem(null, { name: 'X', price: 1.5, swatch: 0, category: '', stationId: '', count: null })).toBe('Check the price');
    expect(s().catalog.saveItem(null, { name: 'चाय ☕ '.repeat(20), price: 1250, swatch: 99, category: '', stationId: '', count: null })).toBeNull();
    const it = Object.values(s().folded.items)[0];
    expect(it?.name.length).toBeLessThanOrEqual(60);
    expect(it?.swatch).toBe(3);
    s().counter.addItem(it?.id ?? '');
    s().counter.setLineNote(cur(s).lines[0]?.lineId ?? '', `  ${'x'.repeat(500)}  `);
    expect(cur(s).lines[0]?.note.length).toBe(140);
  });

  it('persists menu, order, notes and device settings across a store reload', async () => {
    const storage = memoryStorage();
    const { s, ops } = await ready({ storage });
    const ids = seedMenu(s);
    s().setPrefs({ servingName: 'Counter A', rangeIndex: 1 });
    s().counter.addItem(ids.samosa ?? '');
    const orderId = s().ui.orderId;
    const lineId = cur(s).lines[0]?.lineId;
    if (!orderId || !lineId) throw new Error('Order line missing');
    s().counter.setOrderNote('  Please serve together.  ');
    s().counter.setLineNote(lineId, '  No onion.  ');
    await flush();

    const reloaded = makeTestStore({ ops, storage });
    await reloaded.store.getState().start();
    const state = reloaded.store.getState();
    const restored = state.folded.orders[orderId];
    expect(state.folded.items[ids.samosa ?? '']).toMatchObject({ name: 'Samosa', price: DEMO_MENU.find((m) => m.itemId === 'samosa')?.price });
    expect(restored).toMatchObject({ token: 501, note: 'Please serve together.' });
    expect(restored?.lines[0]).toMatchObject({ itemId: ids.samosa, qty: 1, note: 'No onion.' });
    expect(state.prefs.servingName).toBe('Counter A');
    expect(state.prefs.rangeIndex).toBe(1);
  });

  it('storage full is shown, the change is kept, and Retry saves it', async () => {
    const { s, ops } = await ready();
    await flush(); // the first-start device.set / setting.set ops (Q-SYNC-ALL) are saved first
    const before = ops.all.length;
    ops.failNext = 2;
    s().counter.newOrder();
    await flush();
    expect(s().saveError).toBe('This phone is out of storage space.');
    expect(s().unsaved).toHaveLength(2); // day.start + order.create
    s().retrySave();
    await flush();
    expect(s().saveError).toBeNull();
    expect(ops.all).toHaveLength(before + 2);
  });

  it('two counters offline then synced: different token ranges, same state everywhere', async () => {
    const hub = createFakeHub();
    const A = await ready({ hub, device: 'devAAAAA' });
    const B = await ready({ hub, device: 'devBBBBB' });
    B.s().setPrefs({ rangeIndex: 1 });
    const id = seedMenu(A.s);
    await A.s().syncNow(); await B.s().syncNow();
    hub.offline = true;
    A.s().counter.addItem(id.tea ?? '');
    B.s().counter.addItem(id.tea ?? '');
    await A.s().syncNow();
    expect(A.s().sync.error).toContain('offline');
    hub.offline = false;
    await A.s().syncNow(); await B.s().syncNow(); await A.s().syncNow();
    const tokens = (st: typeof A.s) => Object.values(st().folded.orders).map((o) => o.token).sort((x, y) => x - y);
    expect(tokens(A.s)).toEqual([1, 501]);
    expect(tokens(B.s)).toEqual([1, 501]);
    expect(A.s().folded.items).toEqual(B.s().folded.items);
  });

  it('two tabs on one phone share ops through the channel', async () => {
    const channels = createMemoryChannelHub();
    const A = await ready({ channels, device: 'devTTTTT' });
    const B = await ready({ channels, device: 'devTTTTT' });
    A.s().catalog.saveItem(null, { name: 'Tea', price: 2000, swatch: 0, category: '', stationId: '', count: null });
    expect(Object.values(B.s().folded.items).map((i) => i.name)).toEqual(['Tea']);
  });

  it('an order with only handed lines and nothing owed closes', async () => {
    const { s } = await ready();
    const id = seedMenu(s);
    s().counter.addItem(id.tea ?? '');
    expect(isOpen(cur(s))).toBe(true);
  });
  it('reserves fractional primary stock for measured-unit draft lines', async () => {
    const { s } = await ready();
    expect(s().catalog.saveItem(null, {
      name: 'Saffron', price: 10000, swatch: 0, category: 'Spices', stationId: 'Kitchen', count: 0.25,
      unit: 'kg', secondaryUnit: 'g', secondaryMultiplier: 0.001,
    })).toBeNull();
    const item = Object.values(s().folded.items).find((i) => i.name === 'Saffron');
    if (!item) throw new Error('Saffron missing');
    s().counter.newOrder();
    s().counter.addItemCustom(item.id, item.name, item.price, 'g', 'kg', 0.001, 250);
    const line = cur(s).lines[0];
    expect(line).toBeDefined();
    if (!line) throw new Error('Measured line missing');
    expect(line).toMatchObject({ qty: 250, unit: 'g', priceUnit: 'kg', stockMultiplier: 0.001 });
    expect(s().counter.available(item.id)).toBeCloseTo(0, 10);
    s().counter.addItemCustom(item.id, item.name, item.price, 'g', 'kg', 0.001, 1);
    expect(cur(s).lines[0]?.qty).toBe(250);
    s().counter.setQty(line.lineId, 251);
    expect(cur(s).lines[0]?.qty).toBe(250);
  });

  it('calculates a measured-line refund and restores converted stock, including undo', async () => {
    const { s } = await ready();
    s().catalog.saveItem(null, {
      name: 'Rice', price: 20000, swatch: 0, category: 'Food', stationId: 'Kitchen', count: 1,
      unit: 'kg', secondaryUnit: 'g', secondaryMultiplier: 0.001,
    });
    const item = Object.values(s().folded.items).find((i) => i.name === 'Rice');
    if (!item) throw new Error('Rice missing');
    s().counter.addItemCustom(item.id, item.name, item.price, 'g', 'kg', 0.001, 250);
    const order = cur(s);
    const line = order.lines[0];
    if (!line) throw new Error('Measured line missing');
    expect(bill.subtotal(order)).toBe(5000);
    expect(s().counter.sendToKitchen()).toBe(true);
    expect(s().counter.pay({ cash: 5000, upi: 0, upiPayeeId: null, tip: 0, waived: 0, waivedBy: '', waivedNote: '', cashGiven: 5000, notes: { 50: 1 } })).toBeNull();
    const refund = s().refund.offer({ orderId: order.id, ask: { kind: 'lines', lines: [{ lineId: line.lineId, qty: 250 }] }, source: 'cash', reason: 'Measured item', restock: true });
    if (!refund.ok) throw new Error(refund.reason);
    expect(refund.amount).toBe(5000);
    expect(s().folded.items[item.id]?.count).toBe(1);
    expect(s().refund.undo(order.id, refund.refundId)).toBe(true);
    expect(s().folded.items[item.id]?.count).toBeCloseTo(0.75, 10);
  });

});
