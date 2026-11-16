// F-34 Settings (21-polish2/settings.html; D-ACCESS, D-THEME): Kitchen (Auto-prep, Station look), Money (Partner shares,
// tip choices, round-off), Feel (Haptics, Appearance Night / Day), Counter (serving name, token range), Passcode,
// Developer (passcode lock off), footer. Device prefs stay on this phone; tip choices and round-off steps are read-only (D-SETTINGS-RO).
import type { ReactNode } from 'react';
import { CONFIG } from '../../config';
import { formatInr } from '../../contract';
import type { DevicePrefs } from '../../store';
import { useApp } from '../../store';
import { StallPage } from './StallPage';
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
        <Opt t="Tip choices" value={CONFIG.payment.tipChips.map((x) => formatInr(x)).join(' · ')} />
        <Opt t="Round-off to nearest" value={CONFIG.money.roundOffSteps.map((x) => formatInr(x)).join(' / ')} />
      </Group>
      <Group label="Feel">
        <Opt t="Haptics" value={HAPTICS[p.haptics]} onClick={() => { set({ haptics: next(['off', 'light', 'normal', 'strong'], p.haptics) }); }} />
        <Opt t="Appearance" sub="Night for evenings · Day for bright sun" value={p.theme === 'night' ? 'Night' : 'Day'} onClick={() => { set({ theme: p.theme === 'night' ? 'day' : 'night' }); }} />
      </Group>
      <Group label="Counter">
        <Opt t="Token range" value={(() => { const r = CONFIG.tokens.ranges[p.rangeIndex]; return r ? `${String(r.from)}–${String(r.to)}` : ''; })()} onClick={() => { set({ rangeIndex: (p.rangeIndex + 1) % CONFIG.tokens.ranges.length }); }} />
        <Opt t="Serving name" value={p.servingName || 'Not set'} />
      </Group>
      <Group label="Passcode">
        <Opt t="Change passcode" sub="Asks for a new 4-digit code next time" value="" onClick={() => { set({ passcode: '' }); a.money.toast('Passcode cleared · set a new one next time'); }} />
      </Group>
      <Group label="Developer">
        <Opt t="Passcode lock" sub="Off = Money, Settle up and Settings open without a code on this phone" sw={!p.passcodeOff} onClick={() => { set({ passcodeOff: !p.passcodeOff }); }} />
      </Group>
      <p className={s.foot}>{`Stall Tokens ${CONFIG.app.version} · device ${p.deviceId.slice(0, 6)}`}</p>
    </StallPage>
  );
}
