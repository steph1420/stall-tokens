// F-05 Counter shell: header (Menu / Billing / Payment), order strip, Open orders list, sheets.
// Interaction owner for the shared header (ARCHITECTURE §5).
import { useEffect, useRef } from 'react';
import { CONFIG } from '../../config';
import type { Order } from '../../contract';
import { bill, formatToken, isOpen, kitchen, liveOrders, orderStatus, useApp, type Page } from '../../store';
import { Icon } from '../kit/Icon';
import { Money } from '../kit/Money';
import { Sheet } from '../kit/Sheet';
import kit from '../kit/kit.module.css';
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

/** F-20 Q-KITCHEN-3 A: a Done? order opens as an amber row with Send back / Confirm; a Ready order offers Hand over. */
const finishable = (o: Order) => o.lines.some((l) => l.qty > 0 && l.status !== 'draft' && l.status !== 'handed' && !(l.status === 'ready' && l.byCounter));

function KitchenStep({ o }: { o: Order }) {
  const k = useApp((st) => st.kitchen);
  const openSheet = useApp((st) => st.openSheet);
  const step = kitchen.counterStep(o);
  const mark = finishable(o) ? <button type="button" className={s.oquiet} onClick={() => { openSheet({ kind: 'finish', orderId: o.id }); }}>Mark ready</button> : null;
  if (step === 'confirm') {
    return (
      <div className={s.oact}>
        <button type="button" className={s.abtnBack} onClick={() => { k.sendBack(o.id); }}>Send back</button>
        <button type="button" className={s.abtnGo} onClick={() => { k.confirmDone(o.id); }}>Confirm</button>
      </div>
    );
  }
  if (step === 'handover') {
    return <div className={s.oact}>{mark}<button type="button" className={s.abtnGo} onClick={() => { k.handOver(o.id); }}>Hand over</button></div>;
  }
  return mark ? <div className={s.oact}>{mark}</div> : null;
}

/** Q-COUNTER-FINISH: the Counter marks any sent line finished, whatever the kitchen status; it goes to Ready. */
function FinishSheet() {
  const sheet = useApp((st) => st.ui.sheet);
  const o = useApp((st) => (st.ui.sheet?.kind === 'finish' ? st.folded.orders[st.ui.sheet.orderId] : undefined));
  const k = useApp((st) => st.kitchen);
  const close = useApp((st) => st.openSheet);
  if (sheet?.kind !== 'finish' || !o) return null;
  const lines = o.lines.filter((l) => l.qty > 0 && l.status !== 'draft');
  return (
    <Sheet title={`${formatToken(o.token, CONFIG.tokens.pad)} · Mark ready`} onClose={() => { close(null); }}>
      <ul className={kit.list}>
        {lines.map((l) => {
          const done = l.status === 'handed' || (l.status === 'ready' && l.byCounter);
          return (
            <li key={l.lineId} className={kit.listRow}>
              <span className={kit.grow}>{`${String(l.qty)}× ${l.name}`} <small>{l.status === 'handed' ? 'Handed over' : l.byCounter && l.status === 'ready' ? 'Marked by counter' : l.status === 'ready' ? 'Ready' : ''}</small></span>
              {done ? null : <button type="button" className={s.oquiet} onClick={() => { k.finishLine(o.id, l.lineId); }}>Mark ready</button>}
            </li>
          );
        })}
      </ul>
    </Sheet>
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
          <div key={o.id} className={kitchen.counterStep(o) === 'confirm' ? s.ogroupAmber : s.ogroup}>
          <button type="button" className={o.id === cur ? s.orowCur : s.orow} onClick={() => { c.selectOrder(o.id); }}>
            <span className={s.orowMain}>
              <span className={s.orowLine}><b>{formatToken(o.token, CONFIG.tokens.pad)}</b><span>{kitchen.counterStep(o) === 'confirm' ? 'Done?' : status}</span></span>
              <span className={s.orowSum}>{o.lines.some((l) => l.qty > 0) ? o.lines.filter((l) => l.qty > 0).map((l) => `${String(l.qty)}× ${l.name}`).join(', ') : 'No items yet'}</span>
            </span>
            <Money p={bill.total(o)} className={bill.due(o) > 0 && o.sent ? s.orowAmtDue : s.orowAmt} />
          </button>
          <KitchenStep o={o} />
          </div>
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
      <FinishSheet />
      <CounterSheets />
    </div>
  );
}
