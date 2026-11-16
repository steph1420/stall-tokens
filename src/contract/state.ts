// Derived state shapes (the fold's output). Screens read these through the store.
import type { ItemFields, LineStatus, MoneyPart, PaySource } from './op';
import type { Paise } from './money';

export interface Item extends ItemFields { readonly id: string; readonly sold: number; readonly oversold: boolean }
export interface Line {
  readonly lineId: string; readonly itemId: string; readonly name: string; readonly price: Paise;
  readonly category: string; readonly stationId: string; readonly qty: number; readonly note: string; readonly status: LineStatus;
  readonly committed: number; // qty already taken out of stock (sent or paid)
  readonly byCounter: boolean; // Q-COUNTER-FINISH: Ready because the Counter marked it, not the station
}
export interface Discount { readonly kind: 'amount' | 'pct'; readonly value: number; readonly allowedBy: string; readonly note: string }
export interface Payment {
  readonly paymentId: string; readonly cash: Paise; readonly upi: Paise; readonly upiPayeeId: string | null; readonly tip: Paise;
  readonly waived: Paise; readonly waivedBy: string; readonly waivedNote: string; readonly cashGiven: Paise;
  readonly notes: Readonly<Record<string, number>>; readonly at: number; readonly writer: string;
}
/** Q-CANCEL-1 A: a cancelled order keeps its record; `refundDue` is what was paid at cancel time (Money settles it later). */
export interface Cancel { readonly reason: string; readonly at: number; readonly by: string; readonly refundDue: Paise }
export interface Refund { readonly refundId: string; readonly amount: Paise; readonly source: PaySource; readonly at: number }
export interface Order {
  readonly id: string; readonly dayId: string; readonly token: number; readonly servedBy: string; readonly createdAt: number;
  readonly lines: readonly Line[]; readonly note: string; readonly discount: Discount | null;
  readonly roundOff: { readonly amount: Paise; readonly forTotal: Paise } | null;
  readonly sent: boolean; readonly deleted: boolean; readonly priority: boolean; readonly client: string; readonly cancel: Cancel | null; readonly payments: readonly Payment[]; readonly refunds: readonly Refund[];
  readonly revision: number;
}
export interface Payee { readonly id: string; readonly name: string; readonly upiId: string }
export interface Day { readonly id: string; readonly label: string; readonly startedAt: number }
export interface Conflict { readonly target: string; readonly field: string; readonly winner: string; readonly loser: string; readonly at: number }
/** F-23 Spent / Received entry (Q-MONEY-V8, Q-RECV). `voided` keeps the record (History hold to cancel). */
export interface Entry {
  readonly id: string; readonly dayId: string; readonly dir: 'spent' | 'received'; readonly amount: Paise; readonly label: string;
  readonly kind: 'normal' | 'donation'; readonly parts: readonly MoneyPart[]; readonly note: string; readonly personId: string | null; readonly at: number; readonly by: string;
  readonly voided: string | null;
}
/** F-27 A person in the money book; partners carry a share per fair (Q-SETTLE-GAPS). Names are typed in the app only. */
export interface Person { readonly id: string; readonly name: string; readonly isPartner: boolean; readonly sharePct: number }
