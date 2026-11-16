// F-06 Menu (20-polish/menu.html p2): price fixed under the name, stepper zone at the bottom, equal heights.
// Tap = +1, press-and-hold = stock panel (F-08), pencil = item note. Stock badge from Q-STOCK-SET.
import type { Item } from '../../../contract';
import { bill, useApp } from '../../../store';
import { Icon } from '../../kit/Icon';
import { usePress } from '../../kit/hold';
import { Money } from '../../kit/Money';
import s from './Menu.module.css';

function stockLabel(it: Item, left: number): { text: string; tone: 'quiet' | 'low' | 'out' } | null {
  if (it.soldOut || (it.count !== null && left <= 0)) return { text: 'Sold out', tone: 'out' };
  if (it.count === null) return null;
  return { text: `${String(Math.max(0, left))} left`, tone: left <= it.lowAt ? 'low' : 'quiet' };
}

function Card({ it }: { it: Item }) {
  const c = useApp((st) => st.counter);
  const openSheet = useApp((st) => st.openSheet);
  const lines = useApp((st) => (st.ui.orderId ? st.folded.orders[st.ui.orderId]?.lines : undefined)) ?? [];
  const mine = lines.filter((l) => l.itemId === it.id);
  const qty = mine.reduce((n, l) => n + l.qty, 0);
  const note = [...mine].reverse().find((l) => l.status === 'draft' && l.note)?.note ?? mine.find((l) => l.note)?.note ?? '';
  const left = useApp((st) => (it.count === null ? Number.POSITIVE_INFINITY : st.counter.available(it.id)));
  const badge = stockLabel(it, left);
  const out = badge?.tone === 'out';
  const press = usePress(() => { c.addItem(it.id); }, () => { openSheet({ kind: 'stock', itemId: it.id }); });
  const noteLine = [...mine].reverse().find((l) => l.status === 'draft') ?? mine[mine.length - 1];
  const cls = [s.card, qty > 0 ? s.isIn : '', out ? s.isOut : ''].join(' ');
  return (
    <article className={cls} style={{ '--item-accent': `var(--dl-stall-swatch-${String(it.swatch)})` } as React.CSSProperties}>
      <div role="button" tabIndex={0} className={s.hit} aria-label={`${it.name}, add one${badge ? `, ${badge.text}` : ''}`} {...press} />
      <span className={s.accent} />
      <div className={s.name}>{it.name}</div>
      {badge && qty === 0 ? <div className={badge.tone === 'low' ? s.stockLow : badge.tone === 'out' ? s.stockOut : s.stock}>{badge.text}</div> : null}
      {qty > 0 && noteLine ? (
        <button type="button" className={note ? s.pencilHas : s.pencil} aria-label={note ? 'Edit note' : 'Add note'}
          onClick={() => { openSheet({ kind: 'lineNote', lineId: noteLine.lineId }); }}><Icon name="pencil" /></button>
      ) : null}
      <Money p={it.price} className={s.price} />
      {note ? <div className={s.snippet}>{note}</div> : null}
      {qty > 0 ? (
        <div className={s.qty}>
          <button type="button" className={s.qb} aria-label={`One less ${it.name}`} onClick={() => { c.removeItem(it.id); }}>−</button>
          <span className={s.qn} aria-live="polite">{qty}</span>
          <button type="button" className={s.qb} aria-label={`One more ${it.name}`} onClick={() => { c.addItem(it.id); }}>+</button>
        </div>
      ) : null}
    </article>
  );
}

export function MenuScreen() {
  const folded = useApp((st) => st.folded);
  const order = useApp((st) => (st.ui.orderId ? st.folded.orders[st.ui.orderId] : undefined));
  const c = useApp((st) => st.counter);
  const openSheet = useApp((st) => st.openSheet);
  const items = Object.values(folded.items).filter((i) => !i.removed).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const count = order?.lines.reduce((n, l) => n + l.qty, 0) ?? 0;
  return (
    <>
      <main className={s.grid}>
        {items.map((it) => <Card key={it.id} it={it} />)}
        <button type="button" className={s.add} onClick={() => { openSheet({ kind: 'item', itemId: null }); }}>
          <span className={s.plus}><Icon name="plusBig" /></span><span className={s.addLabel}>Add item</span>
        </button>
      </main>
      <footer className={s.bar}>
        <div className={s.meta}>
          <Money p={order ? bill.subtotal(order) : 0} className={s.total} />
          <span className={s.count}>· {count} {count === 1 ? 'item' : 'items'}</span>
        </div>
        <button type="button" className={s.next} onClick={() => { c.setPage('billing'); }} disabled={count === 0}>Billing <Icon name="next" className={s.nextIcon} /></button>
      </footer>
    </>
  );
}
