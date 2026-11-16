// F-04 Launch (21-polish2/launch.html): shown every time the app opens (Q-LAUNCH-1 B).
import { CONFIG } from '../../config';
import { useApp } from '../../store';
import { Icon, type IconName } from '../kit/Icon';
import s from './LaunchScreen.module.css';

const STATION_ICONS: readonly IconName[] = ['tortillas', 'momos', 'desserts', 'sandwiches', 'cutlets', 'beverages'];

export function LaunchScreen() {
  const go = useApp((st) => st.go);
  const toast = useApp((st) => st.counter.toast);
  const stallName = useApp((st) => st.folded.settings.stallName ?? 'Fair stall');
  const soon = () => { toast('Kitchen and stations are next in this build'); };
  return (
    <div className={s.page}>
      <header className={s.kicker}>{stallName}</header>
      <main className={s.content}>
        <section className={s.roles}>
          <button type="button" className={s.choice} onClick={() => { go('counter'); }}>
            <span className={s.name}>Counter</span><span className={s.hint}>Menu, billing and payment</span>
          </button>
          <button type="button" className={s.choice} onClick={soon}>
            <span className={s.name}>Kitchen</span><span className={s.hint}>Orders by station</span>
          </button>
        </section>
        <section className={s.stations}>
          <div className={s.label}>Stations</div>
          <div className={s.grid}>
            {CONFIG.stations.map((name, i) => (
              <button type="button" key={name} className={s.tile} style={{ '--c': `var(--dl-stall-station-${String(i)})` } as React.CSSProperties} onClick={soon}>
                <Icon name={STATION_ICONS[i] ?? 'beverages'} className={s.icon} /><span>{name}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
