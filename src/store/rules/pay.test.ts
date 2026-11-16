import { describe, expect, it } from 'vitest';
import { change, checkPayment, notesTotal, setBox, slide } from './pay';
import * as pay from './pay';

describe('payment split (F-14 F-16 F-17)', () => {
  it('typing one box fills the other with the remainder', () => {
    const s = setBox({ cash: 0, upi: 18000, pinned: null }, 'cash', 10000, 18000);
    expect(s).toEqual({ cash: 10000, upi: 8000, pinned: 'cash' });
    const over = setBox(s, 'cash', 50000, 18000);
    expect(over.upi).toBe(0);
  });
  it('typing the second box keeps both, leaving a waived gap (locked v5: ₹100 + ₹70 of ₹180)', () => {
    const a = setBox({ cash: 0, upi: 18000, pinned: null }, 'cash', 10000, 18000);
    const b = setBox(a, 'upi', 7000, 18000);
    expect(b).toEqual({ cash: 10000, upi: 7000, pinned: 'both' });
    expect(checkPayment(b.cash, b.upi, 18000, 0)).toMatchObject({ ok: true, gap: 1000 });
  });
  it('blocks over-collection, nothing due, negative parts, and waiving the tip', () => {
    expect(checkPayment(20000, 0, 18000, 0)).toMatchObject({ ok: false, over: 2000 });
    expect(checkPayment(0, 0, 0, 0).ok).toBe(false);
    expect(checkPayment(-100, 18100, 18000, 0).ok).toBe(false);
    expect(checkPayment(0, 0, 2000, 2000).ok).toBe(false);
    expect(checkPayment(18000, 0, 18000, 0)).toMatchObject({ ok: true, gap: 0 });
  });
  it('slider snaps to ₹10 and stays inside the bill', () => {
    expect(slide(0.5556, 18000, 1000)).toEqual({ cash: 10000, upi: 8000, pinned: 'both' });
    expect(slide(1.4, 18000, 1000).cash).toBe(18000);
    expect(slide(-1, 18000, 1000).cash).toBe(0);
    expect(slide(Number.NaN, 18000, 1000).cash).toBe(0);
    expect(slide(0.99, 18500, 1000).cash).toBe(18500);
    expect(slide(0.9, 18500, 1000).cash).toBe(17000);
    expect(slide(1, 18500, 1000).cash).toBe(18500);
    expect(slide(0.998, 18500, 1000).cash).toBe(18500);
  });
  it('counts notes and change, ignoring negative counts', () => {
    expect(notesTotal({ 100: 1, 50: 1 })).toBe(15000);
    expect(notesTotal({ 100: -3 })).toBe(0);
    expect(change(15000, 10000)).toBe(5000);
    expect(change(5000, 10000)).toBe(0);
  });
});

describe('refit and tip (break-it: numpad typed UPI left cash unchanged)', () => {
  it('untouched split is all cash and follows the bill', () => {
    expect(pay.refit({ cash: 999, upi: 0, pinned: null }, 14000)).toEqual({ cash: 14000, upi: 0, pinned: null });
  });
  it('typing UPI after untouched gives cash the rest', () => {
    const a = pay.refit({ cash: 14000, upi: 0, pinned: null }, 14000);
    const b = pay.setBox(a, 'upi', 5000, 14000);
    expect(b).toEqual({ cash: 9000, upi: 5000, pinned: 'upi' });
    expect(pay.refit(b, 15000)).toEqual({ cash: 10000, upi: 5000, pinned: 'upi' });
  });
  it('typed UPI larger than a shrunk bill is capped', () => {
    expect(pay.refit({ cash: 0, upi: 14000, pinned: 'upi' }, 10000)).toEqual({ cash: 0, upi: 10000, pinned: 'upi' });
  });
  it('tip on a both-typed split goes to cash, or to UPI when all UPI', () => {
    expect(pay.addTip({ cash: 9000, upi: 5000, pinned: 'both' }, 1000, 15000)).toEqual({ cash: 10000, upi: 5000, pinned: 'both' });
    expect(pay.addTip({ cash: 0, upi: 14000, pinned: 'both' }, 2000, 16000)).toEqual({ cash: 0, upi: 16000, pinned: 'both' });
    expect(pay.addTip({ cash: 500, upi: 5000, pinned: 'both' }, -1000, 4500).cash).toBe(0);
  });
});
