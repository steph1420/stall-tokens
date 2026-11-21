import type { Paise } from './money';

/** Unit price after the item's percentage discount. Prices are paise; rounding is to the nearest paise. */
export function itemUnitPrice(price: Paise, discountPct: number): Paise {
  const pct = Number.isFinite(discountPct) ? Math.max(0, Math.min(100, discountPct)) : 0;
  return Math.max(0, price - Math.round((price * pct) / 100));
}

/**
 * Convert an integer sale quantity into primary inventory units.
 * Example: 250 g × 0.001 primary kg per gram = 0.25 kg.
 * Keep the full numeric ratio (including repeating ratios such as 1/12); rounding
 * each sale separately would accumulate inventory loss over repeated sales.
 */
export function primaryQuantity(quantity: number, multiplier: number): number {
  if (!Number.isSafeInteger(quantity)) throw new RangeError('Quantity must be a safe integer');
  if (!Number.isFinite(multiplier) || multiplier <= 0) throw new RangeError('Unit multiplier must be a positive finite number');
  const converted = quantity * multiplier;
  if (!Number.isFinite(converted)) throw new RangeError('Converted quantity is not finite');
  return converted;
}

/**
 * Calculate the complete line total from the discounted primary-unit rate.
 * Do not round a converted per-sale-unit price first: sub-paise prices must
 * accumulate across the line before rounding to the nearest paise.
 */
export function convertedLineTotal(price: Paise, discountPct: number, quantity: number, multiplier: number): Paise {
  if (!Number.isSafeInteger(price) || price < 0) throw new RangeError('Price must be non-negative whole paise');
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new RangeError('Quantity must be a non-negative safe integer');
  const primaryQty = primaryQuantity(quantity, multiplier);
  const rate = itemUnitPrice(price, discountPct);
  const total = Math.round(rate * primaryQty);
  if (!Number.isSafeInteger(total)) throw new RangeError('Line total exceeds the safe money range');
  return total;
}
