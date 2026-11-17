// pay3 (F-63): a padlock on Cash and UPI; the unlocked side absorbs + Tip / − Waive; a locked side above the new amount
// is lowered with a calm toast; the slider rests while locked (D-PAY3-2); the calculator is standalone, ÷0 is safe.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEMO_MENU } from '../../../mock/fixtures';
import { StoreProvider } from '../../../store';
import { makeTestStore } from '../../../store/testkit';
import { Toast } from '../../kit/Toast';
import { CounterShell } from '../CounterShell';

afterEach(cleanup);

async function payScreen() {
  const { store } = makeTestStore();
  await store.getState().start();
  const s = () => store.getState();
  for (const m of DEMO_MENU) s().catalog.saveItem(null, { name: m.name, price: m.price, swatch: m.swatch, category: m.category, stationId: m.stationId, count: null });
  const id = (n: string) => Object.values(s().folded.items).find((i) => i.name === n)?.id ?? '';
  store.setState((x) => ({ ui: { ...x.ui, screen: 'counter' } }));
  act(() => { for (let i = 0; i < 4; i++) s().counter.addItem(id('Tea')); s().counter.sendToKitchen(); s().counter.setPage('payment'); });
  render(<StoreProvider store={store}><CounterShell /><Toast /></StoreProvider>);
  return { s };
}
const num = (t: string | null | undefined) => Number((t ?? '').replace(/\D/g, ''));
const due = () => num(screen.getByText('To collect').nextElementSibling?.textContent);
const box = (n: string) => num(screen.getByRole('button', { name: new RegExp(`^${n} ₹`) }).textContent);
const tap = (name: string | RegExp) => { act(() => { fireEvent.click(screen.getByRole('button', { name })); }); };
const slider = () => screen.getByRole('slider', { name: 'Cash and UPI split' });
const chip = (g: string, i: number) => { act(() => { fireEvent.click(within(screen.getByRole('group', { name: g })).getAllByRole('button')[i] as HTMLElement); }); };

describe('pay3 split lock', () => {
  it('locked UPI stays; Cash absorbs + Tip and − Waive', async () => {
    await payScreen();
    for (let i = 0; i < 4; i++) act(() => { fireEvent.keyDown(slider(), { key: 'ArrowLeft' }); });
    const upi = box('UPI');
    expect(upi).toBeGreaterThan(0);
    tap('Lock UPI');
    expect(screen.getByRole('button', { name: 'Unlock UPI' }).getAttribute('aria-pressed')).toBe('true');
    tap(/^\+ Tip/); chip('Tip', 0);
    expect(box('UPI')).toBe(upi);
    expect(box('Cash') + box('UPI')).toBe(due());
    tap(/^− Waive/); chip('Waive', 0);
    expect(box('UPI')).toBe(upi);
    expect(box('Cash') + box('UPI')).toBe(due());
  });
  it('a locked side above the new amount is lowered to fit, with a calm toast', async () => {
    await payScreen();
    tap('Lock Cash');
    tap(/^− Waive/); chip('Waive', 1);
    expect(box('Cash')).toBe(due());
    expect(box('UPI')).toBe(0);
    expect(screen.getByRole('status').textContent).toMatch(/Cash lowered to fit/);
  });
  it('the slider rests while a side is locked; locking one unlocks the other; the rest is not typeable', async () => {
    await payScreen();
    tap('Lock Cash');
    expect(slider().getAttribute('aria-disabled')).toBe('true');
    const cash = box('Cash');
    act(() => { fireEvent.keyDown(slider(), { key: 'ArrowLeft' }); });
    expect(box('Cash')).toBe(cash);
    tap(/^UPI ₹/);
    expect(screen.getByRole('status').textContent).toMatch(/UPI is the rest while Cash is locked/);
    tap('Lock UPI');
    expect(screen.getByRole('button', { name: 'Lock Cash' }).getAttribute('aria-pressed')).toBe('false');
    tap('Unlock UPI');
    expect(slider().getAttribute('aria-disabled')).toBeNull();
  });
});

describe('pay3 calculator', () => {
  it('works on its own, survives ÷0, and Use as UPI puts the result in and locks it', async () => {
    const { s } = await payScreen();
    const before = { cash: box('Cash'), due: due() };
    tap('Calculator');
    const keys = (...k: string[]) => { for (const x of k) tap(x); };
    keys('1', '2', 'Divide', '0', 'Equals');
    expect(screen.getByText("Can't divide by 0")).toBeTruthy();
    keys('3', '0', 'Times', '2', 'Equals');
    expect(screen.getByLabelText('Result').textContent).toBe('60');
    expect(box('Cash')).toBe(before.cash);
    expect(Object.values(s().folded.orders)[0]?.payments.length ?? 0).toBe(0);
    tap('Use as UPI');
    expect(box('UPI')).toBe(Math.min(60, before.due));
    expect(box('Cash') + box('UPI')).toBe(before.due);
    expect(screen.getByRole('button', { name: 'Unlock UPI' })).toBeTruthy();
  });
});
