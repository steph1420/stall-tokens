// Payment parts: tip chips (F-17, D-TIP), Waived row, Count notes with change (F-16).
import { useState } from 'react';
import { CONFIG } from '../../../config';
import type { Paise } from '../../../contract';
import { amounts, useApp } from '../../../store';
import { AmountsEdit } from '../../kit/AmountsEdit';
import { Icon } from '../../kit/Icon';
import { Money } from '../../kit/Money';
import s from './Payment.module.css';

type Adj = 'tip' | 'waive';

/** pay2 (locked): the amount due changes only here. Two small pills, "+ Tip" and "− Waive"; a tap opens quick chips
 * (₹10, ₹20, Other). Kept small on purpose (rare, and they change what is owed). */
export function AdjustRow({ tip, waived, onPick, onOther, onWho }: { tip: Paise; waived: Paise; onPick: (k: Adj, p: Paise) => void; onOther: (k: Adj) => void; onWho: () => void }) {
  const tipChips = useApp((x) => amounts.amounts(x.folded.settings, 'tipChips'));
  const [open, setOpen] = useState<Adj | null>(null);
  const [edit, setEdit] = useState(false);
  const chips = open === 'tip' ? tipChips : CONFIG.payment.waiveChips;
  const now = open === 'tip' ? tip : waived;
  const pick = (k: Adj, p: Paise) => { onPick(k, p); setOpen(null); };
  return (
    <div className={s.adjBlock}>
      <div className={s.adjPills}>
        <button type="button" className={tip > 0 || open === 'tip' ? s.pillTipOn : s.pillTip} aria-expanded={open === 'tip'} onClick={() => { setOpen(open === 'tip' ? null : 'tip'); }}>+ Tip{tip > 0 ? <> <Money p={tip} /></> : null}</button>
        <button type="button" className={waived > 0 || open === 'waive' ? s.pillWaiveOn : s.pillWaive} aria-expanded={open === 'waive'} onClick={() => { setOpen(open === 'waive' ? null : 'waive'); }}>− Waive{waived > 0 ? <> <Money p={waived} /></> : null}</button>
      </div>
      {open ? (
        <div className={s.adjChips} role="group" aria-label={open === 'tip' ? 'Tip' : 'Waive'}>
          {chips.map((p) => <button type="button" key={p} aria-pressed={now === p} className={now === p ? s.chipOn : s.chip} onClick={() => { pick(open, p); }}><Money p={p} /></button>)}
          <button type="button" className={s.chip} onClick={() => { onOther(open); setOpen(null); }}>Other</button>
          {now > 0 ? <button type="button" className={s.chip} onClick={() => { pick(open, 0); }}>{open === 'tip' ? 'No tip' : 'No waive'}</button> : null}
          {open === 'tip' ? <button type="button" className={s.chip} aria-label="Edit tip choices" aria-expanded={edit} onClick={() => { setEdit(!edit); }}><Icon name="pencil" className={s.chipIcon} /></button>
            : <button type="button" className={s.chip} onClick={onWho}>Who · note</button>}
        </div>
      ) : null}
      {edit && open === 'tip' ? <AmountsEdit k="tipChips" onDone={() => { setEdit(false); }} /> : null}
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
