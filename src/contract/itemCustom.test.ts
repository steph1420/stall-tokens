import { describe, expect, it } from 'vitest';
import { calcItemPrice, formatItemCustomName, parseAddons, parseVariants } from './itemCustom';

describe('itemCustom', () => {
  it('parses valid variants and ignores malformed option entries', () => {
    const variants = JSON.stringify([{ id: 'v1', name: 'Half', price: 6000 }, { name: 'Invalid', price: -1 }]);
    expect(parseVariants({ variants })).toEqual([{ id: 'v1', name: 'Half', price: 6000 }]);
    expect(parseVariants({ variants: 'bad json' })).toEqual([]);
  });

  it('parses add-ons and calculates variant + extras before discount', () => {
    const addons = JSON.stringify([{ id: 'a1', name: 'Cheese', price: 2000 }]);
    const chosen = parseAddons({ addons });
    expect(calcItemPrice(5000, { id: 'v1', name: 'Large', price: 8000 }, chosen, 10)).toBe(9000);
  });

  it('uses the base price without a variant and applies discounts after add-ons', () => {
    expect(calcItemPrice(5000, null, [{ name: 'Sauce', price: 500 }], 10)).toBe(4950);
  });

  it('formats the chosen options into a clear order-line name', () => {
    expect(formatItemCustomName('Burger', { name: 'Large', price: 8000 }, [{ name: 'Cheese', price: 2000 }]))
      .toBe('Burger (Large) + Cheese');
  });
});
