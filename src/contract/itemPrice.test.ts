import { describe, expect, it } from 'vitest';
import { itemUnitPrice } from './itemPrice';

describe('itemUnitPrice', () => {
  it('applies percentages in paise and rounds to the nearest paise', () => {
    expect(itemUnitPrice(10000, 10)).toBe(9000);
    expect(itemUnitPrice(10000, 15)).toBe(8500);
    expect(itemUnitPrice(99, 50)).toBe(49);
  });
  it('keeps full price at zero discount and caps defensive inputs', () => {
    expect(itemUnitPrice(10000, 0)).toBe(10000);
    expect(itemUnitPrice(10000, -10)).toBe(10000);
    expect(itemUnitPrice(10000, 150)).toBe(0);
    expect(itemUnitPrice(10000, Number.NaN)).toBe(10000);
  });
});
