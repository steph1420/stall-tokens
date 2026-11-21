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
  it('keeps primary-unit sales at the primary rate and deducts primary stock one-for-one', async () => {
    const { store } = makeTestStore();
    await store.getState().start();
    const s = () => store.getState();
    expect(s().catalog.saveItem(null, {
      name: 'Rice', price: 20000, swatch: 0, category: 'Food', stationId: 'kitchen', count: 1,
      unit: 'kg', secondaryUnit: 'g', secondaryMultiplier: 0.001,
    })).toBeNull();
    const rice = Object.values(s().folded.items).find((item) => item.name === 'Rice');
    if (!rice) throw new Error('Rice missing');
    act(() => { s().counter.newOrder(); });
    render(<StoreProvider store={store}><CustomizeItemSheet itemId={rice.id} onClose={vi.fn()} /></StoreProvider>);
    expect(screen.getByRole('radio', { name: 'kg' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Rate per kg')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add to order' }));
    const order = s().folded.orders[s().ui.orderId ?? ''];
    expect(order?.lines[0]).toMatchObject({ qty: 1, unit: 'kg', priceUnit: 'kg', stockMultiplier: 1, price: 20000 });
    expect(order ? bill.subtotal(order) : 0).toBe(20000);
    expect(s().counter.sendToKitchen()).toBe(true);
    expect(s().folded.items[rice.id]?.count).toBe(0);
  });

  it('sells a measured quantity in the secondary unit and converts the bill and stock', async () => {
    const { store } = makeTestStore();
    await store.getState().start();
    const s = () => store.getState();
    expect(s().catalog.saveItem(null, {
      name: 'Rice', price: 20000, swatch: 0, category: 'Food', stationId: 'kitchen', count: 1,
      unit: 'kg', secondaryUnit: 'g', secondaryMultiplier: 0.001,
    })).toBeNull();
    const rice = Object.values(s().folded.items).find((item) => item.name === 'Rice');
    expect(rice).toBeDefined();
    if (!rice) throw new Error('Rice missing');
    act(() => { s().counter.newOrder(); });

    const onClose = vi.fn();
    render(<StoreProvider store={store}><CustomizeItemSheet itemId={rice.id} onClose={onClose} /></StoreProvider>);
    fireEvent.click(screen.getByRole('radio', { name: 'g' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantity' }), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to order' }));

    const order = s().folded.orders[s().ui.orderId ?? ''];
    expect(onClose).toHaveBeenCalledOnce();
    expect(order?.lines[0]).toMatchObject({ qty: 250, unit: 'g', priceUnit: 'kg', stockMultiplier: 0.001, price: 20000 });
    expect(order ? bill.subtotal(order) : 0).toBe(5000);
    expect(s().counter.sendToKitchen()).toBe(true);
    expect(s().folded.items[rice.id]?.count).toBeCloseTo(0.75, 10);
  });

  it('keeps cart totals consistent across options, item discount, measured quantity, order discount and round-off', async () => {
    const { store } = makeTestStore();
    await store.getState().start();
    const s = () => store.getState();
    expect(s().catalog.saveItem(null, {
      name: 'Premium rice', price: 20000, swatch: 0, category: 'Food', stationId: 'kitchen', count: 1,
      unit: 'kg', secondaryUnit: 'g', secondaryMultiplier: 0.001, discountPct: 10,
      variants: JSON.stringify([{ id: 'premium', name: 'Premium', price: 24000 }]),
      addons: JSON.stringify([{ id: 'extra', name: 'Extra', price: 2000 }]),
    })).toBeNull();
    const item = Object.values(s().folded.items).find((x) => x.name === 'Premium rice');
    if (!item) throw new Error('Premium rice missing');
    act(() => { s().counter.newOrder(); });
    render(<StoreProvider store={store}><CustomizeItemSheet itemId={item.id} onClose={vi.fn()} /></StoreProvider>);
    fireEvent.click(screen.getByRole('radio', { name: 'g' }));
    fireEvent.click(screen.getByRole('button', { name: /Premium/ }));
    fireEvent.click(screen.getByRole('button', { name: /Extra/ }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantity' }), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to order' }));

    const order = s().folded.orders[s().ui.orderId ?? ''];
    if (!order) throw new Error('Measured order missing');
    const currentOrder = () => {
      const current = s().folded.orders[order.id];
      if (!current) throw new Error('Measured order was lost');
      return current;
    };
    expect(order.lines[0]).toMatchObject({ qty: 250, unit: 'g', priceUnit: 'kg', stockMultiplier: 0.001, price: 23400 });
    expect(bill.subtotal(order)).toBe(5850);
    s().counter.setDiscount({ kind: 'pct', value: 10, allowedBy: 'S', note: '' });
    expect(bill.discountAmount(bill.subtotal(currentOrder()), currentOrder().discount)).toBe(600);
    expect(bill.preRound(currentOrder())).toBe(5250);
    s().counter.setRoundOff(50);
    expect(bill.roundOffAmount(currentOrder())).toBe(50);
    expect(bill.total(currentOrder())).toBe(5300);
    expect(s().counter.sendToKitchen()).toBe(true);
    expect(s().folded.items[item.id]?.count).toBeCloseTo(0.75, 10);
  });

  it('caps secondary-unit quantities against fractional primary stock', async () => {
    const { store } = makeTestStore();
    await store.getState().start();
    const s = () => store.getState();
    s().catalog.saveItem(null, {
      name: 'Spice', price: 10000, swatch: 0, category: 'Food', stationId: 'kitchen', count: 0.25,
      unit: 'kg', secondaryUnit: 'g', secondaryMultiplier: 0.001,
    });
    const spice = Object.values(s().folded.items).find((item) => item.name === 'Spice');
    if (!spice) throw new Error('Spice missing');
    act(() => { s().counter.newOrder(); });
    render(<StoreProvider store={store}><CustomizeItemSheet itemId={spice.id} onClose={vi.fn()} /></StoreProvider>);
    fireEvent.click(screen.getByRole('radio', { name: 'g' }));
    const quantity = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Quantity' });
    expect(quantity.max).toBe('250');
    fireEvent.change(quantity, { target: { value: '251' } });
    expect(quantity.value).toBe('250');
  });

});
