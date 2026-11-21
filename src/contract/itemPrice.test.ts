import { describe, expect, it } from 'vitest';
import { convertedLineTotal, itemUnitPrice, primaryQuantity } from './itemPrice';

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

describe('secondary-unit conversion math', () => {
  it('converts sale quantities into primary stock units', () => {
    expect(primaryQuantity(250, 0.001)).toBe(0.25);
    expect(primaryQuantity(100, 0.001)).toBe(0.1);
    expect(primaryQuantity(25, 0.01)).toBe(0.25);
    expect(primaryQuantity(1, 1 / 12)).toBeCloseTo(1 / 12, 12);
    expect(primaryQuantity(12, 1 / 12)).toBe(1);
  });

  it('calculates converted line totals before rounding to paise', () => {
    expect(convertedLineTotal(20000, 0, 1, 1)).toBe(20000); // 1 kg
    expect(convertedLineTotal(20000, 0, 250, 0.001)).toBe(5000); // 250 g
    expect(convertedLineTotal(20000, 0, 100, 0.001)).toBe(2000); // 100 g
    expect(convertedLineTotal(20000, 10, 250, 0.001)).toBe(4500); // discount before conversion
    expect(convertedLineTotal(1, 0, 3, 0.1)).toBe(0); // sub-paise total rounds once
  });

  it('rejects invalid quantities, multipliers and unsafe totals', () => {
    expect(primaryQuantity(-250, 0.001)).toBe(-0.25);
    expect(() => convertedLineTotal(20000, 0, -1, 0.001)).toThrow(RangeError);
    expect(() => primaryQuantity(1.5, 0.001)).toThrow(RangeError);
    expect(() => primaryQuantity(1, 0)).toThrow(RangeError);
    expect(() => primaryQuantity(1, Number.NaN)).toThrow(RangeError);
    expect(() => convertedLineTotal(Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER, 2)).toThrow(RangeError);
  });
});
