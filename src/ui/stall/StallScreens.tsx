// D-NAV: which Stall screen to show. D-ACCESS gate sits here (F-34) once Settings exists.
import type { StallScreen } from '../../store';
import { MoneyScreen } from '../money/MoneyScreen';
import { SettleScreen } from '../settle/SettleScreen';
import { StockScreen } from '../stock/StockScreen';

export function StallScreens({ screen }: { screen: StallScreen }) {
  switch (screen) {
    case 'money': return <MoneyScreen />;
    case 'settle': return <SettleScreen />;
    case 'stock': return <StockScreen />;
    default: return <MoneyScreen />;
  }
}
