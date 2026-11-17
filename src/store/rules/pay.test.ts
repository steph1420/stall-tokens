import { describe, expect, it } from 'vitest';
import { change, checkPayment, notesTotal, setBox, slide } from './pay';
import * as pay from './pay';

const at = (s: pay.Split) => ({ cash: s.cash, upi: s.upi, waived: s.waived ?? 0 });

describe('payment split (F-14 F-16 F-17)', () => {
  it('typing one box fills the other with the balance', () => {
    const s = setBox({ cash: 0, upi: 18000, pinned: null }, 'cash', 10000, 18000);
    expect(at(s)).toEqual({ cash: 10000, upi: 8000, waived: 0 });
    expect(at(setBox(s, 'upi', 3000, 18000))).toEqual({ cash: 15000, upi: 3000, waived: 0 });
  });
  it('hotfix (Steve, #001 ₹240): slider then Cash 180 makes UPI 60, never "Waived ₹30"', () => {
    const slid = slide(0.875, 24000, 1000); // ₹210 cash + ₹30 UPI
    expect(at(slid)).toEqual({ cash: 21000, upi: 3000, waived: 0 });
    const typed = setBox(slid, 'cash', 18000, 24000);
    expect(at(typed)).toEqual({ cash: 18000, upi: 6000, waived: 0 });
    expect(checkPayment(typed.cash, typed.upi, 24000, 0, typed.waived)).toMatchObject({ ok: true, gap: 0 });
  });
  it('typing either side, one after the other, always adds up (no gap)', () => {
    const a = setBox({ cash: 24000, upi: 0, pinned: null }, 'upi', 5000, 24000);
    expect(at(a)).toEqual({ cash: 19000, upi: 5000, waived: 0 });
    const b = setBox(a, 'cash', 10000, 24000);
    expect(at(b)).toEqual({ cash: 10000, upi: 14000, waived: 0 });
    const c = slide(0.5, b.cash + b.upi, 1000);
    expect(at(c)).toEqual({ cash: 12000, upi: 12000, waived: 0 });
  });
  it('over the total: cash becomes change due, UPI is clamped', () => {
    const cash = setBox({ cash: 24000, upi: 0, pinned: null }, 'cash', 30000, 24000);
    expect(cash).toMatchObject({ cash: 24000, upi: 0, tendered: 30000 });
    expect(change(cash.tendered ?? 0, cash.cash)).toBe(6000);
    expect(at(setBox(cash, 'upi', 99900, 24000))).toEqual({ cash: 0, upi: 24000, waived: 0 });
  });
  it('clearing a field gives the whole amount to the other side', () => {
    expect(at(setBox({ cash: 24000, upi: 0, pinned: null }, 'cash', 0, 24000))).toEqual({ cash: 0, upi: 24000, waived: 0 });
    expect(at(setBox({ cash: 0, upi: 24000, pinned: 'upi' }, 'upi', 0, 24000))).toEqual({ cash: 24000, upi: 0, waived: 0 });
  });
  it('waive / round-off only through the explicit control; the boxes rebalance and the tip cannot be waived', () => {
    const w = pay.setWaived(setBox({ cash: 24000, upi: 0, pinned: null }, 'upi', 4000, 24000), 1000, 24000, 0);
    expect(at(w)).toEqual({ cash: 19000, upi: 4000, waived: 1000 });
    expect(checkPayment(w.cash, w.upi, 24000, 0, w.waived)).toMatchObject({ ok: true, gap: 1000 });
    expect(at(setBox(w, 'cash', 30000, 24000))).toMatchObject({ cash: 23000, upi: 0, waived: 1000 });
    expect(pay.setWaived(w, 99900, 26000, 2000).waived).toBe(24000);
  });
  it('a leftover gap without an explicit waive is refused', () => {
    expect(checkPayment(18000, 3000, 24000, 0)).toMatchObject({ ok: false });
    expect(checkPayment(18000, 3000, 24000, 0, 3000)).toMatchObject({ ok: true, gap: 3000 });
  });
  it('blocks over-collection, nothing due, negative parts, and waiving the tip', () => {
    expect(checkPayment(20000, 0, 18000, 0)).toMatchObject({ ok: false, over: 2000 });
    expect(checkPayment(0, 0, 0, 0).ok).toBe(false);
    expect(checkPayment(-100, 18100, 18000, 0).ok).toBe(false);
    expect(checkPayment(0, 0, 2000, 2000, 2000).ok).toBe(false);
    expect(checkPayment(18000, 0, 18000, 0)).toMatchObject({ ok: true, gap: 0 });
  });
  it('slider snaps to ₹10 and stays inside the bill', () => {
    expect(at(slide(0.5556, 18000, 1000))).toEqual({ cash: 10000, upi: 8000, waived: 0 });
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
    expect(at(pay.refit({ cash: 999, upi: 0, pinned: null }, 14000))).toEqual({ cash: 14000, upi: 0, waived: 0 });
  });
  it('typing UPI after untouched gives cash the rest, and the typed box keeps its value when the bill changes', () => {
    const b = pay.setBox(pay.refit({ cash: 14000, upi: 0, pinned: null }, 14000), 'upi', 5000, 14000);
    expect(at(b)).toEqual({ cash: 9000, upi: 5000, waived: 0 });
    expect(at(pay.refit(b, 15000))).toEqual({ cash: 10000, upi: 5000, waived: 0 });
  });
  it('typed UPI larger than a shrunk bill is capped', () => {
    expect(at(pay.refit({ cash: 0, upi: 14000, pinned: 'upi' }, 10000))).toEqual({ cash: 0, upi: 10000, waived: 0 });
  });
  it('tip goes to cash, or to UPI when all UPI; a slider split stays balanced', () => {
    expect(at(pay.addTip({ cash: 9000, upi: 5000, pinned: 'cash' }, 1000, 15000))).toEqual({ cash: 10000, upi: 5000, waived: 0 });
    expect(at(pay.addTip({ cash: 0, upi: 14000, pinned: 'upi' }, 2000, 16000))).toEqual({ cash: 0, upi: 16000, waived: 0 });
    expect(at(pay.addTip({ cash: 500, upi: 5000, pinned: 'cash' }, -1000, 4500))).toEqual({ cash: 0, upi: 4500, waived: 0 });
  });
});
