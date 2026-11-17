// P2 HoldBar (s121 Complete without payment): the wide press-and-hold bar. Same timing and hint as HoldButton.
import { HoldButton } from './HoldButton';
import s from './kit.module.css';

export function HoldBar({ label, sub, onConfirm, onHint }: { label: string; sub: string; onConfirm: () => void; onHint?: () => void }) {
  return (
    <HoldButton label={label} className={s.holdBar} onConfirm={onConfirm} {...(onHint ? { onHint } : {})}>
      <span>{label}</span>
      <small>{sub}</small>
    </HoldButton>
  );
}
