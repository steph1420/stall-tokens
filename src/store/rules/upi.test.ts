import { describe, expect, it } from 'vitest';
import { isUpiId, upiLink } from './upi';

describe('UPI link (F-15)', () => {
  it('builds upi://pay with pa, pn, am, cu and tn', () => {
    const link = upiLink('stall@okbank', 'Fair Stall', 8000, 'Token #047');
    expect(link).toBe('upi://pay?pa=stall%40okbank&pn=Fair%20Stall&am=80.00&cu=INR&tn=Token%20%23047');
  });
  it('checks UPI IDs', () => {
    expect(isUpiId('name.1@okicici')).toBe(true);
    for (const bad of ['', 'name', '@bank', 'a b@bank', 'name@', 'x@1bank']) expect(isUpiId(bad)).toBe(false);
  });
});
