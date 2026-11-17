// F-14 F-16 F-17 Payment split, waived gap, change and validation. Pure; paise.
import type { Paise } from '../../contract';

/** pinned = the box last typed (or the slider = cash); waived only from the explicit Round off / waive control;
 * tendered = cash typed above the amount (change due). Cash + UPI + waived always equals the amount to collect. */
export interface Split { cash: Paise; upi: Paise; pinned: 'cash' | 'upi' | null; waived?: Paise; tendered?: Paise }

const whole = (v: Paise): Paise => Math.max(0, Math.trunc(Number.isFinite(v) ? v : 0));
const avail = (split: Split, toCollect: Paise): Paise => Math.max(0, toCollect - whole(split.waived ?? 0));

/** Typing one box makes the other take the balance (UPI = total − cash, cash = total − UPI), every time.
 * Cash above the amount becomes change due; UPI above it is clamped. A gap is never left (no implicit waive). */
export function setBox(split: Split, box: 'cash' | 'upi', value: Paise, toCollect: Paise): Split {
  const v = whole(value);
  const a = avail(split, toCollect);
  const waived = whole(split.waived ?? 0);
  if (box === 'cash') return { cash: Math.min(v, a), upi: Math.max(0, a - v), pinned: 'cash', waived, tendered: v > a ? v : 0 };
  const upi = Math.min(v, a);
  return { cash: a - upi, upi, pinned: 'upi', waived, tendered: 0 };
}

/** The amount changed (tip, bill on another phone): the typed box keeps its value (clamped), the other takes the balance. */
export function refit(split: Split, toCollect: Paise): Split {
  const waived = Math.min(whole(split.waived ?? 0), Math.max(0, toCollect));
  const s0 = { ...split, waived };
  if (split.pinned === null) return { cash: avail(s0, toCollect), upi: 0, pinned: null, waived, tendered: 0 };
  const kept = split.pinned === 'cash' && (split.tendered ?? 0) > 0 ? whole(split.tendered ?? 0) : split[split.pinned];
  return setBox(s0, split.pinned, kept, toCollect);
}

/** A tip change goes to cash, or to UPI when the payment is all UPI. */
export function addTip(split: Split, _delta: Paise, toCollect: Paise): Split {
  if (split.pinned === null) return refit(split, toCollect);
  const allUpi = split.cash === 0 && split.upi > 0;
  return refit({ ...split, pinned: allUpi ? 'cash' : 'upi' }, toCollect);
}

/** Slider: cash share of what is being collected, snapped (₹10), clamped to [0, covered]. UPI takes the rest. */
export function slide(fraction: number, covered: Paise, snap: Paise, waived: Paise = 0): Split {
  const f = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  let cash = Math.round((covered * f) / snap) * snap;
  if (covered - cash <= snap / 2 || f >= 1) cash = covered; // a last odd ₹5 snaps to the end
  cash = Math.min(covered, Math.max(0, cash));
  return { cash, upi: covered - cash, pinned: 'cash', waived: whole(waived), tendered: 0 };
}

/** The explicit Round off / waive control: never more than the bill (the tip can't be waived); the boxes rebalance. */
export function setWaived(split: Split, value: Paise, toCollect: Paise, tip: Paise): Split {
  const waived = Math.min(whole(value), Math.max(0, toCollect - tip));
  return refit({ ...split, waived }, toCollect);
}

export interface PayCheck { ok: boolean; gap: Paise; over: Paise; reason: string }

/** Cash + UPI + waived must equal the amount to collect. Short = waived row; over = blocked. */
export function checkPayment(cash: Paise, upi: Paise, toCollect: Paise, tip: Paise, waived: Paise = 0): PayCheck {
  const gap = toCollect - cash - upi;
  if (toCollect <= 0) return { ok: false, gap: 0, over: 0, reason: 'Nothing to collect' };
  if (cash < 0 || upi < 0) return { ok: false, gap, over: 0, reason: 'Amounts cannot be negative' };
  if (gap < 0) return { ok: false, gap: 0, over: -gap, reason: 'More than the amount to collect' };
  if (gap > toCollect - tip) return { ok: false, gap, over: 0, reason: 'Waived cannot include the tip' };
  if (gap !== whole(waived)) return { ok: false, gap, over: 0, reason: 'Cash and UPI must add up to the amount' }; // no implicit waive
  return { ok: true, gap, over: 0, reason: '' };
}

/** Count notes: total of counted notes (rupee note -> count). */
export const notesTotal = (notes: Readonly<Record<string, number>>): Paise =>
  Object.entries(notes).reduce((t, [note, n]) => t + Number(note) * 100 * Math.max(0, Math.trunc(n)), 0);

export const change = (cashGiven: Paise, cash: Paise): Paise => Math.max(0, cashGiven - cash);
