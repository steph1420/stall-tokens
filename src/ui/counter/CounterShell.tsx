// F-05 Counter shell: header (Menu / Billing / Payment), order strip, Open orders list, sheets.
// Interaction owner for the shared header (ARCHITECTURE §5).
import { useEffect, useRef } from 'react';
import { CONFIG } from '../../config';
import { formatToken, useApp, type Page } from '../../store';
import { Icon } from '../kit/Icon';
import { BillingScreen } from './billing/BillingScreen';
import { CounterSheets } from './CounterSheets';
import { CancelSheet, OpenOrders, useOpenOrders } from './OpenOrders';
import { MenuScreen } from './menu/MenuScreen';
import { PaymentScreen } from './payment/PaymentScreen';
import s from './Counter.module.css';

const PAGES: readonly { id: Page; label: string }[] = [{ id: 'menu', label: 'Menu' }, { id: 'billing', label: 'Billing' }, { id: 'payment', label: 'Payment' }];

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
      <CancelSheet />
      <CounterSheets />
    </div>
  );
}
