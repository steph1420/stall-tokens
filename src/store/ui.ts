// UI place for this device (ARCHITECTURE §3): screen, current order, each order's last page, open sheet.
import type { Page } from './rules/status';

export type Screen = 'launch' | 'counter';
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
  | { kind: 'more' };

export interface UiState {
  readonly screen: Screen;
  readonly orderId: string | null;
  readonly pages: Readonly<Record<string, Page>>;
  readonly sheet: Sheet | null;
  readonly olist: boolean;
  readonly toast: { readonly text: string; readonly id: number } | null;
}

export const initialUi: UiState = { screen: 'launch', orderId: null, pages: {}, sheet: null, olist: false, toast: null };
