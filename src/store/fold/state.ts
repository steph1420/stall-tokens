// F-02 Folded state: everything shared is derived from the op log; nothing here is written by screens.
import type { Conflict, Day, Item, Order, Payee, VV } from '../../contract';

export interface LastWrite { readonly writer: string; readonly seq: number; readonly opId: string }
export interface Folded {
  readonly items: Readonly<Record<string, Item>>;
  readonly orders: Readonly<Record<string, Order>>;
  readonly orderIds: readonly string[]; // creation order
  readonly days: readonly Day[];
  readonly payees: Readonly<Record<string, Payee>>;
  readonly settings: Readonly<Record<string, string>>;
  readonly conflicts: readonly Conflict[];
  readonly seen: VV; // highest seq per writer (the local version vector)
  readonly gaps: Readonly<Record<string, number>>; // writer -> count of missing seqs
  readonly lamport: number;
  readonly applied: ReadonlySet<string>;
  readonly lastWrite: Readonly<Record<string, LastWrite>>;
}

export const emptyFolded = (): Folded => ({
  items: {}, orders: {}, orderIds: [], days: [], payees: {}, settings: {}, conflicts: [],
  seen: {}, gaps: {}, lamport: 0, applied: new Set(), lastWrite: {},
});
