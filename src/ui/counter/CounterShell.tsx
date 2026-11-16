// F-05 Counter shell: header (Menu / Billing / Payment), order strip, Open orders list, sheets.
// Interaction owner for the shared header (ARCHITECTURE §5).
import { useEffect, useRef } from 'react';
import { CONFIG } from '../../config';
import { bill, formatToken, isOpen, liveOrders, orderStatus, useApp, type Page } from '../../store';
import { Icon } from '../kit/Icon';
import { Money } from '../kit/Money';
import { BillingScreen } from './billing/BillingScreen';
import { CounterSheets } from './CounterSheets';
import { MenuScreen } from './menu/MenuScreen';
import { PaymentScreen } from './payment/PaymentScreen';
import s from './Counter.module.css';

const PAGES: readonly { id: Page; label: string }[] = [{ id: 'menu', label: 'Menu' }, { id: 'billing', label: 'Billing' }, { id: 'payment', label: 'Payment' }];

function useOpenOrders() {
  const folded = useApp((st) => st.folded);
  const pages = useApp((st) => st.ui.pages);
  const cur = useApp((st) => st.ui.orderId);
  return liveOrders(folded).filter((o) => isOpen(o) || o.id === cur).map((o) => ({ o, status: orderStatus(o, pages[o.id]) }));
}

function Strip() {
  const rows = useOpenOrders();
  const cur = useApp((st) => st.ui.orderId);
  const c = useApp((st) => st.counter);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector('[data-on="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [cur, rows.length]);
  return (
    <div className={s.switcher}>
      <div className={s.track} ref={ref} role="tablist" aria-label="Open orders">
        {rows.map(({ o, status }) => (
          <button type="button" role="tab" key={o.id} aria-selected={o.id === cur} data-on={o.id === cur}
            className={o.id === cur ? s.tabOn : s.tab}
            onClick={() => { if (o.id === cur) c.toggleOrders(); else c.selectOrder(o.id); }}>
            <span className={s.pill}><b>{formatToken(o.token, CONFIG.tokens.pad)}</b> {status}</span>
          </button>
        ))}
        <button type="button" className={s.tabAdd} aria-label="New order" onClick={() => { c.newOrder(); }}><span className={s.pill}>+</span></button>
      </div>
    </div>
  );
}

function OpenOrders() {
  const rows = useOpenOrders();
  const cur = useApp((st) => st.ui.orderId);
  const c = useApp((st) => st.counter);
  return (
    <>
      <button type="button" className={s.olistScrim} aria-label="Close open orders" onClick={() => { c.toggleOrders(false); }} />
      <div className={s.olist} role="dialog" aria-label="Open orders">
        <div className={s.olistH}>Open orders</div>
        {rows.length === 0 ? <div className={s.orowSum}>No open orders</div> : null}
        {rows.map(({ o, status }) => (
          <button type="button" key={o.id} className={o.id === cur ? s.orowCur : s.orow} onClick={() => { c.selectOrder(o.id); }}>
            <span className={s.orowMain}>
              <span className={s.orowLine}><b>{formatToken(o.token, CONFIG.tokens.pad)}</b><span>{status}</span></span>
              <span className={s.orowSum}>{o.lines.some((l) => l.qty > 0) ? o.lines.filter((l) => l.qty > 0).map((l) => `${String(l.qty)}× ${l.name}`).join(', ') : 'No items yet'}</span>
            </span>
            <Money p={bill.total(o)} className={bill.due(o) > 0 && o.sent ? s.orowAmtDue : s.orowAmt} />
          </button>
        ))}
      </div>
    </>
  );
}

export function CounterShell() {
  const orderId = useApp((st) => st.ui.orderId);
  const page = useApp((st) => (st.ui.orderId ? st.ui.pages[st.ui.orderId] : undefined) ?? 'menu');
  const olist = useApp((st) => st.ui.olist);
  const stallName = useApp((st) => st.folded.settings.stallName ?? 'Fair stall');
  const c = useApp((st) => st.counter);
  const openSheet = useApp((st) => st.openSheet);
  return (
    <div className={s.phone}>
      <header className={s.chrome}>
        <div className={s.hdr}>
          <div className={s.kicker}>{stallName}</div>
          <nav className={s.pages} aria-label="Pages">
            {PAGES.map((p) => (
              <button type="button" key={p.id} className={p.id === page ? s.ptabOn : s.ptab} aria-current={p.id === page ? 'page' : undefined}
                onClick={() => { c.setPage(p.id); }}>{p.label}</button>
            ))}
          </nav>
          <div className={s.hdrBtns}>
            <button type="button" className={s.btnMore} aria-label="More" onClick={() => { openSheet({ kind: 'more' }); }}><Icon name="more" /></button>
            <button type="button" className={s.btnAdd} aria-label="New order" onClick={() => { c.newOrder(); }}><Icon name="plus" /></button>
          </div>
        </div>
        <Strip />
      </header>
      {page === 'menu' || !orderId ? <MenuScreen /> : page === 'billing' ? <BillingScreen /> : <PaymentScreen key={orderId} />}
      {olist ? <OpenOrders /> : null}
      <CounterSheets />
    </div>
  );
}
