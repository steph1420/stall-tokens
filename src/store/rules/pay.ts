// F-14 F-16 F-17 Payment split, waived gap, change and validation. Pure; paise.
import type { Paise } from '../../contract';

export interface Split { cash: Paise; upi: Paise; pinned: 'cash' | 'upi' | 'both' | null }

/** Entering one box makes the other take the remainder, until both have been typed (spec Payment v4). */
export function setBox(split: Split, box: 'cash' | 'upi', value: Paise, toCollect: Paise): Split {
  const v = Math.max(0, Math.trunc(value));
  const other = box === 'cash' ? 'upi' : 'cash';
  const bothPinned = split.pinned === other || split.pinned === 'both';
  if (bothPinned) return { ...split, [box]: v, pinned: 'both' };
  const rest = Math.max(0, toCollect - v);
  return box === 'cash' ? { cash: v, upi: rest, pinned: 'cash' } : { cash: rest, upi: v, pinned: 'upi' };
}

/** Untyped boxes follow the amount: untouched = all cash; one typed = the other takes the rest (bill changed on another phone). */
export function refit(split: Split, toCollect: Paise): Split {
  if (split.pinned === null) return { cash: toCollect, upi: 0, pinned: null };
  if (split.pinned === 'both') return split;
  return { ...setBox({ ...split, pinned: null }, split.pinned, Math.min(split[split.pinned], toCollect), toCollect), pinned: split.pinned };
}

/** A tip change goes to cash, or to UPI when the payment is all UPI; never negative. */
export function addTip(split: Split, delta: Paise, toCollect: Paise): Split {
  if (split.pinned !== 'both') return refit(split, toCollect);
  const toUpi = split.cash === 0 && split.upi > 0;
  const cash = toUpi ? 0 : Math.max(0, split.cash + delta);
  const upi = toUpi ? Math.max(0, split.upi + delta) : split.upi;
  return { cash, upi, pinned: 'both' };
}

/** Slider: cash share of what is being collected, snapped (₹10), clamped to [0, covered]. */
export function slide(fraction: number, covered: Paise, snap: Paise): Split {
  const f = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  let cash = Math.round((covered * f) / snap) * snap;
  if (covered - cash <= snap / 2 || f >= 1) cash = covered; // a last odd ₹5 snaps to the end
  cash = Math.min(covered, Math.max(0, cash));
  return { cash, upi: covered - cash, pinned: 'both' };
}

export interface PayCheck { ok: boolean; gap: Paise; over: Paise; reason: string }

/** Cash + UPI + waived must equal the amount to collect. Short = waived row; over = blocked. */
export function checkPayment(cash: Paise, upi: Paise, toCollect: Paise, tip: Paise): PayCheck {
  const gap = toCollect - cash - upi;
  if (toCollect <= 0) return { ok: false, gap: 0, over: 0, reason: 'Nothing to collect' };
  if (cash < 0 || upi < 0) return { ok: false, gap, over: 0, reason: 'Amounts cannot be negative' };
  if (gap < 0) return { ok: false, gap: 0, over: -gap, reason: 'More than the amount to collect' };
  if (gap > toCollect - tip) return { ok: false, gap, over: 0, reason: 'Waived cannot include the tip' };
  return { ok: true, gap, over: 0, reason: '' };
}

/** Count notes: total of counted notes (rupee note -> count). */
export const notesTotal = (notes: Readonly<Record<string, number>>): Paise =>
  Object.entries(notes).reduce((t, [note, n]) => t + Number(note) * 100 * Math.max(0, Math.trunc(n)), 0);

export const change = (cashGiven: Paise, cash: Paise): Paise => Math.max(0, cashGiven - cash);
