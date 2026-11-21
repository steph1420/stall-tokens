import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StoreProvider } from '../../store';
import { makeTestStore } from '../../store/testkit';
import { CustomizeItemSheet } from './CustomizeItemSheet';

afterEach(cleanup);

describe('custom item stock limit', () => {
  it('does not allow selecting more than the available item stock', async () => {
    const { store } = makeTestStore();
    await store.getState().start();
    const s = () => store.getState();
    s().catalog.saveItem(null, {
      name: 'Limited bun', price: 3000, swatch: 0, category: 'Food', stationId: 'kitchen', count: 1,
      variants: JSON.stringify([{ id: 'regular', name: 'Regular', price: 3000 }]),
    });
    const item = Object.values(s().folded.items).find((entry) => entry.name === 'Limited bun');
    if (!item) throw new Error('Limited bun missing');
    act(() => { s().counter.newOrder(); });
    render(<StoreProvider store={store}><CustomizeItemSheet itemId={item.id} onClose={() => {}} /></StoreProvider>);
    expect(screen.getByRole('button', { name: 'Increase quantity' }).getAttribute('disabled')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add to order' }));
    const order = s().folded.orders[s().ui.orderId ?? ''];
    expect(order?.lines[0]?.qty).toBe(1);
  });
});
