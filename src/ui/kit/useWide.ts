// P3b: is there room for two panes? Measured in root rem (so 200 % text keeps one column) and needs some height
// (so a phone on its side keeps the phone layout). Updates on resize / rotate.
import { useEffect, useState } from 'react';
import { CONFIG } from '../../config';

function measure(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return window.innerWidth >= CONFIG.layout.twoPaneMinRem * rem && window.innerHeight >= CONFIG.layout.twoPaneMinHeightRem * rem;
}

export function useWide(): boolean {
  const [wide, setWide] = useState(measure);
  useEffect(() => {
    const on = () => { setWide(measure()); };
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    on();
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
  }, []);
  return wide;
}
