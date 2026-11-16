// Number pad (03-payment v5): 1–9, 00, 0, ⌫, Done. Whole rupees; capped at the money limit.
import { useState } from 'react';
import { Icon } from '../../kit/Icon';
import { KEYS, nextAmount, type Key } from '../../kit/keypad';
import s from './Payment.module.css';

export function Numpad({ rupees, onChange, onDone }: { rupees: number; onChange: (r: number) => void; onDone: () => void }) {
  const [fresh, setFresh] = useState(true); // the first key replaces the shown amount
  const press = (k: Key) => {
    const n = nextAmount(rupees, k, fresh);
    setFresh(false);
    if (n !== null) onChange(n);
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
