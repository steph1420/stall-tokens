// F-21 Station page (21-polish2/station.html, 07-station/station-v1). One whole order per screen; swipe left/right or
// tap a tab to change order; Overview = item totals + status split + look (Q-STN-LOOK D, default Full card D-STATION).
// Other stations' lines are muted with their status. Back returns to the opener (Q-BACK-1 A). Interaction owner (§5).
import { useRef } from 'react';
import { CONFIG } from '../../config';
import type { Order } from '../../contract';
import { kitchen, liveOrders, useApp, type Folded, type StationPlace } from '../../store';
import { Icon } from '../kit/Icon';
import { KitchenCard } from '../kitchen/KitchenCard';
import { StatusMark, type Mark } from '../kitchen/StatusMark';
import { stationIcon, stationVar } from '../kitchen/stations';
import k from '../kitchen/Kitchen.module.css';
import { ItemCards, Ticket } from './Looks';
import { LeavingCard, useLeaving } from '../kitchen/Leaving';
import { Overview } from './Overview';
import s from './Station.module.css';

/** The one mark a tab shows: Priority, then Done?, then Paused, then the station's main status. */
function tabMark(o: Order, station: string): Mark {
  if (o.priority) return 'priority';
  const ls = kitchen.linesAt(o, station);
  if (ls.some((l) => l.status === 'done?')) return 'done?';
  if (kitchen.isPaused(o, station)) return 'paused';
  const order: readonly Mark[] = ['preparing', 'held', 'waiting', 'ready', 'handed'];
  return order.find((m) => ls.some((l) => l.status === m)) ?? 'waiting';
}

function useSwipe(onStep: (dir: 1 | -1) => void) {
  const x0 = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown(e: React.PointerEvent) { x0.current = { x: e.clientX, y: e.clientY }; },
    onPointerUp(e: React.PointerEvent) {
      const p = x0.current; x0.current = null;
      if (!p) return;
      const dx = e.clientX - p.x;
      if (Math.abs(dx) >= CONFIG.gesture.swipePx && Math.abs(dx) > Math.abs(e.clientY - p.y)) onStep(dx < 0 ? 1 : -1);
    },
    onPointerCancel() { x0.current = null; },
  };
}

function OrderTabs({ list, station, current }: { list: readonly Order[]; station: string; current: string | undefined }) {
  const a = useApp((st) => st.kitchen);
  return (
    <div className={s.otabs} role="tablist" aria-label="Orders">
      {list.map((x) => {
        const m = tabMark(x, station);
        const on = x.id === current;
        return (
          <button type="button" role="tab" aria-selected={on} key={x.id} className={[s.otab, on ? s.otabOn : '', m === 'paused' ? s.otabPaused : ''].join(' ')}
            data-mark={m} onClick={() => { a.showStationOrder(x.id); }}>
            <span className={s.tok}><span className={k.hash}>#</span>{String(x.token).padStart(CONFIG.tokens.pad, '0')}</span>
            <StatusMark mark={m} label={false} small />
          </button>
        );
      })}
    </div>
  );
}

/** The order the station shows now; when it leaves, Q-OVERLAY keeps it a moment. */
function useShown(place: StationPlace | null, folded: Folded): Order[] {
  if (!place) return [];
  const list = kitchen.stationOrders(liveOrders(folded), place.id);
  const o = list.find((x) => x.id === place.orderId) ?? list[0];
  return o ? [o] : [];
}

export function StationScreen() {
  const place = useApp((st) => st.ui.station);
  const folded = useApp((st) => st.folded);
  const look = useApp((st) => st.prefs.stationLook);
  const sheet = useApp((st) => st.ui.sheet?.kind);
  const stallName = useApp((st) => st.folded.settings.stallName ?? 'Fair stall');
  const a = useApp((st) => st.kitchen);
  const openSheet = useApp((st) => st.openSheet);
  const swipe = useSwipe((d) => { a.stepStationOrder(d); });
  const gone = useLeaving(useShown(place, folded), folded.orders);
  if (!place) return null;
  const station = place.id;
  const list = kitchen.stationOrders(liveOrders(folded), station);
  const live = list.find((x) => x.id === place.orderId) ?? list[0];
  const left = gone.find((g) => !live || g.o.id !== live.id);
  const o = left?.o ?? live;
  return (
    <div className={k.phone} style={stationVar(station)}>
      <header className={k.chrome}>
        <div className={k.hdr}>
          <div className={k.kicker}>{stallName}</div>
          <button type="button" className={k.back} aria-label="Back" onClick={() => { a.closeStation(); }}><Icon name="chevLeft" /></button>
          <h1 className={s.title}><Icon name={stationIcon(station)} className={s.titleIc} /><span>{station}</span></h1>
          <button type="button" className={k.open} onClick={() => { openSheet({ kind: 'overview' }); }}>Overview</button>
        </div>
        <OrderTabs list={list} station={station} current={o?.id} />
      </header>
      <main className={s.body} {...swipe}>
        {!o ? <p className={k.empty}>Nothing to make at {station}</p>
          : <LeavingCard key={o.id} why={left?.why}>{look === 'items' ? <ItemCards o={o} station={station} />
            : look === 'ticket' ? <Ticket o={o} station={station} />
              : <KitchenCard o={o} station={station} only={false} />}</LeavingCard>}
      </main>
      {sheet === 'overview' ? <Overview station={station} /> : null}
    </div>
  );
}
