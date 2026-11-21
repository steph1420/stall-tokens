import { useApp } from '../../store';
import { Icon } from './Icon';

/** A persistent route back to the app's launch/home screen. */
export function HomeButton({ className }: { className: string }) {
  const go = useApp((st) => st.go);
  return (
    <button type="button" className={className} aria-label="Home" title="Home" onClick={() => { go('launch'); }}>
      <Icon name="home" />
    </button>
  );
}
