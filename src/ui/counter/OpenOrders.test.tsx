// F-20 UI: an expanded Open orders card gives each line its own Mark ready (Q-MARK-1 B); Cancel order asks first (Q-CANCEL-1 A).
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEMO_MENU } from '../../mock/fixtures';
import { StoreProvider } from '../../store';
import { makeTestStore } from '../../store/testkit';
import { CancelSheet, OpenOrders } from './OpenOrders';

afterEach(cleanup);

describe('Open orders', () => {
  it('expands to lines with their own Mark ready, and cancels through the confirm sheet', async () => {
    const { store } = makeTestStore();
    await store.getState().start();
    const s = () => store.getState();
    for (const m of DEMO_MENU) s().catalog.saveItem(null, { name: m.name, price: m.price, swatch: m.swatch, category: m.category, stationId: m.stationId, count: null });
    const id = (n: string) => Object.values(s().folded.items).find((i) => i.name === n)?.id ?? '';
    s().counter.newOrder(); s().counter.addItem(id('Tea')); s().counter.addItem(id('Samosa')); s().counter.sendToKitchen();
    const oid = s().ui.orderId ?? '';
    render(<StoreProvider store={store}><OpenOrders /><CancelSheet /></StoreProvider>);
    expect(screen.queryByRole('button', { name: /^Mark ready/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Lines of/ }));
    expect(screen.getAllByRole('button', { name: /^Mark ready/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Mark ready: Tea' }));
    expect(screen.getByText('Marked by counter')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Mark ready/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }));
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Left the queue' } });
    const buttons = screen.getAllByRole('button', { name: 'Cancel order' });
    fireEvent.click(buttons[buttons.length - 1] as HTMLElement);
    expect(s().folded.orders[oid]?.cancel?.reason).toBe('Left the queue');
  });
});
