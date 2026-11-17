// UI place for this device (ARCHITECTURE §3): screen, current order, each order's last page, open sheet.
import type { Page } from './rules/status';

export type Screen = 'launch' | 'counter' | 'kitchen' | 'station' | StallScreen;
/** D-NAV: the quiet Stall section (launch + Counter ⋯). */
export type StallScreen = 'money' | 'settle' | 'stock' | 'history' | 'settings' | 'float' | 'developer';
/** Q-ORDERS-1: the Counter's two top tabs. */
export type CounterTab = 'new' | 'open' | 'unpaid';
/** Station page place (Q-BACK-1 A: Back returns to where it was opened from). */
export interface StationPlace { readonly id: string; readonly from: 'kitchen' | 'launch'; readonly orderId: string | null }
export type Sheet =
  | { kind: 'item'; itemId: string | null }
  | { kind: 'stock'; itemId: string }
  | { kind: 'lineNote'; lineId: string }
  | { kind: 'orderNote' }
  | { kind: 'adjust' }
  | { kind: 'payee' }
  | { kind: 'refund' }
  | { kind: 'waived' }
  | { kind: 'serving' }
  | { kind: 'more' }
  | { kind: 'overview' }
  | { kind: 'cancel'; orderId: string }
  | { kind: 'orderSheet'; orderId: string }
  | { kind: 'openOverview' }
  | { kind: 'drafts' }
  | { kind: 'newDay' }
  | { kind: 'refundSheet'; orderId: string }
  | { kind: 'slip'; orderId: string };
/** A toast's one button (s127 "Open", s122 "Undo"). */
export type ToastAction = { readonly label: string; readonly run: 'open'; readonly orderId: string } | { readonly label: string; readonly run: 'undoRefund'; readonly orderId: string; readonly refundId: string };
export interface ToastState { readonly text: string; readonly id: number; readonly action?: ToastAction }

export interface UiState {
  readonly screen: Screen;
  readonly orderId: string | null;
  readonly pages: Readonly<Record<string, Page>>;
  readonly sheet: Sheet | null;
  readonly toast: ToastState | null;
  /** Kitchen station pill; null = All (Q-OPEN-1 A). */
  readonly kitchenFilter: string | null;
  readonly station: StationPlace | null;
  readonly counterTab: CounterTab;
  /** Open Orders: the order on screen (null = first). */
  readonly openId: string | null;
  /** Where a Stall screen's Back returns to. */
  readonly stallFrom: 'launch' | 'counter';
  /** D-ACCESS: passcode entered for this visit to the Stall screens; cleared on leaving them. */
  readonly unlocked: boolean;
  /** s120/s121: the order opened from the Unpaid tab (full order view), null = none. */
  readonly orderView: string | null;
  /** s127a: the order this phone is waiting for (held by another phone); null = not waiting. */
  readonly waitFor: string | null;
  /** s127a: who holds the waited-for order ("Counter 2"). */
  readonly waitLabel: string;
  /** s127b: orders this phone claimed this session (a later claim by another phone makes it view-only here). */
  readonly heldHere: readonly string[];
  /** s127a: when the next automatic check runs (ms, this phone's clock). */
  readonly nextCheckAt: number;
  /** W-22: the menu item tapped when the new-day question opened (added after the answer); '' = none. */
  readonly pendingItem: string;
  /** W-22: IST date on which "Keep yesterday's day" was chosen ('' = not asked). */
  readonly dayKept: string;
}

export const initialUi: UiState = { screen: 'launch', orderId: null, pages: {}, sheet: null, toast: null, kitchenFilter: null, station: null, counterTab: 'new', openId: null, stallFrom: 'launch', unlocked: false, orderView: null, waitFor: null, waitLabel: '', heldHere: [], nextCheckAt: 0, pendingItem: '', dayKept: '' };
