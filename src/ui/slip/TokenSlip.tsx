// F-42 Token slip (D-SLIP): about 58 mm wide, printable from the browser (Print token on the paid screen). Stall name,
// big token number, IST time, items × qty, total, how it was paid, "Show this at pickup". Black on white for paper.
// The same layout will feed a Bluetooth thermal printer later (DECISIONS backlog); no printer code here.
import { useEffect } from 'react';
import { CONFIG } from '../../config';
import { formatInr, type Order } from '../../contract';
import { bill, formatToken, istClock, useApp } from '../../store';
import s from './TokenSlip.module.css';

export function SlipBody({ o }: { o: Order }) {
  const stall = useApp((x) => x.folded.settings.stallName ?? 'Fair stall');
  const cash = o.payments.reduce((t, p) => t + p.cash, 0); const upi = o.payments.reduce((t, p) => t + p.upi, 0);
  return (
    <div className={s.slip} aria-label="Token slip">
      <div className={s.stall}>{stall}</div>
      <div className={s.tokLab}>Token</div>
      <div className={s.tok}>{formatToken(o.token, CONFIG.tokens.pad)}</div>
      <div className={s.meta}>{`${istClock(o.payments[0]?.at ?? o.createdAt)}${o.client ? ` · ${o.client}` : ''}`}</div>
      <ul className={s.lines}>{o.lines.map((l) => <li key={l.lineId}><span>{`${l.name}${l.qty > 1 ? ` ×${String(l.qty)}` : ''}`}</span><span>{formatInr(l.price * l.qty)}</span></li>)}</ul>
      <div className={s.total}><span>Total</span><span>{formatInr(bill.total(o))}</span></div>
      <div className={s.meta}>{cash && upi ? 'Paid · cash + UPI' : upi ? 'Paid · UPI' : cash ? 'Paid · cash' : 'Not paid yet'}</div>
      <div className={s.foot}>Show this at pickup</div>
    </div>
  );
}

/** Full-screen preview that prints itself once shown; closes after the print dialog. */
export function TokenSlipPrint({ o, onDone }: { o: Order; onDone: () => void }) {
  useEffect(() => {
    const after = () => { onDone(); };
    window.addEventListener('afterprint', after);
    const t = setTimeout(() => { window.print(); }, CONFIG.timings.printDelayMs);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', after); };
  }, [onDone]);
  return (
    <div className={s.preview} role="dialog" aria-label="Print token">
      <SlipBody o={o} />
      <button type="button" className={s.close} onClick={onDone}>Close</button>
    </div>
  );
}
