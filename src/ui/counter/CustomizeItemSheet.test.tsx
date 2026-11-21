import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bill, StoreProvider } from '../../store';
import { makeTestStore } from '../../store/testkit';
import { CustomizeItemSheet } from './CustomizeItemSheet';

afterEach(cleanup);

describe('CustomizeItemSheet', () => {
  it('replaces base price with the chosen variant, adds extras, discounts, and adds the chosen quantity', async () => {
    const { store } = makeTestStore();
    await store.getState().start();
    const s = () => store.getState();
    s().catalog.saveItem(null, {
      name: 'Burger', price: 5000, swatch: 0, category: 'Food', stationId: 'kitchen', count: null, discountPct: 10,
      variants: JSON.stringify([{ id: 'regular', name: 'Regular', price: 5000 }, { id: 'large', name: 'Large', price: 8000 }]),
      addons: JSON.stringify([{ id: 'cheese', name: 'Extra Cheese', price: 2000 }]),
    });
    const burger = Object.values(s().folded.items).find((item) => item.name === 'Burger');
    expect(burger).toBeDefined();
    if (!burger) throw new Error('Burger missing');
    act(() => { s().counter.newOrder(); });

    const onClose = vi.fn();
    render(<StoreProvider store={store}><CustomizeItemSheet itemId={burger.id} onClose={onClose} /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: /Large/ }));
    fireEvent.click(screen.getByRole('button', { name: /Extra Cheese/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to order' }));

    const order = s().folded.orders[s().ui.orderId ?? ''];
    expect(onClose).toHaveBeenCalledOnce();
    expect(order?.lines).toHaveLength(1);
    expect(order?.lines[0]?.name).toBe('Burger (Large) + Extra Cheese');
    expect(order?.lines[0]?.price).toBe(9000);
    expect(order?.lines[0]?.qty).toBe(2);
    expect(order ? bill.subtotal(order) : 0).toBe(18000);
  });
});
