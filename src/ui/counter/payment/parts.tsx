// Payment parts: tip chips (F-17, D-TIP), Waived row, Count notes with change (F-16).
import { useState } from 'react';
import { CONFIG } from '../../../config';
import type { Paise } from '../../../contract';
import { pay } from '../../../store';
import { Icon } from '../../kit/Icon';
import { Money } from '../../kit/Money';
import s from './Payment.module.css';

export function TipRow({ tip, onTip, onOther }: { tip: Paise; onTip: (t: Paise) => void; onOther: () => void }) {
  const chips: readonly Paise[] = CONFIG.payment.tipChips;
  const other = tip > 0 && !chips.includes(tip);
  return (
    <div className={s.tipBlock}>
      <div className={s.tipLab}>Tip</div>
      <div className={s.tips} role="radiogroup" aria-label="Tip">
        <button type="button" role="radio" aria-checked={tip === 0} className={tip === 0 ? s.chipOn : s.chip} onClick={() => { onTip(0); }}>None</button>
        {chips.map((c) => (
          <button type="button" role="radio" aria-checked={tip === c} key={c} className={tip === c ? s.chipOn : s.chip} onClick={() => { onTip(c); }}><Money p={c} /></button>
        ))}
        <button type="button" role="radio" aria-checked={other} className={other ? s.chipOn : s.chip} onClick={onOther}>{other ? <Money p={tip} /> : 'Other'}</button>
      </div>
    </div>
  );
}

export function Waived({ amount, who, onEdit }: { amount: Paise; who: string; onEdit: () => void }) {
  return (
    <button type="button" className={s.adj} onClick={onEdit} aria-label={`Waived ₹${String(amount / 100)}${who ? `, allowed by ${who}` : ''}, edit`}>
      <span className={s.adjLab}>Waived</span>
      <Money p={amount} className={s.adjAmt} />
      <Icon name="pencil" className={s.adjPencil} />
    </button>
  );
}

const SWATCH_OF: Readonly<Record<number, number>> = { 5: 7, 10: 1, 20: 5, 50: 3, 100: 0, 200: 2, 500: 4, 1000: 6, 2000: 1 };

export function CountNotes({ notes, onNotes, cash }: { notes: Record<string, number>; onNotes: (n: Record<string, number>) => void; cash: Paise }) {
  const [showMore, setShowMore] = useState(false);
  const more = showMore || Object.keys(notes).some((k) => (CONFIG.payment.moreDenominations as readonly number[]).includes(Number(k)) && (notes[k] ?? 0) > 0);
  const list: readonly number[] = more ? [...CONFIG.payment.denominations, ...CONFIG.payment.moreDenominations] : CONFIG.payment.denominations;
  const set = (d: number, n: number) => { onNotes({ ...notes, [String(d)]: Math.max(0, Math.min(CONFIG.limits.qtyMax, n)) }); };
  const given = pay.notesTotal(notes);
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
      {given > 0 ? (
        <div className={s.tally}>
          <span className={s.tLab}>Cash received</span><Money p={given} className={s.tAmt} />
          <span className={given >= cash ? s.tChgLab : s.tShortLab}>{given >= cash ? 'Change' : 'Short'}</span>
          <Money p={given >= cash ? pay.change(given, cash) : cash - given} className={given >= cash ? s.tChg : s.tShort} />
        </div>
      ) : null}
    </section>
  );
}
