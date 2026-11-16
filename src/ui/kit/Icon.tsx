// Icons from the locked mockups (20-polish, 21-polish2). Stroke icons use currentColor.
import type { ReactElement } from 'react';

const P = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const ICONS = {
  plus: <svg viewBox="0 0 16 16" {...P} strokeWidth="1.5"><path d="M8 3v10M3 8h10" /></svg>,
  plusBig: <svg viewBox="0 0 22 22" {...P} strokeWidth="1.4"><path d="M11 4.5v13M4.5 11h13" /></svg>,
  more: <svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="12.5" cy="8" r="1.3" /></svg>,
  pencil: <svg viewBox="0 0 16 16" {...P} strokeWidth="1.4"><path d="M11.2 2.6 13.4 4.8 6 12.2H3.8v-2.2L11.2 2.6Z" /><path d="M9.8 4 12 6.2" /></svg>,
  note: <svg viewBox="0 0 16 16" {...P} strokeWidth="1.4"><path d="M3.5 2.5h6.2L12.5 5.3V13.5H3.5V2.5Z" /><path d="M9.5 2.5V5.3h2.8" /><path d="M5.5 8.2h5M5.5 10.8h3.5" /></svg>,
  next: <svg viewBox="0 0 16 16" {...P} strokeWidth="1.8"><path d="M4 8h8M8.5 4.5 12 8l-3.5 3.5" /></svg>,
  back: <svg viewBox="0 0 18 18" {...P} strokeWidth="1.8"><path d="M13 9H5M8.5 5.5 5 9l3.5 3.5" /></svg>,
  backSmall: <svg viewBox="0 0 16 16" {...P} strokeWidth="1.8"><path d="M11 8H5M8 4.5 4.5 8 8 11.5" /></svg>,
  trash: <svg viewBox="0 0 16 16" {...P} strokeWidth="1.6"><path d="M3 4h10M6 4V3h4v1M5 4l.6 9h4.8L11 4" /></svg>,
  chevron: <svg viewBox="0 0 10 6" {...P} strokeWidth="1.4"><path d="M1.5 1.2 5 4.8 8.5 1.2" /></svg>,
  backspace: <svg viewBox="0 0 26 20" {...P} strokeWidth="1.8"><path d="M9.2 1.6h14.3A1.9 1.9 0 0 1 25.4 3.5v13a1.9 1.9 0 0 1-1.9 1.9H9.2L1.7 10 9.2 1.6z" /><path d="M13.4 6.6 19 13.4M19 6.6l-5.6 6.8" /></svg>,
  tortillas: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.6"><path d="M3 16a9 9 0 0 1 18 0z" /><path d="M8 12.5l1.5 1M12 10v1.5M16 12.5l-1.5 1" /></svg>,
  momos: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.6"><path d="M4 17c0-4 3.5-8 8-8s8 4 8 8z" /><path d="M12 9c0-2 1-3 2-4M9 12c1 1 1 3 1 5M15 12c-1 1-1 3-1 5" /></svg>,
  desserts: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.6"><path d="M7 11l5 10 5-10z" /><path d="M6.5 11a5.5 5.5 0 0 1 11 0z" /></svg>,
  sandwiches: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.6"><path d="M3 15L12 5l9 10z" /><path d="M4 18h16" /></svg>,
  cutlets: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.6"><ellipse cx="12" cy="12" rx="8.5" ry="6" /><path d="M8 11h1M12 9.5h1M15 12h1M10 14h1" /></svg>,
  beverages: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.6"><path d="M6 7h12l-1.5 13h-9z" /><path d="M13 7l2-4h3" /></svg>,
} satisfies Record<string, ReactElement>;

export type IconName = keyof typeof ICONS;
export function Icon({ name, className }: { name: IconName; className?: string | undefined }) {
  return <span className={className} aria-hidden="true" data-icon={name}>{ICONS[name]}</span>;
}
