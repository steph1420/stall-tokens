import { describe, expect, it } from 'vitest';
import { compareOps, formatInr, isValidOp, parseRupees, rupees } from '.';
import { opMaker } from '../mock/fixtures';

describe('money (paise, en-IN)', () => {
  it('formats Indian grouping, decimals and negatives', () => {
    expect(formatInr(rupees(100))).toBe('₹100');
    expect(formatInr(rupees(1050))).toBe('₹1,050');
    expect(formatInr(rupees(99999999))).toBe('₹9,99,99,999');
    expect(formatInr(1250)).toBe('₹12.50');
    expect(formatInr(-1000)).toBe('−₹10');
    expect(formatInr(0)).toBe('₹0');
  });
  it('parses typed rupees and refuses junk', () => {
    expect(parseRupees('12.5')).toBe(1250);
    expect(parseRupees('₹1,200')).toBe(120000);
    expect(parseRupees('007')).toBe(700);
    expect(parseRupees('Rs 40')).toBe(4000);
    for (const bad of ['', '-5', '1e3', '12.345', 'abc', '१२']) expect(parseRupees(bad)).toBeNull();
  });
});

describe('op contract', () => {
  const mk = opMaker('dev1.a');
  it('accepts a well formed op and refuses bad ones', () => {
    const op = mk('order.note', { orderId: 'o1', note: 'Pack to go' });
    expect(isValidOp(op)).toBe(true);
    expect(isValidOp({ ...op, v: 1 })).toBe(false);
    expect(isValidOp({ ...op, opId: 'x:9' })).toBe(false);
    expect(isValidOp({ ...op, kind: 'drop.tables' })).toBe(false);
    expect(isValidOp({ ...op, body: { orderId: 'o1', note: 5 } })).toBe(false);
    expect(isValidOp({ ...op, seq: 0, opId: 'dev1.a:0' })).toBe(false);
    expect(isValidOp(null)).toBe(false);
    expect(isValidOp('op')).toBe(false);
    const pay = mk('payment.add', { paymentId: 'p', orderId: 'o', cash: Number.NaN, upi: 0, upiPayeeId: null, tip: 0, waived: 0, waivedBy: '', waivedNote: '', cashGiven: 0, notes: {} });
    expect(isValidOp(pay)).toBe(false);
  });
  it('orders ops by lamport, then writer, then seq', () => {
    const a = opMaker('a.1')('order.note', { orderId: 'o', note: '' }, { lamport: 5 });
    const b = opMaker('b.1')('order.note', { orderId: 'o', note: '' }, { lamport: 5 });
    const c = opMaker('a.1')('order.note', { orderId: 'o', note: '' }, { lamport: 4 });
    expect([a, b, c].sort(compareOps).map((o) => o.writer + String(o.lamport))).toEqual(['a.14', 'a.15', 'b.15']);
  });
});
