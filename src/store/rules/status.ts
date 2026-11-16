// F-05 Order status words for the strip and Open orders. "Paying"/"Editing" come from this device's
// UI place for the order; everything else from the folded order.
import type { Order } from '../../contract';
import { due } from './bill';

export type OrderStatus = 'New' | 'Editing' | 'Paying' | 'Kitchen' | 'Ready' | 'Done' | 'Refund';
export type Page = 'menu' | 'billing' | 'payment';

export function orderStatus(o: Order, page: Page | undefined): OrderStatus {
  const live = o.lines.filter((l) => l.qty > 0);
  if (live.length === 0 && o.payments.length === 0) return 'New';
  const hasDraft = live.some((l) => l.status === 'draft');
  const owed = due(o);
  if (owed < 0) return 'Refund';
  if (!o.sent || hasDraft) return page === 'payment' ? 'Paying' : 'Editing';
  if (live.every((l) => l.status === 'handed')) return owed > 0 ? 'Paying' : 'Done';
  if (live.every((l) => l.status === 'ready' || l.status === 'handed')) return 'Ready';
  return 'Kitchen';
}

/** An order stays open until it is handed over and nothing is owed either way. */
export const isOpen = (o: Order): boolean => !o.deleted && !(orderStatus(o, undefined) === 'Done');
