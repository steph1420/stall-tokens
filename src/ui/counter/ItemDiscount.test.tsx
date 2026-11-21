import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StoreProvider } from '../../store';
import { makeTestStore } from '../../store/testkit';
import { CounterSheets } from './CounterSheets';

afterEach(cleanup);

describe('item discount editor', () => {
  it('saves the percentage from the item form and applies it to a new menu line', async () => {
    const { store } = makeTestStore();
    await store.getState().start();
    act(() => { store.getState().openSheet({ kind: 'item', itemId: null }); });

    render(
      <StoreProvider store={store}>
        <CounterSheets />
      </StoreProvider>,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Discounted tea' } });
    fireEvent.change(screen.getByLabelText('Price (₹ per item)'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Item discount (%)'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const item = Object.values(store.getState().folded.items).find((i) => i.name === 'Discounted tea');
    expect(item?.discountPct).toBe(15);
    if (!item) throw new Error('saved item missing');

    act(() => { store.getState().counter.addItem(item.id); });
    const orderId = store.getState().ui.orderId;
    const line = orderId ? store.getState().folded.orders[orderId]?.lines[0] : undefined;
    expect(line?.price).toBe(8500);
  });
});
