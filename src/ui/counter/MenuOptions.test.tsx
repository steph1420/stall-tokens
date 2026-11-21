import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StoreProvider } from '../../store';
import { makeTestStore } from '../../store/testkit';
import { MenuScreen } from './menu/MenuScreen';

afterEach(cleanup);

describe('menu custom-item routing', () => {
  it('opens the option selector when a menu card with variants is tapped', async () => {
    const { store } = makeTestStore();
    await store.getState().start();
    store.getState().catalog.saveItem(null, {
      name: 'Burger', price: 5000, swatch: 0, category: 'Food', stationId: 'kitchen', count: null,
      variants: JSON.stringify([{ id: 'large', name: 'Large', price: 8000 }]),
    });
    render(<StoreProvider store={store}><MenuScreen /></StoreProvider>);
    const card = screen.getByRole('button', { name: 'Burger, add one, choose options' });
    fireEvent.pointerDown(card, { clientX: 1, clientY: 1 });
    fireEvent.pointerUp(card);
    expect(store.getState().ui.sheet).toEqual({ kind: 'customizeItem', itemId: Object.values(store.getState().folded.items).find((item) => item.name === 'Burger')?.id });
  });
});
