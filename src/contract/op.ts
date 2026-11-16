// The contract (06 rules 1, 6): op shapes every layer agrees on. Versioned; imports nothing from the app.
// F-02 op log (Q-HARM-10). Bodies are plain data; the fold gives them meaning.
import type { Paise } from './money';

export const CONTRACT_VERSION = 2;

export type LineStatus = 'draft' | 'waiting' | 'preparing' | 'done?' | 'ready' | 'held' | 'handed' | 'paused';
export type PaySource = 'cash' | 'upi';

export interface ItemFields {
  name: string; price: Paise; swatch: number; category: string; stationId: string;
  count: number | null; unit: string; lowAt: number; soldOut: boolean; order: number; removed: boolean;
}
export interface DiscountBody { orderId: string; kind: 'amount' | 'pct'; value: number; allowedBy: string; note: string }
export interface PaymentBody {
  paymentId: string; orderId: string; cash: Paise; upi: Paise; upiPayeeId: string | null;
  tip: Paise; waived: Paise; waivedBy: string; waivedNote: string; cashGiven: Paise; notes: Record<string, number>;
}

export interface Bodies {
  'item.set': { itemId: string; fields: Partial<ItemFields> };
  'stock.adjust': { itemId: string; delta: number; reason: string };
  'day.start': { dayId: string; label: string };
  'order.create': { orderId: string; dayId: string; token: number; servedBy: string };
  'line.add': { orderId: string; lineId: string; itemId: string; name: string; price: Paise; category: string; stationId: string; qty: number };
  'line.qty': { orderId: string; lineId: string; qty: number };
  'line.note': { orderId: string; lineId: string; note: string };
  'line.status': { orderId: string; lineId: string; status: LineStatus };
  'order.note': { orderId: string; note: string };
  'order.discount': DiscountBody;
  'order.roundoff': { orderId: string; amount: Paise; forTotal: Paise };
  'order.send': { orderId: string };
  'order.delete': { orderId: string };
  /** F-19 Priority flag (Q-ICON). Additive kind (contract stays v2: older ops never carry it). */
  'order.priority': { orderId: string; on: boolean };
  'payment.add': PaymentBody;
  'refund.add': { refundId: string; orderId: string; amount: Paise; source: PaySource };
  'payee.set': { payeeId: string; name: string; upiId: string; removed: boolean };
  'setting.set': { key: string; value: string };
}
export type OpKind = keyof Bodies;
export const OP_KINDS = [
  'item.set', 'stock.adjust', 'day.start', 'order.create', 'line.add', 'line.qty', 'line.note', 'line.status',
  'order.note', 'order.discount', 'order.roundoff', 'order.send', 'order.delete', 'order.priority', 'payment.add', 'refund.add',
  'payee.set', 'setting.set',
] as const satisfies readonly OpKind[];

/** Version vector: highest seq seen per writer. */
export type VV = Readonly<Record<string, number>>;

export interface OpHead {
  readonly v: typeof CONTRACT_VERSION;
  readonly opId: string; // `${writer}:${seq}`
  readonly writer: string;
  readonly seq: number;
  readonly lamport: number;
  readonly vv: VV;
  readonly wallAt: number; // display only; never used for ordering
}
export type Op<K extends OpKind = OpKind> = K extends OpKind ? OpHead & { readonly kind: K; readonly body: Bodies[K] } : never;

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x);

/** Shape check for ops arriving from storage or another device. A bad op is refused, never half-applied. */
export function isOp(value: unknown): value is Op {
  if (!isRecord(value)) return false;
  const { v, opId, writer, seq, lamport, vv, kind, body, wallAt } = value;
  if (v !== CONTRACT_VERSION || typeof writer !== 'string' || !writer || !isInt(seq) || seq < 1) return false;
  if (opId !== `${writer}:${String(seq)}` || !isInt(lamport) || lamport < 1 || typeof wallAt !== 'number') return false;
  if (!isRecord(vv) || !Object.values(vv).every(isInt)) return false;
  return typeof kind === 'string' && (OP_KINDS as readonly string[]).includes(kind) && isRecord(body);
}

/** Total order for the fold: lamport, then writer, then seq. Same log, same order, on every device. */
export function compareOps(a: OpHead, b: OpHead): number {
  if (a.lamport !== b.lamport) return a.lamport - b.lamport;
  if (a.writer !== b.writer) return a.writer < b.writer ? -1 : 1;
  return a.seq - b.seq;
}

type FieldType = 's' | 'n' | 'b' | 'o' | 'n?';
const S: Record<OpKind, Record<string, FieldType>> = {
  'item.set': { itemId: 's', fields: 'o' },
  'stock.adjust': { itemId: 's', delta: 'n', reason: 's' },
  'day.start': { dayId: 's', label: 's' },
  'order.create': { orderId: 's', dayId: 's', token: 'n', servedBy: 's' },
  'line.add': { orderId: 's', lineId: 's', itemId: 's', name: 's', price: 'n', category: 's', stationId: 's', qty: 'n' },
  'line.qty': { orderId: 's', lineId: 's', qty: 'n' },
  'line.note': { orderId: 's', lineId: 's', note: 's' },
  'line.status': { orderId: 's', lineId: 's', status: 's' },
  'order.note': { orderId: 's', note: 's' },
  'order.discount': { orderId: 's', kind: 's', value: 'n', allowedBy: 's', note: 's' },
  'order.roundoff': { orderId: 's', amount: 'n', forTotal: 'n' },
  'order.send': { orderId: 's' },
  'order.delete': { orderId: 's' },
  'order.priority': { orderId: 's', on: 'b' },
  'payment.add': { paymentId: 's', orderId: 's', cash: 'n', upi: 'n', upiPayeeId: 'n?', tip: 'n', waived: 'n', waivedBy: 's', waivedNote: 's', cashGiven: 'n', notes: 'o' },
  'refund.add': { refundId: 's', orderId: 's', amount: 'n', source: 's' },
  'payee.set': { payeeId: 's', name: 's', upiId: 's', removed: 'b' },
  'setting.set': { key: 's', value: 's' },
};
const okField = (t: FieldType, x: unknown): boolean =>
  t === 's' ? typeof x === 'string'
    : t === 'n' ? typeof x === 'number' && Number.isFinite(x)
      : t === 'b' ? typeof x === 'boolean'
        : t === 'o' ? isRecord(x)
          : x === null || typeof x === 'string';

/** Body check per kind (F-02). Money and counts must be finite numbers; strings must be strings. */
export function isValidOp(value: unknown): value is Op {
  if (!isOp(value)) return false;
  const body = value.body as unknown as Record<string, unknown>;
  return Object.entries(S[value.kind]).every(([k, t]) => okField(t, body[k]));
}
