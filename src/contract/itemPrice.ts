import type { Paise } from './money';

/** Unit price after the item's percentage discount. Prices are paise; rounding is to the nearest paise. */
export function itemUnitPrice(price: Paise, discountPct: number): Paise {
  const pct = Number.isFinite(discountPct) ? Math.max(0, Math.min(100, discountPct)) : 0;
  return Math.max(0, price - Math.round((price * pct) / 100));
}
