// F-14..F-17, F-62 Payment (20-polish/payment.html p1; pay2 locked 17 Nov: + Tip / − Waive, cash given). Manual UPI confirm (Q-UPI-1 A).
import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../../../config';
import type { Order, Paise } from '../../../contract';
import { bill, formatToken, pay, upiLink, useApp } from '../../../store';
import { buzz } from '../../kit/haptics';
import { Icon } from '../../kit/Icon';
import { Money } from '../../kit/Money';
import { Qr } from '../../kit/Qr';
import { Sheet } from '../../kit/Sheet';
import k from '../../kit/kit.module.css';
import { Numpad } from './Numpad';
import { AdjustRow, CountNotes, GivenRow } from './parts';
import s from './Payment.module.css';

type Box = 'cash' | 'upi' | 'tip' | 'waive';
const R = CONFIG.money.paisePerRupee;

function Slider({ split, covered, onSlide }: { split: pay.Split; covered: Paise; onSlide: (f: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const f = covered > 0 ? split.cash / covered : 0;
  const upiF = covered > 0 ? split.upi / covered : 0;
  const move = (x: number) => { const r = ref.current?.getBoundingClientRect(); if (r && r.width > 0) onSlide((x - r.left) / r.width); };
  const step = CONFIG.money.sliderSnapPaise / Math.max(covered, 1);
  return (
    <>
      <div className={s.track} ref={ref} role="slider" tabIndex={0} aria-label="Cash and UPI split" aria-valuemin={0} aria-valuemax={covered / R} aria-valuenow={split.cash / R}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX); }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e.clientX); }}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') onSlide(f - step); if (e.key === 'ArrowRight') onSlide(f + step); }}>
        <div className={s.trackIn}>
          <div className={s.fillCash} style={{ width: `${String(f * 100)}%` }} />
          <div className={s.fillUpi} style={{ left: `${String(f * 100)}%`, width: `${String(upiF * 100)}%` }} />
        </div>
        <div className={s.thumb} style={{ left: `${String(f * 100)}%` }} />
      </div>
      <div className={s.ticks} aria-hidden="true">{Array.from({ length: 19 }, (_, i) => <i key={i} className={i % 5 === 0 || i === 18 ? s.maj : undefined} />)}</div>
      <div className={s.tickLabs} aria-hidden="true">
        <span className={s.t0}>₹0</span>
        {f > CONFIG.payment.sliderLabelEdge && f < 1 - CONFIG.payment.sliderLabelEdge ? <span className={s.tMid} style={{ left: `${String(f * 100)}%` }}>{`₹${(split.cash / R).toLocaleString('en-IN')}`}</span> : null}
        <span className={s.tEnd}>{`₹${(covered / R).toLocaleString('en-IN')}`}</span>
      </div>
    </>
  );
}

function Settled({ o }: { o: Order }) {
  const c = useApp((st) => st.counter);
  const openSheet = useApp((st) => st.openSheet);
  return (
    <>
      <main className={s.stage}>
        <div className={s.due}>
          <div className={s.dueLab}>{formatToken(o.token, CONFIG.tokens.pad)} · {bill.due(o) < 0 ? 'Refund owed' : 'Paid'}</div>
          <Money p={bill.due(o) < 0 ? -bill.due(o) : bill.paid(o) + bill.tips(o)} className={s.dueAmt} />
          {bill.tips(o) > 0 ? <div className={s.tipNote}>incl. <Money p={bill.tips(o)} /> tip</div> : null}
          <button type="button" className={s.printBtn} onClick={() => { openSheet({ kind: 'slip', orderId: o.id }); }}>Print token</button>
        </div>
      </main>
      <footer className={s.bar}>
        <button type="button" className={s.back} onClick={() => { c.setPage('billing'); }}><Icon name="backSmall" className={s.ic} />Back</button>
        <span className={s.paid}>{bill.due(o) < 0 ? '' : 'Paid ✓'}</span>
        <button type="button" className={s.confirm} onClick={() => { c.newOrder(); }}>New order</button>
      </footer>
    </>
  );
}

/** A ₹0 order (free items or a full discount): nothing to collect, so offer To kitchen instead of a stuck Confirm. */
function NothingDue({ o }: { o: Order }) {
  const c = useApp((st) => st.counter);
  const unsent = o.lines.some((l) => l.status === 'draft' && l.qty > 0);
  return (
    <>
      <main className={s.stage}>
        <div className={s.due}>
          <div className={s.dueLab}>{formatToken(o.token, CONFIG.tokens.pad)} · Nothing to collect</div>
          <Money p={0} className={s.dueAmt} />
        </div>
      </main>
      <footer className={s.bar}>
        <button type="button" className={s.back} onClick={() => { c.setPage('billing'); }}><Icon name="backSmall" className={s.ic} />Back</button>
        <span className={s.paid} />
        {unsent
          ? <button type="button" className={s.confirm} onClick={() => { c.sendToKitchen(); }}>To kitchen</button>
          : <button type="button" className={s.confirm} onClick={() => { c.newOrder(); }}>New order</button>}
      </footer>
    </>
  );
}

/** The payment draft is local to this screen (never in the log until Confirm). */
function useDraft(o: Order | undefined) {
  const servingName = useApp((st) => st.prefs.servingName);
  const due0 = o ? bill.due(o) : 0;
  const [tip, setTip] = useState<Paise>(0);
  const [split, setSplit] = useState<pay.Split>({ cash: Math.max(0, due0), upi: 0, pinned: null, waived: 0, tendered: 0 });
  const [notes, setNotes] = useState<Record<string, number>>({});
  const [waiver, setWaiver] = useState({ by: servingName, note: '' });
  const [payeeId, setPayeeId] = useState<string | null>(null);
  const owed = o ? bill.due(o) : 0;
  const toCollect = Math.max(0, owed) + tip;
  const cur = pay.refit(split, toCollect);
  const setTipTo = (t: Paise) => { setTip(t); setSplit(pay.addTip(cur, t - tip, Math.max(0, owed) + t)); };
  const typed = (box: Box, rupees: number) => {
    if (box === 'tip') setTipTo(rupees * R);
    else if (box === 'waive') setSplit(pay.setWaived(cur, rupees * R, toCollect, tip));
    else setSplit(pay.setBox(cur, box, rupees * R, toCollect));
  };
  const waived = cur.waived ?? 0;
  const setBoth = (t: Paise, w: Paise) => { setTip(t); setSplit(pay.setWaived(pay.addTip(cur, t - tip, Math.max(0, owed) + t), w, Math.max(0, owed) + t, t)); };
  const [quick, setQuick] = useState<Paise>(0); // pay2: one-tap cash given (₹100 / ₹200 / ₹500)
  const given = quick || pay.notesTotal(notes) || (cur.tendered ?? 0);
  useUndo(o?.id, setBoth);
  return { tip, setTipTo, setBoth, cur, setSplit, notes, setNotes: (n: Record<string, number>) => { setQuick(0); setNotes(n); }, waiver, setWaiver, payeeId, setPayeeId,
    owed, toCollect, typed, waived, given, setQuick, check: pay.checkPayment(cur.cash, cur.upi, toCollect, tip, waived) };
}

/** pay2: the toast's Undo (+ Tip / − Waive) puts the old amounts back. */
function useUndo(orderId: string | undefined, setBoth: (t: Paise, w: Paise) => void) {
  const u = useApp((st) => st.ui.payUndo);
  const seen = useRef(u?.seq ?? 0);
  useEffect(() => {
    if (!u || u.seq === seen.current) return;
    seen.current = u.seq;
    if (u.orderId === orderId) setBoth(u.tip, u.waived);
  }, [u, orderId, setBoth]);
}
type Draft = ReturnType<typeof useDraft>;

function SplitBoxes({ d, pad, setPad }: { d: Draft; pad: Box | null; setPad: (b: Box) => void }) {
  return (
    <div className={s.split}>
      <button type="button" className={pad === 'cash' ? s.boxCashOn : s.boxCash} onClick={() => { setPad('cash'); }}>
        <span className={s.labCash}>Cash</span><Money p={d.cur.cash} className={pad === 'cash' ? s.valOn : s.val} />
      </button>
      <button type="button" className={pad === 'upi' ? s.boxUpiOn : s.boxUpi} onClick={() => { setPad('upi'); }}>
        <span className={s.labUpi}>UPI</span><Money p={d.cur.upi} className={pad === 'upi' ? s.valOn : s.val} />
      </button>
    </div>
  );
}

function QrBlock({ d, o }: { d: Draft; o: Order }) {
  const payees = useApp((st) => Object.values(st.folded.payees));
  const stallName = useApp((st) => st.folded.settings.stallName ?? 'Fair stall');
  const openSheet = useApp((st) => st.openSheet);
  const payee = payees.find((p) => p.id === d.payeeId) ?? payees[0];
  const upi = d.cur.upi;
  if (upi <= 0) return null;
  const note = `${stallName} ${formatToken(o.token, CONFIG.tokens.pad)}`.slice(0, CONFIG.payment.upiNoteMaxChars);
  return (
    <div className={s.qrBlock}>
      <div className={s.qrMeta}>
        <button type="button" className={s.qrWho} onClick={() => { openSheet({ kind: 'payee' }); }}>{payee ? payee.name : 'Add a UPI ID'} <Icon name="chevron" className={s.chev} /></button>
        <Money p={upi} className={s.qrAmt} />
      </div>
      {payee ? <div className={s.qrTile}><Qr text={upiLink(payee.upiId, payee.name, upi, note)} label={`Payment QR, ₹${String(upi / R)}, ${payee.name}`} /></div> : null}
      {payees.length > 1 ? <div className={s.payeePick}>{payees.map((p) => <button type="button" key={p.id} className={p.id === payee?.id ? s.payeeOn : s.payee} onClick={() => { d.setPayeeId(p.id); }}>{p.name}</button>)}</div> : null}
    </div>
  );
}

function useConfirm(d: Draft) {
  const c = useApp((st) => st.counter);
  const haptics = useApp((st) => st.prefs.haptics);
  const payees = useApp((st) => Object.values(st.folded.payees));
  const busy = useRef(false);
  return () => {
    if (busy.current) return; // double tap guard; the store also refuses a second payment
    busy.current = true;
    const payee = payees.find((p) => p.id === d.payeeId) ?? payees[0];
    const g = d.waived; // only the explicit − Waive amount, never a leftover gap
    const err = c.pay({ cash: d.cur.cash, upi: d.cur.upi, upiPayeeId: d.cur.upi > 0 ? payee?.id ?? null : null, tip: d.tip, waived: g,
      waivedBy: g > 0 ? d.waiver.by : '', waivedNote: g > 0 ? d.waiver.note : '', cashGiven: Math.max(d.given, d.cur.cash > 0 ? d.cur.tendered ?? 0 : 0), notes: d.notes });
    busy.current = false;
    if (err) { c.toast(err); buzz(haptics, 'error'); return; }
    buzz(haptics, 'confirm');
  };
}

function padRupees(pad: Box, d: Draft): number {
  if (pad === 'tip') return d.tip / R;
  if (pad === 'waive') return d.waived / R;
  return (pad === 'cash' && (d.cur.tendered ?? 0) > 0 ? d.cur.tendered ?? 0 : d.cur[pad]) / R;
}

/** pay2: + Tip / − Waive change the amount due (with an Undo toast); any problem shows under them. */
function Adjust({ d, onOther }: { d: Draft; onOther: (k: 'tip' | 'waive') => void }) {
  const openSheet = useApp((st) => st.openSheet);
  const c = useApp((st) => st.counter);
  const pick = (k: 'tip' | 'waive', p: Paise) => {
    const prev = { tip: d.tip, waived: d.waived };
    if (k === 'tip') d.setBoth(p, d.waived); else d.setBoth(d.tip, Math.min(p, Math.max(0, d.owed)));
    const r = (x: Paise) => `₹${String(x / R)}`;
    c.adjustToast(k === 'tip' ? (p > 0 ? `Tip ${r(p)} added` : 'Tip removed') : (p > 0 ? `Waived ${r(Math.min(p, Math.max(0, d.owed)))}` : 'Waive removed'), prev);
  };
  return (
    <>
      <AdjustRow tip={d.tip} waived={d.waived} onPick={pick} onOther={onOther} onWho={() => { openSheet({ kind: 'waived' }); }} />
      {!d.check.ok && d.toCollect > 0 ? <div className={s.over} role="alert">{d.check.reason}</div> : null}
    </>
  );
}

export function PaymentScreen() {
  const o = useApp((st) => (st.ui.orderId ? st.folded.orders[st.ui.orderId] : undefined));
  const c = useApp((st) => st.counter);
  const d = useDraft(o);
  const confirm = useConfirm(d);
  const [pad, setPad] = useState<Box | null>(null);
  if (!o) return null;
  if (d.owed <= 0 && (bill.paid(o) !== 0 || bill.waived(o) > 0)) return <Settled o={o} />;
  if (d.owed === 0 && o.lines.some((l) => l.qty > 0)) return <NothingDue o={o} />;
  const { cur, check, tip } = d;
  return (
    <>
      <main className={s.stage}>
        <div className={s.body}>
          <div className={s.due}>
            <div className={s.dueLab}>To collect</div>
            <Money p={d.toCollect - d.waived} className={s.dueAmt} />
            {tip > 0 || d.waived > 0 ? <div className={s.tipNote}>bill <Money p={Math.max(0, d.owed)} />{tip > 0 ? <> · tip +<Money p={tip} /></> : null}{d.waived > 0 ? <> · waived −<Money p={d.waived} /></> : null}</div> : null}
          </div>
          <Adjust d={d} onOther={(k2) => { setPad(k2); }} />
          <SplitBoxes d={d} pad={pad} setPad={setPad} />
          <Slider split={cur} covered={cur.cash + cur.upi} onSlide={(f) => { d.setSplit(pay.slide(f, cur.cash + cur.upi, CONFIG.money.sliderSnapPaise, d.waived)); }} />
          <GivenRow given={d.given} cash={cur.cash} onGiven={d.setQuick} />
          <QrBlock d={d} o={o} />
          {cur.cash > 0 ? <CountNotes notes={d.notes} onNotes={d.setNotes} /> : null}
        </div>
      </main>
      <footer className={s.bar}>
        <button type="button" className={s.back} onClick={() => { c.setPage('billing'); }}><Icon name="backSmall" className={s.ic} />Back</button>
        <span className={s.paid}>{check.ok && check.gap === 0 ? 'Adds up ✓' : ''}</span>
        <button type="button" className={s.confirm} disabled={!check.ok} onClick={confirm}>Confirm payment</button>
      </footer>
      {pad ? <Numpad key={pad} rupees={padRupees(pad, d)} onChange={(r) => { d.typed(pad, r); }} onDone={() => { setPad(null); }} /> : null}
      <WaivedSheetHost by={d.waiver.by} note={d.waiver.note} onSave={(by, note) => { d.setWaiver({ by, note }); }} />
    </>
  );
}

function WaivedSheetHost({ by, note, onSave }: { by: string; note: string; onSave: (by: string, note: string) => void }) {
  const open = useApp((st) => st.ui.sheet?.kind === 'waived');
  const close = useApp((st) => st.openSheet);
  const [b, setB] = useState(by);
  const [n, setN] = useState(note);
  if (!open) return null;
  return (
    <Sheet title="Waived" onClose={() => { close(null); }}>
      <div className={k.field}><label className={k.fieldLab} htmlFor="wby">Allowed by</label>
        <input id="wby" className={k.input} value={b} maxLength={CONFIG.limits.nameMaxChars} onChange={(e) => { setB(e.target.value); }} /></div>
      <div className={k.field}><label className={k.fieldLab} htmlFor="wnote">Note</label>
        <input id="wnote" className={k.input} value={n} maxLength={CONFIG.limits.noteMaxChars} onChange={(e) => { setN(e.target.value); }} /></div>
      <button type="button" className={[k.cta, s.ctaFull].join(' ')} onClick={() => { onSave(b.trim(), n.trim()); close(null); }}>Done</button>
    </Sheet>
  );
}
