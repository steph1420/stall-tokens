// D-NAV: the quiet "Stall" list, on the launch screen (third section) and in the Counter ⋯ sheet. Same rows in both.
import type { StallScreen } from '../../store';
import { useApp } from '../../store';
import kit from '../kit/kit.module.css';

export const STALL_SCREENS: readonly { id: StallScreen; label: string; hint: string }[] = [
  { id: 'money', label: 'Money', hint: 'Spent, received, refunds due' },
];

export function StallNav({ className, onGo }: { className?: string | undefined; onGo?: () => void }) {
  const open = useApp((s) => s.openStall);
  return (
    <ul className={className ?? kit.list} aria-label="Stall">
      {STALL_SCREENS.map((x) => (
        <li key={x.id}><button type="button" className={kit.listRow} onClick={() => { onGo?.(); open(x.id); }}>
          <span className={kit.grow}>{x.label}</span><small>{x.hint}</small></button></li>
      ))}
    </ul>
  );
}
