// F-30 Stock (21-polish2/stock.html; Q-STOCK-SET): search, navrail of categories + Low · n + Sold out, rows with counts
// (amber when low, dimmed Sold out at zero); tap a row for −/+. Paste stock opens the paste sheet (F-31).
import { useState } from 'react';
import type { Item } from '../../contract';
import { stock, useApp } from '../../store';
import { StallPage } from '../stall/StallPage';
import { PasteSheet } from './PasteSheet';
import s from './Stock.module.css';

type Rail = { kind: 'cat'; name: string } | { kind: 'low' } | { kind: 'out' };

function Row({ it, open, onOpen }: { it: Item; open: boolean; onOpen: () => void }) {
  const a = useApp((x) => x.stock);
  const lv = stock.level(it);
  const dot = { '--c': `var(--dl-stall-swatch-${String(it.swatch)})` } as React.CSSProperties;
  return (
    <div className={[s.row, open ? s.rowOpen : '', lv === 'out' ? s.out : ''].join(' ')}>
      <button type="button" className={s.rowTap} aria-expanded={open} onClick={onOpen}>
        <span className={s.dot} style={dot} aria-hidden="true" />
        <span className={s.name}>{it.name}</span>
      </button>
      {open ? (
        <span className={s.stepper}>
          <button type="button" aria-label={`Less ${it.name}`} onClick={() => { a.step(it.id, -1); }}>−</button>
          <b className={lv === 'low' ? s.low : undefined}>{it.count ?? '–'}</b>
          <button type="button" aria-label={`More ${it.name}`} onClick={() => { a.step(it.id, 1); }}>+</button>
        </span>
      ) : <b className={lv === 'low' ? s.low : lv === 'out' ? s.soldOut : lv === 'none' ? s.none : s.count}>{lv === 'out' ? 'Sold out' : lv === 'none' ? 'Not counted' : `${String(it.count)}${it.unit ? ` ${it.unit}` : ''}`}</b>}
    </div>
  );
}

export function StockScreen() {
  const all = useApp((x) => Object.values(x.folded.items).filter((i) => !i.removed).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)));
  const cats = [...new Set(all.map((i) => i.category || 'Other'))];
  const [rail, setRail] = useState<Rail>({ kind: 'cat', name: cats[0] ?? '' });
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [paste, setPaste] = useState(false);
  const low = all.filter((i) => stock.level(i) === 'low');
  const out = all.filter((i) => stock.level(i) === 'out');
  const shown = q.trim() ? all.filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase()))
    : rail.kind === 'low' ? low : rail.kind === 'out' ? out : all.filter((i) => (i.category || 'Other') === rail.name);
  const on = (r: Rail) => !q.trim() && r.kind === rail.kind && (r.kind !== 'cat' || rail.kind !== 'cat' || r.name === rail.name);
  const railBtn = (r: Rail, icon: string, label: string) => (
    <button type="button" key={label} role="tab" aria-selected={on(r)} className={on(r) ? s.railOn : s.rail} onClick={() => { setRail(r); setQ(''); }}>
      <span className={s.railIcon} aria-hidden="true">{icon}</span><span>{label}</span>
    </button>
  );
  return (
    <StallPage title="Stock" right={<button type="button" className={s.pBtn} onClick={() => { setPaste(true); }}>📋 Paste</button>}>
      <input className={s.search} aria-label="Search items" placeholder="Search items" value={q} onChange={(e) => { setQ(e.target.value); }} />
      <div className={s.split}>
        <nav className={s.rails} role="tablist" aria-label="Categories">
          {cats.map((c) => railBtn({ kind: 'cat', name: c }, c.slice(0, 1).toUpperCase(), c))}
          {railBtn({ kind: 'low' }, '⚠️', `Low · ${String(low.length)}`)}
          {railBtn({ kind: 'out' }, '⛔', 'Sold out')}
        </nav>
        <div className={s.list}>
          {shown.length === 0 ? <p className={s.empty}>{q ? 'No item by that name.' : 'Nothing here.'}</p> : null}
          {shown.map((it) => <Row key={it.id} it={it} open={open === it.id} onOpen={() => { setOpen(open === it.id ? null : it.id); }} />)}
          <button type="button" className={s.add} onClick={() => { setPaste(true); }}>+ Add item</button>
        </div>
      </div>
      {paste ? <PasteSheet onClose={() => { setPaste(false); }} /> : null}
    </StallPage>
  );
}
