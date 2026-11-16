// D-NAV: which Stall screen to show. D-ACCESS gate sits here (F-34) once Settings exists.
import type { StallScreen } from '../../store';
import { MoneyScreen } from '../money/MoneyScreen';

export function StallScreens({ screen }: { screen: StallScreen }) {
  switch (screen) {
    case 'money': return <MoneyScreen />;
    default: return <MoneyScreen />;
  }
}
