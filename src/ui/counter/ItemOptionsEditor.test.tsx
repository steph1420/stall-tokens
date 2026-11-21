import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { parseAddons, parseVariants } from '../../contract';
import { StoreProvider } from '../../store';
import { makeTestStore } from '../../store/testkit';
import { CounterSheets } from './CounterSheets';

afterEach(cleanup);

describe('item options editor', () => {
  it('saves variant and add-on prices in paise from the item form', async () => {
    const { store } = makeTestStore();
    await store.getState().start();
    act(() => { store.getState().openSheet({ kind: 'item', itemId: null }); });
    render(<StoreProvider store={store}><CounterSheets /></StoreProvider>);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Burger' } });
    fireEvent.change(screen.getByLabelText('Price (₹ per item)'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add variant' }));
    fireEvent.change(screen.getByLabelText('variant name 1'), { target: { value: 'Large' } });
    fireEvent.change(screen.getByLabelText('variant price 1'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add add-on' }));
    fireEvent.change(screen.getByLabelText('add-on name 1'), { target: { value: 'Extra cheese' } });
    fireEvent.change(screen.getByLabelText('add-on price 1'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const item = Object.values(store.getState().folded.items).find((entry) => entry.name === 'Burger');
    expect(item).toBeDefined();
    expect(item ? parseVariants(item) : []).toEqual([expect.objectContaining({ name: 'Large', price: 8000 })]);
    expect(item ? parseAddons(item) : []).toEqual([expect.objectContaining({ name: 'Extra cheese', price: 2000 })]);
  });
});
