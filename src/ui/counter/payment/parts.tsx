// Payment parts: tip chips (F-17, D-TIP), Waived row, Count notes with change (F-16).
import { useState } from 'react';
import { CONFIG } from '../../../config';
import type { Paise } from '../../../contract';
import { amounts, useApp } from '../../../store';
import { Money } from '../../kit/Money';
import s from './Payment.module.css';

type Adj = 'tip' | 'waive';

/** pay2 (locked): the amount due changes only here. Two small pills, "+ Tip" and "− Waive"; a tap opens quick chips
 * (₹10, ₹20, Other). Kept small on purpose (rare, and they change what is owed). */
/** pay4 (D-PAY4-1): + Tip and − Waive are twins: same pill, same chips (₹10, ₹20, Other), Undo toast.
 *  Tap a lit chip to take it off (no "No tip" / "No waive" chips); an Other amount shows as its own lit chip. */
export function AdjustRow({ tip, waived, onPick, onOther, onWho }: { tip: Paise; waived: Paise; onPick: (k: Adj, p: Paise) => void; onOther: (k: Adj) => void; onWho: () => void }) {
  const tipChips = useApp((x) => amounts.amounts(x.folded.settings, 'tipChips'));
  const [open, setOpen] = useState<Adj | null>(null);
  const base: readonly Paise[] = open === 'tip' ? tipChips : CONFIG.payment.waiveChips;
  const now = open === 'tip' ? tip : waived;
  const chips = now > 0 && !base.includes(now) ? [...base, now] : base;
  const pick = (k: Adj, p: Paise) => { onPick(k, p); setOpen(null); };
  const pill = (k: Adj, label: string, v: Paise, off: string | undefined, on: string | undefined) => (
    <button type="button" className={v > 0 || open === k ? on : off} aria-expanded={open === k} onClick={() => { setOpen(open === k ? null : k); }}>{label}{v > 0 ? <> <Money p={v} /></> : null}</button>
  );
  return (
    <div className={s.adjBlock}>
      <div className={s.adjPills}>
        {pill('tip', '+ Tip', tip, s.pillTip, s.pillTipOn)}
        {pill('waive', '− Waive', waived, s.pillWaive, s.pillWaiveOn)}
      </div>
      {open ? (
        <div className={s.adjChips} role="group" aria-label={open === 'tip' ? 'Tip' : 'Waive'}>
          {chips.map((p) => <button type="button" key={p} aria-pressed={now === p} className={now === p ? s.chipOn : s.chip} onClick={() => { pick(open, now === p ? 0 : p); }}><Money p={p} /></button>)}
          <button type="button" className={s.chip} onClick={() => { onOther(open); setOpen(null); }}>Other</button>
          {open === 'waive' ? <button type="button" className={s.chip} onClick={onWho}>Who · note</button> : null}
        </div>
      ) : null}
    </div>
  );
}

const SWATCH_OF: Readonly<Record<number, number>> = { 5: 7, 10: 1, 20: 5, 50: 3, 100: 0, 200: 2, 500: 4, 1000: 6, 2000: 1 };

export function CountNotes({ notes, onNotes }: { notes: Record<string, number>; onNotes: (n: Record<string, number>) => void }) {
  const [showMore, setShowMore] = useState(false);
  const more = showMore || Object.keys(notes).some((k) => (CONFIG.payment.moreDenominations as readonly number[]).includes(Number(k)) && (notes[k] ?? 0) > 0);
  const list: readonly number[] = more ? [...CONFIG.payment.denominations, ...CONFIG.payment.moreDenominations] : CONFIG.payment.denominations;
  const set = (d: number, n: number) => { onNotes({ ...notes, [String(d)]: Math.max(0, Math.min(CONFIG.limits.qtyMax, n)) }); };
  return (
    <section className={s.notes} aria-label="Count notes">
      <div className={s.notesH}>Count notes <em>· optional</em></div>
      <div className={s.dgrid}>
        {list.map((d) => {
          const n = notes[String(d)] ?? 0;
          return (
            <div key={d} className={n > 0 ? s.dcardIn : s.dcard} style={{ '--item-accent': `var(--dl-stall-swatch-${String(SWATCH_OF[d] ?? 0)})` } as React.CSSProperties}>
              <button type="button" className={s.dhit} aria-label={`Add a ₹${String(d)} note`} onClick={() => { set(d, n + 1); }} />
              <span className={s.daccent} />
              <Money p={d * 100} className={s.dval} />
              {n > 0 ? (
                <div className={s.dqty}>
                  <button type="button" className={s.qb} aria-label={`One less ₹${String(d)}`} onClick={() => { set(d, n - 1); }}>−</button>
                  <span className={s.qn}>{n}</span>
                  <button type="button" className={s.qb} aria-label={`One more ₹${String(d)}`} onClick={() => { set(d, n + 1); }}>+</button>
                </div>
              ) : null}
            </div>
          );
        })}
        {!more ? <button type="button" className={s.moreNotes} onClick={() => { setShowMore(true); }}>More notes</button> : null}
      </div>
    </section>
  );
}
