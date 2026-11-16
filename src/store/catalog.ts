// Menu items, stock and payees (F-07 F-08 F-15). Names are typed in the app, never shipped in the repo.
import { CONFIG } from '../config';
import type { ItemFields } from '../contract';
import type { Core, Log } from './core';
import { isUpiId } from './rules/upi';
import * as amounts from './rules/amounts';

export type ItemDraft = Pick<ItemFields, 'name' | 'price' | 'swatch' | 'category' | 'stationId'> & { count: number | null };

function itemActions(core: Core, log: Log) {
  const st = () => core.get();
  return {
    /** Add or edit an item. Returns an error message or null. */
    saveItem(itemId: string | null, d: ItemDraft): string | null {
      const name = d.name.trim().replace(/\s+/g, ' ').slice(0, CONFIG.limits.nameMaxChars);
      if (!name) return 'Give the item a name';
      if (!Number.isSafeInteger(d.price) || d.price < 0 || d.price > CONFIG.limits.moneyMaxPaise) return 'Check the price';
      if (d.count !== null && (!Number.isSafeInteger(d.count) || d.count < 0)) return 'Stock must be 0 or more';
      const items = Object.values(st().folded.items).filter((i) => !i.removed);
      if (!itemId && items.length >= CONFIG.limits.itemsMax) return 'The menu is full';
      const order = itemId ? undefined : items.reduce((m, i) => Math.max(m, i.order), 0) + 1;
      const id = itemId ?? core.env.makeId();
      const swatch = Math.abs(Math.trunc(d.swatch)) % CONFIG.swatchCount;
      log.dispatch('item.set', { itemId: id, fields: { name, price: d.price, swatch, category: d.category.trim(), stationId: d.stationId, count: d.count,
        ...(order === undefined ? {} : { order, lowAt: CONFIG.stock.lowAtDefault }) } });
      return null;
    },
    removeItem(itemId: string) { log.dispatch('item.set', { itemId, fields: { removed: true } }); },
    /** F-08 press-and-hold panel: −/+ (never below 0) and Mark sold out. */
    adjustStock(itemId: string, delta: number) {
      const it = st().folded.items[itemId];
      if (!it) return;
      if (it.count === null) { if (delta > 0) log.dispatch('item.set', { itemId, fields: { count: Math.trunc(delta), soldOut: false } }); return; }
      if (it.count + delta < 0) return;
      log.dispatch('stock.adjust', { itemId, delta: Math.trunc(delta), reason: 'panel' });
      if (it.soldOut && it.count + delta > 0) log.dispatch('item.set', { itemId, fields: { soldOut: false } });
    },
    setSoldOut(itemId: string, soldOut: boolean) { log.dispatch('item.set', { itemId, fields: { soldOut } }); },
  };
}

/** F-15 UPI IDs and shared settings. */
function payeeActions(core: Core, log: Log) {
  const st = () => core.get();
  return {
    savePayee(payeeId: string | null, name: string, upiId: string): string | null {
      const n = name.trim().slice(0, CONFIG.limits.nameMaxChars);
      const u = upiId.trim().slice(0, CONFIG.limits.upiIdMaxChars);
      if (!n) return 'Add a name';
      if (!isUpiId(u)) return 'That does not look like a UPI ID (name@bank)';
      if (!payeeId && Object.keys(st().folded.payees).length >= CONFIG.limits.payeesMax) return 'Too many UPI IDs';
      log.dispatch('payee.set', { payeeId: payeeId ?? core.env.makeId(), name: n, upiId: u, removed: false });
      return null;
    },
    /** Shared stall settings (stall name). Trimmed and length-capped. */
    setSetting(key: 'stallName', value: string) { log.dispatch('setting.set', { key, value: value.trim().replace(/\s+/g, ' ').slice(0, CONFIG.limits.nameMaxChars) }); },
    /** F-45 tip choices / round-off steps for every phone: text in rupees; returns an error line or null. */
    setAmounts(key: amounts.AmountsKey, text: string): string | null {
      const r = amounts.parseRupees(text, key);
      if ('error' in r) return r.error;
      log.dispatch('setting.set', { key, value: r.ok.join(',') });
      return null;
    },
    removePayee(payeeId: string) {
      const p = st().folded.payees[payeeId];
      if (p) log.dispatch('payee.set', { payeeId, name: p.name, upiId: p.upiId, removed: true });
    },
  };
}

export function catalogActions(core: Core, log: Log) { return { ...itemActions(core, log), ...payeeActions(core, log) }; }
