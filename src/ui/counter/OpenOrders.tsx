// F-05 / F-20 Open orders: one row per open order. Expanding a row shows its lines, each with its own inline
// Mark ready (Q-MARK-1 B, Q-COUNTER-FINISH), and a quiet Cancel order that opens a confirm sheet (Q-CANCEL-1 A).
// Interaction owner for the Open orders list (ARCHITECTURE §5).
import { useState } from 'react';
import { CONFIG } from '../../config';
import type { Line, Order } from '../../contract';
import { bill, formatToken, isOpen, kitchen, liveOrders, orderStatus, useApp } from '../../store';
import { Icon } from '../kit/Icon';
import { Money } from '../kit/Money';
import { Sheet } from '../kit/Sheet';
import kit from '../kit/kit.module.css';
import s from './Counter.module.css';

export function useOpenOrders() {
  const folded = useApp((st) => st.folded);
  const pages = useApp((st) => st.ui.pages);
  const cur = useApp((st) => st.ui.orderId);
  return liveOrders(folded).filter((o) => isOpen(o) || o.id === cur).map((o) => ({ o, status: orderStatus(o, pages[o.id]) }));
}

/** F-20 Q-KITCHEN-3 A: a Done? order opens as an amber row with Send back / Confirm; a Ready order offers Hand over. */
function KitchenStep({ o }: { o: Order }) {
  const k = useApp((st) => st.kitchen);
  const step = kitchen.counterStep(o);
  if (step === 'confirm') {
    return (
      <div className={s.oact}>
        <button type="button" className={s.abtnBack} onClick={() => { k.sendBack(o.id); }}>Send back</button>
        <button type="button" className={s.abtnGo} onClick={() => { k.confirmDone(o.id); }}>Confirm</button>
      </div>
    );
  }
  if (step === 'handover') return <div className={s.oact}><button type="button" className={s.abtnGo} onClick={() => { k.handOver(o.id); }}>Hand over</button></div>;
  return null;
}

const STATE: Partial<Record<Line['status'], string>> = {
  draft: 'Not sent', waiting: 'Waiting', held: 'On hold', paused: 'Paused', preparing: 'Preparing', 'done?': 'Done?', ready: 'Ready', handed: 'Handed over',
};
const lineState = (l: Line) => (l.byCounter && l.status === 'ready' ? 'Marked by counter' : STATE[l.status] ?? '');
const canMark = (l: Line) => l.status !== 'draft' && l.status !== 'handed' && !(l.status === 'ready' && l.byCounter);

/** Expanded card: each line with its own Mark ready; Cancel order at the foot. */
function OrderLines({ o }: { o: Order }) {
  const k = useApp((st) => st.kitchen);
  const openSheet = useApp((st) => st.openSheet);
  return (
    <div className={s.oexp}>
      {o.lines.filter((l) => l.qty > 0).map((l) => (
        <div key={l.lineId} className={s.oline}>
          <span className={s.olineName}>{`${String(l.qty)}× ${l.name}`}<small>{lineState(l)}</small></span>
          {canMark(l) ? <button type="button" className={s.oquiet} aria-label={`Mark ready: ${l.name}`} onClick={() => { k.finishLine(o.id, l.lineId); }}>Mark ready</button> : null}
        </div>
      ))}
      <button type="button" className={s.ocancel} onClick={() => { openSheet({ kind: 'cancel', orderId: o.id }); }}>Cancel order</button>
    </div>
  );
}

function OrderRow({ o, status, open, onToggle }: { o: Order; status: string; open: boolean; onToggle: () => void }) {
  const cur = useApp((st) => st.ui.orderId);
  const c = useApp((st) => st.counter);
  const step = kitchen.counterStep(o);
  const items = o.lines.filter((l) => l.qty > 0);
  return (
    <div className={step === 'confirm' ? s.ogroupAmber : s.ogroup}>
      <div className={s.orowWrap}>
        <button type="button" className={o.id === cur ? s.orowCur : s.orow} onClick={() => { c.selectOrder(o.id); }}>
          <span className={s.orowMain}>
            <span className={s.orowLine}><b>{formatToken(o.token, CONFIG.tokens.pad)}</b><span>{step === 'confirm' ? 'Done?' : status}</span></span>
            {open ? null : <span className={s.orowSum}>{items.length > 0 ? items.map((l) => `${String(l.qty)}× ${l.name}`).join(', ') : 'No items yet'}</span>}
          </span>
          <Money p={bill.total(o)} className={bill.due(o) > 0 && o.sent ? s.orowAmtDue : s.orowAmt} />
        </button>
        <button type="button" className={open ? s.oexpBtnOn : s.oexpBtn} aria-expanded={open} aria-label={`Lines of ${formatToken(o.token, CONFIG.tokens.pad)}`} onClick={onToggle}><Icon name="chevron" /></button>
      </div>
      {open ? <OrderLines o={o} /> : null}
      <KitchenStep o={o} />
    </div>
  );
}

export function OpenOrders() {
  const rows = useOpenOrders();
  const c = useApp((st) => st.counter);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <button type="button" className={s.olistScrim} aria-label="Close open orders" onClick={() => { c.toggleOrders(false); }} />
      <div className={s.olist} role="dialog" aria-label="Open orders">
        <div className={s.olistH}>Open orders</div>
        {rows.length === 0 ? <div className={s.orowSum}>No open orders</div> : null}
        {rows.map(({ o, status }) => <OrderRow key={o.id} o={o} status={status} open={open === o.id} onToggle={() => { setOpen(open === o.id ? null : o.id); }} />)}
      </div>
    </>
  );
}

/** Q-CANCEL-1 A: confirm sheet with an optional reason. Paid money is recorded as refund due (Money settles it later). */
export function CancelSheet() {
  const o = useApp((st) => (st.ui.sheet?.kind === 'cancel' ? st.folded.orders[st.ui.sheet.orderId] : undefined));
  return o ? <CancelBody key={o.id} o={o} /> : null;
}

function CancelBody({ o }: { o: Order }) {
  const close = useApp((st) => st.openSheet);
  const c = useApp((st) => st.counter);
  const [reason, setReason] = useState('');
  const paid = o.payments.reduce((t, p) => t + p.cash + p.upi, 0) - o.refunds.reduce((t, r) => t + r.amount, 0);
  return (
    <Sheet title={`Cancel ${formatToken(o.token, CONFIG.tokens.pad)}?`} onClose={() => { close(null); }}>
      <p className={kit.hint}>Kitchen and stations show it as Cancelled, then it drops off. Lines not started go back to stock.</p>
      {paid > 0 ? <p className={s.refundNote}><Money p={paid} /> paid · recorded as refund due for Money</p> : null}
      <label className={kit.field}>
        <span className={kit.fieldLab}>Reason (optional)</span>
        <input className={kit.input} value={reason} maxLength={CONFIG.limits.noteMaxChars} onChange={(e) => { setReason(e.target.value); }} />
      </label>
      <div className={kit.row}>
        <button type="button" className={[kit.quiet, kit.grow].join(' ')} onClick={() => { close(null); }}>Keep order</button>
        <button type="button" className={[kit.danger, kit.grow].join(' ')} onClick={() => { c.cancelOrder(o.id, reason); close(null); }}>Cancel order</button>
      </div>
    </Sheet>
  );
}
