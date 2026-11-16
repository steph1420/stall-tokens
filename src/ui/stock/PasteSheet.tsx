// F-31 Paste stock (21-polish2/stockpaste.html; Q-STOCK-SET, Q-PASTE-1 A): paste box, format hint, "Will add" preview
// (+qty unit, paid, discount, New item; unclear lines amber), Paid by, and one button: Add n · Spent ₹total.
import { useState } from 'react';
import { formatInr, type MoneyPart } from '../../contract';
import { stock, useApp } from '../../store';
import { Sheet } from '../kit/Sheet';
import { PaidBySheet, modeOf } from '../money/PaidBySheet';
import s from './Stock.module.css';

const MODE_LABEL = { register: '🧾 Register', upi: '📱 UPI', person: '👤 Personal', mixed: '🔀 Mixed' } as const;

function Preview({ lines }: { lines: readonly stock.PasteLine[] }) {
  const items = useApp((x) => Object.values(x.folded.items));
  return (
    <ul className={s.will} aria-label="Will add">
      {lines.map((l, i) => (
        <li key={`${String(i)}${l.raw}`} className={l.ok ? s.wl : s.wlBad}>
          <span className={s.wlMain}>
            <span className={s.wlName}>{l.ok ? l.name : l.raw}{l.ok && !stock.matchItem(items, l.name) ? <em className={s.newTag}>New item</em> : null}</span>
            <small>{l.ok ? [`Paid ${formatInr(l.paid)}`, l.discount ? (l.discount.kind === 'pct' ? `${String(l.discount.value)}% discount` : `${formatInr(l.discount.value * 100)} discount`) : ''].filter(Boolean).join(' · ') : 'Not clear · check name, qty and price'}</small>
          </span>
          {l.ok ? <b className={s.plus}>{`+${String(l.qty)}${l.unit ? ` ${l.unit}` : ''}`}</b> : null}
        </li>
      ))}
    </ul>
  );
}

export function PasteSheet({ onClose }: { onClose: () => void }) {
  const a = useApp((x) => x.stock);
  const toast = useApp((x) => x.money.toast);
  const [text, setText] = useState('');
  const [parts, setParts] = useState<MoneyPart[]>([{ source: 'register', personId: null, amount: 0 }]);
  const [paidBy, setPaidBy] = useState(false);
  const lines = stock.parsePaste(text);
  const ok = lines.filter((l) => l.ok);
  const total = stock.pasteTotal(lines);
  const fit = parts.length === 1 ? parts.map((p) => ({ ...p, amount: total })) : parts;
  const pasteIn = () => { void navigator.clipboard.readText().then((t) => { setText(t); }, () => { toast('Paste into the box with a long press'); }); };
  const save = () => { const err = a.paste(lines, fit); if (err) toast(err); else { toast(`Added ${String(ok.length)} to stock`); onClose(); } };
  return (
    <Sheet label="Paste stock" onClose={onClose}>
      <div className={s.pHead}><b>Paste stock</b><button type="button" className={s.pBtn} onClick={pasteIn}>📋 Paste</button></div>
      <textarea spellCheck={false} className={s.box} aria-label="Pasted stock" rows={4} value={text} placeholder={'Straw - 2 pcs - 100 - 20\nCups 60off 6pkt 450rs'} onChange={(e) => { setText(e.target.value); }} />
      <p className={s.hint}>Name - qty - price paid - discount. Labels like 2pcs, 60off, 10%, 100rs work in any order.</p>
      {lines.length ? <><p className={s.willH}>Will add</p><Preview lines={lines} /></> : null}
      <button type="button" className={s.paidBy} onClick={() => { setPaidBy(true); }}><span>Paid by</span><b>{`${MODE_LABEL[modeOf(parts)]} ›`}</b></button>
      <button type="button" className={s.addGo} disabled={!ok.length} onClick={save}>{ok.length ? `Add ${String(ok.length)} · Spent ${formatInr(total)}` : 'Add'}</button>
      {paidBy ? <PaidBySheet title="Paid by" parts={fit} amount={total} onChange={setParts} onClose={() => { setPaidBy(false); }} /> : null}
    </Sheet>
  );
}
