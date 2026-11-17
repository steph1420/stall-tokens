// F-34 Settings (21-polish2/settings.html; D-ACCESS, D-THEME): Kitchen (Auto-prep, Station look), Money (Partner shares,
// tip choices, round-off), Feel (Haptics, Appearance Night / Day), Counter (serving name, token range), Passcode,
// Developer (passcode lock off), About (version + channel, F-49), Q-HARM-7 footer stamp (tap opens What's New).
// Device prefs stay on this phone.
import { useState, type ReactNode } from 'react';
import { appStamp, CONFIG } from '../../config';
import { formatInr } from '../../contract';
import type { DevicePrefs, Extra } from '../../store';
import { amounts, istClock, isSheetUrl, useApp } from '../../store';
import { AmountsEdit } from '../kit/AmountsEdit';
import { Sheet } from '../kit/Sheet';
import kit from '../kit/kit.module.css';
import { ReviewSheet } from './ReviewSheet';
import { StallPage } from './StallPage';
import { WHATS_NEW } from './whatsNew';
import s from './Stall.module.css';

const LOOKS = { full: 'Full card', items: 'Item cards', ticket: 'Ticket' } as const;
const HAPTICS = { off: 'Off', light: 'Light', normal: 'Normal', strong: 'Strong' } as const;
const next = <T extends string>(xs: readonly T[], v: T): T => xs[(xs.indexOf(v) + 1) % xs.length] ?? v;

function Group({ label, children }: { label: string; children: ReactNode }) {
  return <section className={s.sec}><div className={s.secH}><span>{label}</span></div><div className={s.card}>{children}</div></section>;
}
function Opt({ t, sub, value, onClick, sw }: { t: string; sub?: string; value?: string; onClick?: () => void; sw?: boolean }) {
  const body = <><span className={s.rowMain}><span className={s.setT}>{t}</span>{sub ? <span className={s.rowS}>{sub}</span> : null}</span>
    {sw === undefined ? <span className={onClick ? s.setV : s.setRo}>{value}{onClick ? ' ›' : ''}</span> : <span className={sw ? s.swOn : s.sw} aria-hidden="true"><span /></span>}</>;
  if (!onClick) return <div className={s.setRow}>{body}</div>;
  return <button type="button" className={s.setRow} role={sw === undefined ? undefined : 'switch'} aria-checked={sw} onClick={onClick}>{body}</button>;
}

/** F-35 Sync: the Sheet bridge URL and stall key for this phone (docs/SHEET_SETUP.md). Saving restarts the app to connect. */
function SyncSheet({ onClose }: { onClose: () => void }) {
  const a = useApp((x) => x);
  const [url, setUrl] = useState(a.prefs.syncUrl);
  const [key, setKey] = useState(a.prefs.syncKey);
  const bad = url.trim() !== '' && !isSheetUrl(url);
  const save = () => { a.setPrefs({ syncUrl: url.trim(), syncKey: key.trim() }); window.location.reload(); };
  return (
    <Sheet title="Sync with the Sheet" onClose={onClose}>
      <div className={s.syncForm}>
      <p className={s.syncHint}>Paste the web-app link (ends in /exec) and the stall key from the Sheet setup. Leave empty to keep this phone local.</p>
      <input className={kit.input} aria-label="Web-app link" placeholder="https://script.google.com/macros/s/…/exec" autoCapitalize="off" autoCorrect="off" value={url} onChange={(e) => { setUrl(e.target.value); }} />
      <input className={kit.input} aria-label="Stall key" placeholder="Stall key" autoCapitalize="off" autoCorrect="off" value={key} onChange={(e) => { setKey(e.target.value); }} />
      {bad ? <p className={s.warn}>That link does not look right · it should start with https://</p> : null}
      <button type="button" className={kit.cta} disabled={bad || (url.trim() !== '' && !key.trim())} onClick={save}>Save and reconnect</button>
      </div>
    </Sheet>
  );
}

function SyncRow() {
  const p = useApp((x) => x.prefs);
  const sync = useApp((x) => x.sync);
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(false);
  const clashes = useApp((x) => x.folded.conflicts.length);
  const state = !p.syncUrl ? 'Not set up' : sync.error ? 'Not reaching the Sheet' : sync.lastOkAt ? `Synced ${istClock(sync.lastOkAt)}` : 'Connecting…';
  return (
    <>
      <Opt t="Sheet sync" sub={sync.pending ? `${String(sync.pending)} waiting to sync` : 'Phones share orders and money through the Sheet'} value={state} onClick={() => { setOpen(true); }} />
      <Opt t="Review" sub="Clashes between phones or Sheet edits, resolved by the sync rules" value={String(clashes)} onClick={() => { setReview(true); }} />
      {open ? <SyncSheet onClose={() => { setOpen(false); }} /> : null}
      {review ? <ReviewSheet onClose={() => { setReview(false); }} /> : null}
    </>
  );
}

/** F-45 shared tip choices / round-off steps, edited inline (same setting the Payment and Billing screens edit). */
function AmountsOpt({ k, t, sep }: { k: amounts.AmountsKey; t: string; sep: string }) {
  const v = useApp((x) => amounts.amounts(x.folded.settings, k));
  const [edit, setEdit] = useState(false);
  return edit ? <AmountsEdit k={k} onDone={() => { setEdit(false); }} />
    : <Opt t={t} sub="Shared with every phone" value={v.map((x) => formatInr(x)).join(sep) || 'None'} onClick={() => { setEdit(true); }} />;
}


function WhatsNewSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title={WHATS_NEW.title} onClose={onClose}>
      <p className={s.syncHint}>{`Stall Tokens v${CONFIG.app.version}`}</p>
      <ul className={s.whatsList}>
        {WHATS_NEW.items.map((item) => <li key={item} className={s.syncHint}>{item}</li>)}
      </ul>
    </Sheet>
  );
}

export function SettingsScreen() {
  const a = useApp((x) => x);
  const p = a.prefs;
  const partners = useApp((x) => Object.values(x.folded.people).filter((y) => y.isPartner));
  const set = (patch: Partial<DevicePrefs>) => { a.setPrefs(patch); };
  return (
    <StallPage title="Settings">
      <Group label="Kitchen">
        <Opt t="Auto-prep next order" sub="Station starts the next order's items" sw={p.autoPrep} onClick={() => { set({ autoPrep: !p.autoPrep }); }} />
        <Opt t="Station look" value={LOOKS[p.stationLook]} onClick={() => { set({ stationLook: next(['full', 'items', 'ticket'], p.stationLook) }); }} />
      </Group>
      <Group label="Money">
        <Opt t="Partner shares" sub={partners.map((x) => `${x.name} ${String(x.sharePct)}`).join(' · ') || 'No partners yet'} value="" onClick={() => { a.openStall('settle'); a.unlock(); }} />
        <AmountsOpt k="tipChips" t="Tip choices" sep=" · " />
        <AmountsOpt k="roundOffSteps" t="Round-off to nearest" sep=" / " />
      </Group>
      <Group label="Feel">
        <Opt t="Haptics" value={HAPTICS[p.haptics]} onClick={() => { set({ haptics: next(['off', 'light', 'normal', 'strong'], p.haptics) }); }} />
        <Opt t="Appearance" sub="Night for evenings · Day for bright sun" value={p.theme === 'night' ? 'Night' : 'Day'} onClick={() => { set({ theme: p.theme === 'night' ? 'day' : 'night' }); }} />
      </Group>
      <Group label="Counter">
        <Opt t="Token range" value={(() => { const r = CONFIG.tokens.ranges[p.rangeIndex]; return r ? `${String(r.from)}–${String(r.to)}` : ''; })()} onClick={() => { set({ rangeIndex: (p.rangeIndex + 1) % CONFIG.tokens.ranges.length }); }} />
        <Opt t="Serving name" value={p.servingName || 'Not set'} />
      </Group>
      <Group label="Sync"><SyncRow /></Group>
      <Extras />
      <Group label="Passcode">
        <Opt t="Change passcode" sub="Asks for a new 4-digit code next time" value="" onClick={() => { set({ passcode: '' }); a.money.toast('Passcode cleared · set a new one next time'); }} />
      </Group>
      <Group label="Developer">
        <Opt t="Sign-in links" sub="One-tap links per person / role: sets up sync and opens their screen" value="" onClick={() => { a.openStall('developer'); a.unlock(); }} />
        <Opt t="Passcode lock" sub="Off (default) = Money, Settle up and Settings open without a code on this phone" sw={!p.passcodeOff} onClick={() => { set({ passcodeOff: !p.passcodeOff }); }} />
      </Group>
      <Group label="About">
        <Opt t="Version" value={`${CONFIG.app.version} · ${CONFIG.app.channelLabel}`} />
      </Group>
      <Footer deviceId={p.deviceId} />
    </StallPage>
  );
}

/** FEATURES §0.2 top-4 gaps (F-64 search, F-66 Close the day): shared switches, off until Steve turns them on. */
function Extras() {
  const set = useApp((x) => x.folded.settings);
  const c = useApp((x) => x.close);
  const on = (k: Extra) => set[CONFIG.extras[k]] === '1';
  return (
    <Group label="Extras · every phone">
      <Opt t="Close the day" sub="A checklist and summary at the end of the day, in the Stall list" sw={on('closeDay')} onClick={() => { c.setExtra('closeDay', !on('closeDay')); }} />
      <Opt t="History search" sub="Find an order by token, name or item" sw={on('historySearch')} onClick={() => { c.setExtra('historySearch', !on('historySearch')); }} />
    </Group>
  );
}

function Footer({ deviceId }: { deviceId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={s.foot} aria-label="What's New" onClick={() => { setOpen(true); }}>{appStamp()}</button>
      <p className={s.footSub}>{`device ${deviceId.slice(0, 6)}`}</p>
      {open ? <WhatsNewSheet onClose={() => { setOpen(false); }} /> : null}
    </>
  );
}
