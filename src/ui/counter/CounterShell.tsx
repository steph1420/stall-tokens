// F-05 / F-43 Counter shell: top tabs New Orders | Open Orders (Q-ORDERS-1), then for New Orders the page tabs
// (Menu / Billing / Payment) and a single current-order line (Q-ORDERS-2 A: no chips row). Interaction owner for the header (§5).
import { CONFIG } from '../../config';
import { bill, draftOrders, formatToken, kitchen, liveOrders, orderStatus, unpaidOrders, useApp, type Page } from '../../store';
import { Icon } from '../kit/Icon';
import { BillingScreen } from './billing/BillingScreen';
import { CounterSheets } from './CounterSheets';
import { CancelSheet } from './CancelSheet';
import { MenuScreen } from './menu/MenuScreen';
import { OpenOrdersScreen } from './open/OpenOrdersScreen';
import { PaymentScreen } from './payment/PaymentScreen';
import { TakeOverCard, TakenBanner, useTakeOver } from './TakeOver';
import { OrderView } from './unpaid/OrderView';
import { UnpaidScreen } from './unpaid/UnpaidScreen';
import s from './Counter.module.css';

const PAGES: readonly { id: Page; label: string }[] = [{ id: 'menu', label: 'Menu' }, { id: 'billing', label: 'Billing' }, { id: 'payment', label: 'Payment' }];

function TopTabs() {
  const tab = useApp((st) => st.ui.counterTab);
  const n = useApp((st) => kitchen.openOrders(liveOrders(st.folded)).length);
  const u = useApp((st) => unpaidOrders(liveOrders(st.folded)).length);
  const o = useApp((st) => st.open);
  const T = (id: 'new' | 'open' | 'unpaid', label: string, badge: React.ReactNode) => (
    <button type="button" role="tab" aria-selected={tab === id} className={tab === id ? s.segOn : s.segBtn} onClick={() => { o.showTab(id); }}>{label}{badge}</button>
  );
  return (
    <div className={s.seg} role="tablist" aria-label="Counter" style={{ '--n': 3 } as React.CSSProperties}>
      {T('new', 'New Orders', null)}
      {T('open', 'Open Orders', n > 0 ? <i className={s.badge}>{n}</i> : null)}
      {T('unpaid', 'Unpaid', u > 0 ? <i className={s.badgeRed}>{u}</i> : null)}
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

/** The + and the Drafts pill. The paid screen has its own New order, so + hides there (one New order on screen). */
function HeaderEnd({ settled }: { settled: boolean }) {
  const c = useApp((st) => st.counter);
  const openSheet = useApp((st) => st.openSheet);
  const drafts = useApp((st) => draftOrders(liveOrders(st.folded)).filter((o) => o.id !== st.ui.orderId).length);
  return (
    <div className={s.hdrEnd}>
      {drafts > 0 ? <button type="button" className={s.drafts} onClick={() => { openSheet({ kind: 'drafts' }); }}>Drafts <b>{drafts}</b></button> : null}
      {settled ? null : <button type="button" className={s.btnAdd} aria-label="New order" onClick={() => { c.newOrder(); }}><Icon name="plus" /></button>}
    </div>
  );
}

function PageTabs({ page }: { page: Page }) {
  const c = useApp((st) => st.counter);
  const settled = useApp((st) => { const o = st.ui.orderId ? st.folded.orders[st.ui.orderId] : undefined; return !!o && page === 'payment' && bill.due(o) <= 0 && bill.paid(o) + bill.waived(o) > 0; });
  return (
    <>
      <div className={s.hdr}>
        <nav className={s.pages} aria-label="Pages">
          {PAGES.map((p) => (
            <button type="button" key={p.id} className={p.id === page ? s.ptabOn : s.ptab} aria-current={p.id === page ? 'page' : undefined}
              onClick={() => { c.setPage(p.id); }}>{p.label}</button>
          ))}
        </nav>
        <HeaderEnd settled={settled} />
      </div>
      <CurrentLine />
    </>
  );
}

function Body() {
  const orderId = useApp((st) => st.ui.orderId);
  const orderView = useApp((st) => st.ui.orderView);
  const tab = useApp((st) => st.ui.counterTab);
  const page = useApp((st) => (st.ui.orderId ? st.ui.pages[st.ui.orderId] : undefined) ?? 'menu');
  if (orderView) return <OrderView orderId={orderView} />;
  if (tab === 'open') return <OpenOrdersScreen />;
  if (tab === 'unpaid') return <UnpaidScreen />;
  return page === 'menu' || !orderId ? <MenuScreen /> : page === 'billing' ? <BillingScreen /> : <PaymentScreen key={orderId} />;
}

export function CounterShell() {
  const tab = useApp((st) => st.ui.counterTab);
  const orderView = useApp((st) => st.ui.orderView);
  const page = useApp((st) => (st.ui.orderId ? st.ui.pages[st.ui.orderId] : undefined) ?? 'menu');
  const stallName = useApp((st) => st.folded.settings.stallName ?? 'Fair stall');
  const openSheet = useApp((st) => st.openSheet);
  const take = useTakeOver();
  return (
    <div className={s.phone}>
      <header className={s.chrome}>
        <div className={s.hdrTop}>
          <div className={s.kicker}>{stallName}</div>
          <button type="button" className={s.btnMore} aria-label="More" onClick={() => { openSheet({ kind: 'more' }); }}><Icon name="more" /></button>
        </div>
        <TopTabs />
        {tab === 'new' && !orderView ? <PageTabs page={page} /> : null}
      </header>
      {take.kind === 'taken' ? <TakenBanner orderId={take.orderId} label={take.label} /> : null}
      <div className={s.body}>
        {/* s127: while another phone has the order, what is under the card cannot be tapped (the store refuses too). */}
        <div className={take.kind === 'none' ? s.body : s.locked} inert={take.kind !== 'none'}><Body /></div>
        {take.kind === 'wait' ? <TakeOverCard orderId={take.orderId} label={take.label} /> : null}
      </div>
      <CancelSheet />
      <CounterSheets />
    </div>
  );
}
