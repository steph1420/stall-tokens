// F-55 s121 / s122 order view (P2), opened from the Unpaid tab. Unpaid: Take payment, and the yellow hold bar to complete
// without payment (Q-COMPLETE-2 A, Q-HOLD-RING A). Paid: Refund in one tap (whole, same way it was paid, Undo toast),
// "Change lines, reason or note ›" for the Refund sheet, Reprint, and Complete.
import { CONFIG } from '../../../config';
import type { Order } from '../../../contract';
import { bill, completed, formatToken, istClock, useApp } from '../../../store';
import { HoldBar } from '../../kit/HoldBar';
import { Icon } from '../../kit/Icon';
import { Money } from '../../kit/Money';
import k from '../../kit/kit.module.css';
import s from './Unpaid.module.css';

export function OrderView({ orderId }: { orderId: string }) {
  const o = useApp((x) => x.folded.orders[orderId]);
  const back = useApp((x) => x.back);
  if (!o || o.deleted) return <main className={s.empty}><p><b>This order is gone</b></p><button type="button" className={k.quiet} onClick={() => { back(); }}>Back</button></main>;
  return <Body o={o} />;
}

function Lines({ o }: { o: Order }) {
  const due = bill.due(o);
  const paid = bill.held(o);
  return (
    <ul className={s.lines}>
      {o.lines.filter((l) => l.qty > 0).map((l) => <li key={l.lineId}><span>{`${String(l.qty)}× ${l.name}`}</span><Money p={bill.lineAmount(l)} /></li>)}
      <li className={s.tot}><span>Total</span><Money p={bill.total(o)} /></li>
      {paid > 0 ? <li><span>Paid</span><Money p={paid} /></li> : null}
      {due > 0 ? <li className={s.due}><span>To collect</span><Money p={due} /></li> : null}
      {o.complete?.unpaid ? <li className={s.note}><span>Completed without payment</span></li> : null}
      {o.cancel ? <li className={s.note}><span>{`Cancelled${o.cancel.reason ? ` · ${o.cancel.reason}` : ''}`}</span></li> : null}
    </ul>
  );
}

function Actions({ o }: { o: Order }) {
  const a = useApp((x) => x.open);
  const r = useApp((x) => x.refund);
  const sheet = useApp((x) => x.openSheet);
  const due = bill.due(o);
  const done = completed(o);
  return (
    <div className={s.acts}>
      {due > 0 && !o.cancel ? <button type="button" className={k.cta} onClick={() => { a.takePayment(o.id); }}>{`Take payment · ${formatToken(o.token, CONFIG.tokens.pad)}`}</button> : null}
      {due > 0 && o.sent && !done && !o.cancel ? (
        <HoldBar label="Complete without payment" sub="Press and hold · the amount stays on record" onConfirm={() => { a.completeUnpaid(o.id); }}
          onHint={() => { a.complete(o.id); }} />
      ) : null}
      {due <= 0 && o.sent && !done && !o.cancel ? <button type="button" className={k.cta} onClick={() => { a.complete(o.id); }}>Complete</button> : null}
      {bill.held(o) > 0 ? (
        <>
          <button type="button" className={k.danger} onClick={() => { r.quick(o.id); }}>Refund</button>
          <button type="button" className={s.link} onClick={() => { sheet({ kind: 'refundSheet', orderId: o.id }); }}>Change lines, reason or note ›</button>
        </>
      ) : null}
      <button type="button" className={k.quiet} onClick={() => { sheet({ kind: 'slip', orderId: o.id }); }}>Reprint token</button>
    </div>
  );
}

function Body({ o }: { o: Order }) {
  const back = useApp((x) => x.back);
  const meta = [o.client, istClock(o.createdAt), o.servedBy].filter(Boolean).join(' · ');
  return (
    <main className={s.view} aria-label={`Order ${formatToken(o.token, CONFIG.tokens.pad)}`}>
      <div className={s.vHead}>
        <button type="button" className={s.vBack} aria-label="Back" onClick={() => { back(); }}><Icon name="chevLeft" /></button>
        <div><b>{formatToken(o.token, CONFIG.tokens.pad)}</b><small>{meta}</small></div>
      </div>
      <Lines o={o} />
      {o.note ? <p className={s.vNote}>{o.note}</p> : null}
      <Actions o={o} />
    </main>
  );
}
