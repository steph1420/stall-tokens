// Bottom sheet: one owner for every sheet's open/close (ARCHITECTURE §5). Scrim tap or Escape closes.
import { useEffect, type ReactNode } from 'react';
import s from './kit.module.css';

export function Sheet({ title, onClose, children, label }: { title?: string; label?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); };
  }, [onClose]);
  return (
    <div className={s.sheetWrap}>
      <button type="button" className={s.scrim} aria-label="Close" onClick={onClose} />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={label ?? title}>
        <div className={s.grab} />
        {title ? <div className={s.sheetTitle}>{title}</div> : null}
        {children}
      </div>
    </div>
  );
}
