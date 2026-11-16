// UI place for this device (ARCHITECTURE §3): screen, current order, each order's last page, open sheet.
import type { Page } from './rules/status';

export type Screen = 'launch' | 'counter' | 'kitchen' | 'station';
/** Q-ORDERS-1: the Counter's two top tabs. */
export type CounterTab = 'new' | 'open';
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
  | { kind: 'openOverview' };

export interface UiState {
  readonly screen: Screen;
  readonly orderId: string | null;
  readonly pages: Readonly<Record<string, Page>>;
  readonly sheet: Sheet | null;
  readonly toast: { readonly text: string; readonly id: number } | null;
  /** Kitchen station pill; null = All (Q-OPEN-1 A). */
  readonly kitchenFilter: string | null;
  readonly station: StationPlace | null;
  readonly counterTab: CounterTab;
  /** Open Orders: the order on screen (null = first). */
  readonly openId: string | null;
}

export const initialUi: UiState = { screen: 'launch', orderId: null, pages: {}, sheet: null, toast: null, kitchenFilter: null, station: null, counterTab: 'new', openId: null };
