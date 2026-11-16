// F-32 / F-34 D-ACCESS: Money asks for a passcode (set once, typed twice) before it opens; Open the stall records the float.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StoreProvider } from '../../store';
import { makeTestStore } from '../../store/testkit';
import { StallScreens } from './StallScreens';

afterEach(cleanup);
const type = (code: string) => { for (const d of code) fireEvent.click(screen.getByRole('button', { name: d })); };

describe('Stall screens (F-32 F-34)', () => {
  it('sets a passcode, then needs it again after leaving', async () => {
    const { store } = makeTestStore();
    await store.getState().start();
    store.getState().setPrefs({ passcodeOff: false });
    store.getState().openStall('money');
    const v = render(<StoreProvider store={store}><StallScreens screen="money" /></StoreProvider>);
    expect(screen.getByText('Set a passcode')).toBeTruthy();
    type('1234'); type('1234');
    expect(store.getState().prefs.passcode).toBe('1234');
    v.rerender(<StoreProvider store={store}><StallScreens screen="money" /></StoreProvider>);
    expect(screen.queryByText('Enter passcode')).toBeNull();
    store.getState().closeStall();
    v.rerender(<StoreProvider store={store}><StallScreens screen="settings" /></StoreProvider>);
    type('9999');
    expect(screen.getByText('Enter passcode')).toBeTruthy();
    type('1234');
    expect(screen.getByText('Auto-prep next order')).toBeTruthy();
  });

  it('Open the stall starts today and saves the float', async () => {
    const { store } = makeTestStore();
    await store.getState().start();
    render(<StoreProvider store={store}><StallScreens screen="float" /></StoreProvider>);
    type('15'); fireEvent.click(screen.getByRole('button', { name: '00' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start day' }));
    const f = store.getState().folded;
    expect(f.days).toHaveLength(1);
    expect(f.settings[`float:${f.days[0]?.id ?? ''}`]).toBe('150000');
  });
});
