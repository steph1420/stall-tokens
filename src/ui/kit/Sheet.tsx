// Bottom sheet: one owner for every sheet's open/close (ARCHITECTURE §5).
// Standing rule: draggable handle, closes on tap outside, closes with a downward flick.
import { useEffect, type ReactNode } from 'react';
import s from './kit.module.css';
import { useSheetDrag } from './sheetDrag';

export function Sheet({ title, onClose, children, label }: { title?: string; label?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); };
  }, [onClose]);
  const { y, handle } = useSheetDrag(onClose);
  return (
    <div className={s.sheetWrap}>
      <button type="button" className={s.scrim} aria-label="Close" onClick={onClose} />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={label ?? title} style={{ transform: `translateY(${String(y)}px)` }}>
        <div className={s.grab} aria-hidden="true" {...handle} />
        {title ? <div className={s.sheetTitle}>{title}</div> : null}
        {children}
      </div>
    </div>
  );
}
