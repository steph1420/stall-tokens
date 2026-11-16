// Number pad (03-payment v5): 1–9, 00, 0, ⌫, Done. Whole rupees; capped at the money limit.
import { useState } from 'react';
import { CONFIG } from '../../../config';
import { Icon } from '../../kit/Icon';
import s from './Payment.module.css';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'] as const;
const MAX_RUPEES = CONFIG.limits.moneyMaxPaise / CONFIG.money.paisePerRupee;

export function Numpad({ rupees, onChange, onDone }: { rupees: number; onChange: (r: number) => void; onDone: () => void }) {
  const [fresh, setFresh] = useState(true); // the first key replaces the shown amount
  const press = (k: (typeof KEYS)[number]) => {
    const cur = fresh && k !== 'del' ? '0' : String(rupees);
    setFresh(false);
    const next = k === 'del' ? cur.slice(0, -1) : cur === '0' ? k.replace(/^0+/, '') : cur + k;
    const n = Number(next || '0');
    if (n <= MAX_RUPEES) onChange(n);
  };
  return (
    <div className={s.pad} role="dialog" aria-label="Number pad">
      <div className={s.padGrab} />
      <div className={s.keys}>
        {KEYS.map((k) => (
          <button type="button" key={k} className={k === 'del' || k === '00' ? s.keyUtil : s.key} aria-label={k === 'del' ? 'Delete' : k} onClick={() => { press(k); }}>
            {k === 'del' ? <Icon name="backspace" className={s.bs} /> : k}
          </button>
        ))}
      </div>
      <button type="button" className={s.padDone} onClick={onDone}>Done</button>
    </div>
  );
}
