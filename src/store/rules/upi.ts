// F-15 Dynamic UPI link (upi://pay with pa, pn, am, tn), made offline. Confirmation stays manual (Q-UPI-1 A).
import type { Paise } from '../../contract';

const UPI_ID = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/;
export const isUpiId = (s: string): boolean => UPI_ID.test(s.trim());

export function upiLink(upiId: string, name: string, amount: Paise, note: string): string {
  const am = (amount / 100).toFixed(2);
  const q = new URLSearchParams({ pa: upiId.trim(), pn: name.trim(), am, cu: 'INR', tn: note });
  return `upi://pay?${q.toString().replace(/\+/g, '%20')}`;
}
