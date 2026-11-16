// F-19 / F-21 Q-OVERLAY: an order that leaves the Kitchen/Station list because it is fully handed over (Completed) or
// removed by the Counter (Cancelled, today `order.delete`) keeps its card for a moment under a calm overlay,
// then drops off as before. View-only memory: nothing is written to the log.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Order } from '../../contract';
import { Icon } from '../kit/Icon';
import s from './Kitchen.module.css';

export type Why = 'completed' | 'cancelled';
export interface Gone { readonly o: Order; readonly why: Why; readonly at: number }

const HOLD_MS = 2500;

function reason(cur: Order | undefined): Why | null {
  if (!cur) return 'cancelled';
  const sent = cur.lines.filter((l) => l.qty > 0 && l.status !== 'draft');
  return sent.length > 0 && sent.every((l) => l.status === 'handed') ? 'completed' : null;
}

/** Orders that just left `list`, kept for HOLD_MS with why they left. */
export function useLeaving(list: readonly Order[], orders: Readonly<Record<string, Order>>): readonly Gone[] {
  const prev = useRef<readonly Order[]>([]);
  const timers = useRef<number[]>([]);
  const [gone, setGone] = useState<readonly Gone[]>([]);
  const ids = list.map((o) => o.id).join(',');
  useEffect(() => {
    const now = new Set(ids.split(','));
    const left = prev.current.flatMap((o, at) => {
      if (now.has(o.id)) return [];
      const why = reason(orders[o.id]);
      return why ? [{ o: orders[o.id] ?? o, why, at }] : [];
    });
    prev.current = list;
    if (left.length === 0) return;
    const drop = (g: readonly Gone[]) => g.filter((x) => !left.some((l) => l.o.id === x.o.id));
    setGone((g) => [...drop(g), ...left]);
    timers.current.push(window.setTimeout(() => { setGone(drop); }, HOLD_MS));
  }, [ids, list, orders]);
  useEffect(() => () => { timers.current.forEach((t) => { window.clearTimeout(t); }); }, []);
  return gone;
}

/** Live orders with the leaving ones back at their old places. */
export function withGone<T extends { o: Order; gone?: Why }>(list: readonly Order[], gone: readonly Gone[]): T[] {
  const out = list.map((o) => ({ o }) as T);
  for (const g of [...gone].sort((a, b) => a.at - b.at)) if (!list.some((o) => o.id === g.o.id)) out.splice(Math.min(g.at, out.length), 0, { o: g.o, gone: g.why } as T);
  return out;
}

export function LeavingCard({ why, children }: { why: Why | undefined; children: ReactNode }) {
  if (!why) return <>{children}</>;
  return (
    <div className={s.leaving} inert>
      {children}
      <div className={[s.veil, why === 'cancelled' ? s.veilCancel : ''].join(' ')} role="status">
        {why === 'completed' ? <Icon name="stHanded" className={s.veilIc} /> : null}
        <span>{why === 'completed' ? 'Completed' : 'Cancelled'}</span>
      </div>
    </div>
  );
}
