// App shell: applies the stall night/day theme (F-01) and shows the current screen.
import { useEffect, useState } from 'react';
import { CONFIG } from '../config';
import { useApp } from '../store';
import { CounterShell } from './counter/CounterShell';
import { MemoryBanner, SaveBanner, Toast } from './kit/Toast';
import { UpdateBanner } from './kit/Update';
import { KitchenScreen } from './kitchen/KitchenScreen';
import { LaunchScreen } from './launch/LaunchScreen';
import { StationScreen } from './station/StationScreen';
import { StallScreens } from './stall/StallScreens';
import k from './kit/kit.module.css';

export function App() {
  const theme = useApp((s) => s.prefs.theme);
  const screen = useApp((s) => s.ui.screen);
  const ready = useApp((s) => s.ready);
  const start = useApp((s) => s.start);
  useEffect(() => { document.documentElement.dataset.theme = CONFIG.themes[theme]; }, [theme]);
  const [failed, setFailed] = useState(false);
  useEffect(() => { start().catch((e: unknown) => { console.error('could not open the op log', e); setFailed(true); }); }, [start]);
  if (failed) return <div className={k.banner} role="alert"><span>This phone could not open its saved orders.</span><button type="button" className={k.bannerBtn} onClick={() => { window.location.reload(); }}>Try again</button></div>;
  if (!ready) return null;
  return (
    <>
      {screen === 'launch' ? <LaunchScreen /> : screen === 'kitchen' ? <KitchenScreen /> : screen === 'station' ? <StationScreen /> : screen === 'counter' ? <CounterShell /> : <StallScreens screen={screen} />}
      <Toast />
      <SaveBanner />
      <MemoryBanner />
      {import.meta.env.PROD ? <UpdateBanner /> : null}
    </>
  );
}
