// Calm toast and the storage banner (ARCHITECTURE §4 step 3).
import { useEffect, useState } from 'react';
import { CONFIG } from '../../config';
import { useApp } from '../../store';
import s from './kit.module.css';

export function Toast() {
  const toast = useApp((st) => st.ui.toast);
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    if (!toast) return undefined;
    setShown(toast.id);
    const t = setTimeout(() => { setShown(null); }, CONFIG.timings.toastMs);
    return () => { clearTimeout(t); };
  }, [toast]);
  if (!toast || shown !== toast.id) return null;
  return <div className={s.toast} role="status">{toast.text}</div>;
}

export function SaveBanner() {
  const err = useApp((st) => st.saveError);
  const retry = useApp((st) => st.retrySave);
  if (!err) return null;
  return (
    <div className={s.banner} role="alert">
      <span>{err} Your last changes are kept on screen; free some space, then retry.</span>
      <button type="button" className={s.bannerBtn} onClick={retry}>Retry</button>
    </div>
  );
}

/** IndexedDB fallback: calm, not blocking; the app keeps working in this tab. */
export function MemoryBanner() {
  const on = useApp((st) => st.memoryOnly);
  const [hidden, setHidden] = useState(false);
  if (!on || hidden) return null;
  return (
    <div className={s.banner} role="status">
      <span>This browser cannot keep orders after it closes. Keep this tab open, or use a normal (not private) window.</span>
      <button type="button" className={s.bannerBtn} onClick={() => { setHidden(true); }}>OK</button>
    </div>
  );
}
