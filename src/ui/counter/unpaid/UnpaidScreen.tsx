// s120 Unpaid tab (P2): every order with money still to collect, oldest first. Tap a row for the order view (s121).
import { CONFIG } from '../../../config';
import type { Order } from '../../../contract';
import { ago, bill, formatToken, liveOrders, orderStatus, unpaidOrders, useApp } from '../../../store';
import { Icon } from '../../kit/Icon';
import { Money } from '../../kit/Money';
import { useSecond } from '../TakeOver';
import s from './Unpaid.module.css';

const items = (o: Order) => o.lines.filter((l) => l.qty > 0).map((l) => `${String(l.qty)}× ${l.name}`).join(', ');


export function UnpaidScreen() {
  const folded = useApp((x) => x.folded);
  const open = useApp((x) => x.open);
  const now = useSecond();
  const list = unpaidOrders(liveOrders(folded)).sort((a, b) => a.createdAt - b.createdAt);
  const owed = list.reduce((t, o) => t + Math.max(0, bill.due(o)), 0);
  if (list.length === 0) return <main className={s.empty}><p><b>Nothing to collect</b></p><p>Every order is paid.</p></main>;
  return (
    <main className={s.page} aria-label="Unpaid orders">
      <div className={s.sum}><Money p={owed} className={s.sumAmt} /><span>{` to collect · ${String(list.length)} ${list.length === 1 ? 'order' : 'orders'}`}</span></div>
      <ul className={s.list}>
        {list.map((o) => (
          <li key={o.id}>
            <button type="button" className={s.row} onClick={() => { open.viewOrder(o.id); }}>
              <b className={s.tok}>{formatToken(o.token, CONFIG.tokens.pad)}</b>
              <span className={s.mid}><span className={s.who}>{o.client || items(o)}</span><small>{`${orderStatus(o, undefined)} · ${ago(o.createdAt, now)}`}</small></span>
              <Money p={bill.due(o)} className={s.amt} />
              <Icon name="next" />
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
