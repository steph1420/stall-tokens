// F-05 / F-43 Counter shell: top tabs New Orders | Open Orders (Q-ORDERS-1), then for New Orders the page tabs
// (Menu / Billing / Payment) and a single current-order line (Q-ORDERS-2 A: no chips row). Interaction owner for the header (§5).
import { CONFIG } from '../../config';
import { formatToken, kitchen, liveOrders, orderStatus, useApp, type Page } from '../../store';
import { Icon } from '../kit/Icon';
import { BillingScreen } from './billing/BillingScreen';
import { CounterSheets } from './CounterSheets';
import { CancelSheet } from './CancelSheet';
import { MenuScreen } from './menu/MenuScreen';
import { OpenOrdersScreen } from './open/OpenOrdersScreen';
import { PaymentScreen } from './payment/PaymentScreen';
import s from './Counter.module.css';

const PAGES: readonly { id: Page; label: string }[] = [{ id: 'menu', label: 'Menu' }, { id: 'billing', label: 'Billing' }, { id: 'payment', label: 'Payment' }];

function TopTabs() {
  const tab = useApp((st) => st.ui.counterTab);
  const n = useApp((st) => kitchen.openOrders(liveOrders(st.folded)).length);
  const o = useApp((st) => st.open);
  return (
    <div className={s.seg} role="tablist" aria-label="Counter">
      <button type="button" role="tab" aria-selected={tab === 'new'} className={tab === 'new' ? s.segOn : s.segBtn} onClick={() => { o.showTab('new'); }}>New Orders</button>
      <button type="button" role="tab" aria-selected={tab === 'open'} className={tab === 'open' ? s.segOn : s.segBtn} onClick={() => { o.showTab('open'); }}>
        Open Orders{n > 0 ? <i className={s.badge}>{n}</i> : null}
      </button>
    </div>
  );
}

/** Q-ORDERS-2 A: one quiet line for the order being built, instead of the chips row. */
function CurrentLine() {
  const o = useApp((st) => (st.ui.orderId ? st.folded.orders[st.ui.orderId] : undefined));
  const page = useApp((st) => (st.ui.orderId ? st.ui.pages[st.ui.orderId] : undefined));
  if (!o || o.deleted || o.cancel) return <div className={s.cur}>Tap an item to start an order</div>;
  const n = o.lines.filter((l) => l.qty > 0).reduce((t, l) => t + l.qty, 0);
  const status = orderStatus(o, page);
  return (
    <div className={s.cur}><b>{formatToken(o.token, CONFIG.tokens.pad)}</b>{` · ${status === 'New' || status === 'Editing' ? 'new order' : status.toLowerCase()} · ${String(n)} ${n === 1 ? 'item' : 'items'}`}</div>
  );
}

export function CounterShell() {
  const orderId = useApp((st) => st.ui.orderId);
  const tab = useApp((st) => st.ui.counterTab);
  const page = useApp((st) => (st.ui.orderId ? st.ui.pages[st.ui.orderId] : undefined) ?? 'menu');
  const stallName = useApp((st) => st.folded.settings.stallName ?? 'Fair stall');
  const c = useApp((st) => st.counter);
  const openSheet = useApp((st) => st.openSheet);
  return (
    <div className={s.phone}>
      <header className={s.chrome}>
        <div className={s.hdrTop}>
          <div className={s.kicker}>{stallName}</div>
          <button type="button" className={s.btnMore} aria-label="More" onClick={() => { openSheet({ kind: 'more' }); }}><Icon name="more" /></button>
        </div>
        <TopTabs />
        {tab === 'new' ? (
          <>
            <div className={s.hdr}>
              <nav className={s.pages} aria-label="Pages">
                {PAGES.map((p) => (
                  <button type="button" key={p.id} className={p.id === page ? s.ptabOn : s.ptab} aria-current={p.id === page ? 'page' : undefined}
                    onClick={() => { c.setPage(p.id); }}>{p.label}</button>
                ))}
              </nav>
              <button type="button" className={s.btnAdd} aria-label="New order" onClick={() => { c.newOrder(); }}><Icon name="plus" /></button>
            </div>
            <CurrentLine />
          </>
        ) : null}
      </header>
      {tab === 'open' ? <OpenOrdersScreen />
        : page === 'menu' || !orderId ? <MenuScreen /> : page === 'billing' ? <BillingScreen /> : <PaymentScreen key={orderId} />}
      <CancelSheet />
      <CounterSheets />
    </div>
  );
}
