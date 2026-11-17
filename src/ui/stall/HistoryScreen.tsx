// F-33 History (21-polish2/history.html): per day, newest first, paid orders and money entries. Order rows show IST time ·
// how it was paid, Refunded / Edited / Cancelled tags; tap for a sheet with Edit (opens Billing), Refund and Hold to cancel order.
// Entry rows show "Paid by …" and −amount for Spent; their sheet has Hold to void.
import { useState } from 'react';
import { formatInr, type Entry, type Order } from '../../contract';
import { CONFIG } from '../../config';
import { bill, formatToken, istClock, useApp } from '../../store';
import { HoldButton } from '../kit/HoldButton';
import { Money } from '../kit/Money';
import { Sheet } from '../kit/Sheet';
import { StallPage } from './StallPage';
import s from './Stall.module.css';

type Row = { kind: 'order'; at: number; o: Order } | { kind: 'entry'; at: number; e: Entry };
const howPaid = (o: Order) => {
  const cash = o.payments.reduce((t, p) => t + p.cash, 0); const upi = o.payments.reduce((t, p) => t + p.upi, 0);
  return cash && upi ? 'Mixed' : upi ? 'UPI' : cash ? 'Register' : 'Not paid';
};

function OrderSheet({ o, onClose }: { o: Order; onClose: () => void }) {
  const a = useApp((x) => x);
  const refund = () => { a.go('counter'); a.open.editInBilling(o.id); a.openSheet({ kind: 'refund' }); };
  return (
    <Sheet label={`Order ${formatToken(o.token, CONFIG.tokens.pad)}`} onClose={onClose}>
      <p className={s.hsT}>{`Order ${formatToken(o.token, CONFIG.tokens.pad)} · ${formatInr(bill.total(o))}`}</p>
      <p className={s.hsS}>{o.lines.map((l) => (l.qty > 1 ? `${l.name} ×${String(l.qty)}` : l.name)).join(', ')}</p>
      {o.cancel ? <p className={s.hsS}>{`Cancelled${o.cancel.reason ? ` · ${o.cancel.reason}` : ''}`}</p> : (
        <>
          <div className={s.hsRow}>
            <button type="button" className={s.hsBtn} onClick={() => { a.go('counter'); a.open.editInBilling(o.id); }}>Edit</button>
            <button type="button" className={s.hsBtn} disabled={bill.due(o) >= 0} onClick={refund}>Refund</button>
          </div>
          <HoldButton label="Hold to cancel order" className={s.hsDanger} onConfirm={() => { a.counter.cancelOrder(o.id, 'From History'); onClose(); }}>Hold to cancel order</HoldButton>
        </>
      )}
    </Sheet>
  );
}

function EntrySheet({ e, onClose }: { e: Entry; onClose: () => void }) {
  const m = useApp((x) => x.money);
  return (
    <Sheet label={e.label} onClose={onClose}>
      <p className={s.hsT}>{`${e.label} · ${formatInr(e.amount)}`}</p>
      <p className={s.hsS}>{`${e.dir === 'spent' ? 'Spent' : 'Received'} at ${istClock(e.at)}${e.note ? ` · ${e.note}` : ''}`}</p>
      {e.voided === null ? <HoldButton label="Hold to void entry" className={s.hsDanger} onConfirm={() => { m.voidEntry(e.id, 'From History'); onClose(); }}>Hold to void entry</HoldButton> : null}
    </Sheet>
  );
}

export function HistoryScreen() {
  const f = useApp((x) => x.folded);
  const [pick, setPick] = useState<Row | null>(null);
  const who = (e: Entry) => { const p = e.parts.find((x) => x.source === 'person'); return e.parts.length > 1 ? 'Mixed' : p ? `Paid by ${f.people[p.personId ?? '']?.name ?? 'someone'}` : e.parts[0]?.source === 'upi' ? 'UPI' : 'Register'; };
  const today = f.days[f.days.length - 1]?.id;
  const days = [...f.days].reverse().map((d) => ({ d, rows: [
    ...Object.values(f.orders).filter((o) => !o.deleted && o.dayId === d.id && (o.payments.length > 0 || o.cancel)).map((o): Row => ({ kind: 'order', at: o.payments[0]?.at ?? o.createdAt, o })),
    ...f.entries.filter((e) => e.dayId === d.id).map((e): Row => ({ kind: 'entry', at: e.at, e })),
  ].sort((a, b) => b.at - a.at) })).filter((x) => x.rows.length);
  return (
    <StallPage title="History">
      {days.length === 0 ? <p className={s.empty}>Nothing yet. Paid orders and money entries show here.</p> : null}
      {days.map(({ d, rows }) => (
        <section key={d.id} className={s.hday}>
          <h2 className={s.hdayH}>{d.id === today ? 'Today' : d.label}</h2>
          {rows.map((r) => (r.kind === 'order' ? (
            <button type="button" key={r.o.id} className={[s.hrow, r.o.cancel ? s.hdim : ''].join(' ')} onClick={() => { setPick(r); }}>
              <span className={s.rowMain}><span className={s.hT}>{`Order ${formatToken(r.o.token, CONFIG.tokens.pad)}`}{r.o.cancel ? <em className={s.tagR}>Cancelled</em> : r.o.refunds.length ? <em className={s.tagW}>Refunded</em> : r.o.revision > 0 ? <em className={s.tagI}>Edited</em> : null}</span>
                <span className={s.rowS}>{`${istClock(r.at)} · ${r.o.revision > 0 ? 'edited' : howPaid(r.o)}`}</span></span>
              <Money p={bill.paid(r.o)} className={r.o.refunds.length ? s.hAmtQ : s.hAmt} />
            </button>
          ) : (
            <button type="button" key={r.e.id} className={[s.hrow, r.e.voided !== null ? s.hdim : ''].join(' ')} onClick={() => { setPick(r); }}>
              <span className={s.rowMain}><span className={s.hT}>{r.e.label}{r.e.voided !== null ? <em className={s.tagR}>Voided</em> : null}</span><span className={s.rowS}>{`${istClock(r.at)} · ${who(r.e)}`}</span></span>
              <span className={r.e.dir === 'spent' ? s.hNeg : s.hAmt}>{`${r.e.dir === 'spent' ? '−' : '+'}${formatInr(r.e.amount)}`}</span>
            </button>
          )))}
        </section>
      ))}
      {pick?.kind === 'order' ? <OrderSheet o={f.orders[pick.o.id] ?? pick.o} onClose={() => { setPick(null); }} /> : null}
      {pick?.kind === 'entry' ? <EntrySheet e={pick.e} onClose={() => { setPick(null); }} /> : null}
    </StallPage>
  );
}
