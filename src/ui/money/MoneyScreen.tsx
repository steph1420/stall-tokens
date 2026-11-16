// F-23..F-25 Money home (D-MONEY-HOME, Pos: no mockup; same list style as the Stall screens). Today: sales, spent, received,
// tips (own pot, D-MONEY), Refunds due from cancelled orders (Q-CANCEL-1 A), today's entries. Spent / Received open the entry.
import { useState } from 'react';
import { CONFIG } from '../../config';
import { formatInr } from '../../contract';
import { istClock, liveOrders, money, useApp } from '../../store';
import { Money } from '../kit/Money';
import { Section, StallPage } from '../stall/StallPage';
import st from '../stall/Stall.module.css';
import { MoneyEntry } from './MoneyEntry';
import s from './Money.module.css';

function RefundsDue() {
  const folded = useApp((x) => x.folded);
  const m = useApp((x) => x.money);
  const due = money.refundsDue(Object.values(folded.orders));
  if (!due.length) return null;
  return (
    <Section label="Refunds due">
      {due.map(({ order: o, due: d }) => (
        <div key={o.id} className={[st.row, st.wrap].join(' ')}>
          <span className={st.rowMain}><span className={st.rowT}>{`#${String(o.token).padStart(CONFIG.tokens.pad, '0')} cancelled`}</span>
            <span className={st.rowS}>{o.cancel?.reason || 'No reason given'}</span></span>
          <Money p={d} className={[st.amt, st.warn].join(' ')} />
          <span className={st.acts}>
            <button type="button" className={st.small} onClick={() => { m.refundCancelled(o.id, 'cash'); }}>Cash back</button>
            <button type="button" className={st.small} onClick={() => { m.refundCancelled(o.id, 'upi'); }}>UPI back</button>
          </span>
        </div>
      ))}
    </Section>
  );
}

function Entries({ dayId }: { dayId: string }) {
  const entries = useApp((x) => x.folded.entries.filter((e) => e.dayId === dayId));
  const people = useApp((x) => x.folded.people);
  const by = (e: (typeof entries)[number]) => e.parts.map((p) => (p.source === 'person' ? people[p.personId ?? '']?.name ?? 'Someone' : p.source === 'upi' ? 'UPI' : 'Register')).join(' + ');
  return (
    <Section label="Today">
      {entries.length === 0 ? <div className={st.empty}>Nothing spent or received yet.</div> : null}
      {[...entries].reverse().map((e) => (
        <div key={e.id} className={[st.row, e.voided ? st.muted : ''].join(' ')}>
          <span className={st.rowMain}><span className={st.rowT}>{e.label}{e.kind === 'donation' ? ' · donation' : ''}</span>
            <span className={st.rowS}>{`${istClock(e.at)} · ${e.dir === 'spent' ? 'paid by' : 'in'} ${by(e)}${e.voided ? ' · cancelled' : ''}`}</span></span>
          <span className={[st.amt, e.dir === 'spent' ? st.neg : st.pos].join(' ')}>{`${e.dir === 'spent' ? '−' : '+'}${formatInr(e.amount)}`}</span>
        </div>
      ))}
    </Section>
  );
}

export function MoneyScreen() {
  const folded = useApp((x) => x.folded);
  const [entry, setEntry] = useState<'spent' | 'received' | null>(null);
  const dayId = folded.days[folded.days.length - 1]?.id ?? '';
  const d = money.dayMoney(liveOrders(folded), folded.entries, dayId);
  if (entry) return <MoneyEntry start={entry} onClose={() => { setEntry(null); }} />;
  return (
    <StallPage title="Money" bar={<>
      <button type="button" className={s.barSpent} onClick={() => { setEntry('spent'); }}>Spent</button>
      <button type="button" className={s.barRecv} onClick={() => { setEntry('received'); }}>Received</button></>}>
      <div className={st.tiles}>
        <div className={st.tile}><span className={st.tileL}>Sales · cash</span><Money p={d.cashSales - d.refunds.cash} className={st.tileV} /></div>
        <div className={st.tile}><span className={st.tileL}>Sales · UPI</span><Money p={d.upiSales - d.refunds.upi} className={st.tileV} /></div>
        <div className={st.tile}><span className={st.tileL}>Spent</span><Money p={d.spent} className={st.tileV} /></div>
        <div className={st.tile}><span className={st.tileL}>{`Received${d.donations ? ` · incl. ${formatInr(d.donations)} donations` : ''}`}</span><Money p={d.received} className={st.tileV} /></div>
        <div className={st.tile}><span className={st.tileL}>Tips (own pot)</span><Money p={d.tips} className={st.tileV} /></div>
        <div className={st.tile}><span className={st.tileL}>Register by the book</span><Money p={d.registerFlow + Number(folded.settings[`float:${dayId}`] ?? 0)} className={st.tileV} /></div>
      </div>
      <RefundsDue />
      <Entries dayId={dayId} />
    </StallPage>
  );
}
