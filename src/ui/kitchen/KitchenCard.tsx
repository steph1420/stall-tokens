// F-19 / F-21 / F-22 One order card (21-polish2/kitchen.html, station.html "Full card"). Tap a line = next status,
// hold a line = On hold; hold the token = Priority (ARCHITECTURE §5). Handed-over lines stay, muted (Q-KITCHEN-4 A).
import { CONFIG } from '../../config';
import type { Line, Order } from '../../contract';
import { formatToken, kitchen, useApp } from '../../store';
import { usePress } from '../kit/hold';
import { LineMark, StatusMark } from './StatusMark';
import { stationVar } from './stations';
import s from './Kitchen.module.css';

export function Token({ o, className }: { o: Order; className?: string | undefined }) {
  const t = formatToken(o.token, CONFIG.tokens.pad).replace('#', '');
  return <span className={className ?? s.token}><span className={s.hash}>#</span>{t}</span>;
}

/** The one press owner for a station's own line: tap = next status, hold = On hold. */
export function useLinePress(o: Order, l: Line) {
  const k = useApp((st) => st.kitchen);
  return usePress(() => { k.advance(o.id, l.lineId); }, () => { k.toggleHold(o.id, l.lineId); });
}
export const lineLabel = (l: Line): string => `${l.name}: tap for the next step, hold for On hold`;

function LineRow({ o, l, other }: { o: Order; l: Line; other: boolean }) {
  const press = useLinePress(o, l);
  const cls = [s.kline, l.status === 'handed' ? s.isHanded : '', l.status === 'done?' ? s.isDone : '', other ? s.isOther : '', l.byCounter && l.status === 'ready' ? s.isCounter : ''].join(' ');
  const body = (
    <>
      <span className={s.bar} />
      <span className={s.main}>
        <span className={s.name}>{`${String(l.qty)}× ${l.name}`}</span>
        <span className={s.note}>{l.note || l.stationId}</span>
      </span>
      <span className={s.state}><LineMark l={l} /></span>
    </>
  );
  if (other) return <div className={cls} style={stationVar(l.stationId)}>{body}</div>;
  return (
    <div role="button" tabIndex={0} className={cls} style={stationVar(l.stationId)} {...press}
      aria-label={lineLabel(l)}>{body}</div>
  );
}

/** `station` = the station this screen works for (other lines muted); `only` = show just that station's lines. */
/** `hint` shows the quiet "Hold # for Priority" cue (first card only, so the list stays calm). */
export function KitchenCard({ o, station, only, hint = false }: { o: Order; station: string | null; only: boolean; hint?: boolean }) {
  const k = useApp((st) => st.kitchen);
  const hold = usePress(() => undefined, () => { k.togglePriority(o.id); });
  const lines = kitchen.linesAt(o, only ? station : null);
  const meta = kitchen.handedMeta(o);
  const paused = kitchen.isPaused(o, station);
  const cls = [s.kcard, o.priority ? s.isPriority : '', paused ? s.isPaused : ''].join(' ');
  return (
    <article className={cls} aria-label={`Order ${formatToken(o.token, CONFIG.tokens.pad)}`}>
      <div className={s.kh}>
        <span role="button" tabIndex={0} {...hold} aria-label="Hold to mark Priority"><Token o={o} /></span>
        <span className={s.meta}>
          {o.priority ? <StatusMark mark="priority" /> : paused ? <StatusMark mark="paused" /> : meta ?? (hint ? <span className={s.hint}>Hold # for Priority</span> : null)}
        </span>
      </div>
      {lines.map((l) => <LineRow key={l.lineId} o={o} l={l} other={station !== null && l.stationId !== station} />)}
    </article>
  );
}
