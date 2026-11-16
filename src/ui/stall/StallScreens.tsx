// D-NAV: which Stall screen to show. D-ACCESS: Money, Settle up and Settings sit behind the device passcode (F-34).
import type { StallScreen } from '../../store';
import { useApp } from '../../store';
import { MoneyScreen } from '../money/MoneyScreen';
import { SettleScreen } from '../settle/SettleScreen';
import { StockScreen } from '../stock/StockScreen';
import { FloatScreen } from './FloatScreen';
import { HistoryScreen } from './HistoryScreen';
import { PasscodeGate } from './PasscodeGate';
import { SettingsScreen } from './SettingsScreen';

const GATED: readonly StallScreen[] = ['money', 'settle', 'settings'];

export function StallScreens({ screen }: { screen: StallScreen }) {
  const open = useApp((x) => x.prefs.passcodeOff || x.ui.unlocked);
  if (GATED.includes(screen) && !open) return <PasscodeGate />;
  switch (screen) {
    case 'money': return <MoneyScreen />;
    case 'settle': return <SettleScreen />;
    case 'stock': return <StockScreen />;
    case 'history': return <HistoryScreen />;
    case 'settings': return <SettingsScreen />;
    case 'float': return <FloatScreen />;
    default: return <MoneyScreen />;
  }
}
