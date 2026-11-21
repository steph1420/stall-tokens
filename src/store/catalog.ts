// Menu items, stock and payees (F-07 F-08 F-15). Names are typed in the app, never shipped in the repo.
import { CONFIG } from '../config';
import type { ItemFields } from '../contract';
import type { Core, Log } from './core';
import { isUpiId } from './rules/upi';
import * as amounts from './rules/amounts';

export type ItemDraft = Pick<ItemFields, 'name' | 'price' | 'swatch' | 'category' | 'stationId'> & { count: number | null; discountPct?: number; variants?: string; addons?: string; unit?: string; secondaryUnit?: string; secondaryMultiplier?: number };

function validOptionJson(raw: string): boolean {
  if (!raw) return true;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length <= 20 && parsed.every((entry) => {
      if (typeof entry !== 'object' || entry === null) return false;
      const option = entry as Record<string, unknown>;
      return typeof option.name === 'string' && option.name.trim().length > 0
        && typeof option.price === 'number' && Number.isSafeInteger(option.price)
        && option.price >= 0 && option.price <= CONFIG.limits.moneyMaxPaise
        && (option.id === undefined || typeof option.id === 'string');
    });
  } catch {
    return false;
  }
}


function itemUnits(d: ItemDraft, existing?: Pick<ItemFields, 'unit' | 'secondaryUnit' | 'secondaryMultiplier'>) {
  const unit = (d.unit ?? existing?.unit ?? '').trim().slice(0, 20);
  const secondaryUnit = (d.secondaryUnit ?? existing?.secondaryUnit ?? '').trim().slice(0, 20);
  const secondaryMultiplier = d.secondaryMultiplier ?? existing?.secondaryMultiplier ?? 1;
  const error = !Number.isFinite(secondaryMultiplier) || secondaryMultiplier < 1e-9 || secondaryMultiplier > 1e9
    ? 'Secondary unit multiplier must be between 0.000000001 and 1,000,000,000'
    : secondaryUnit && (!unit || secondaryUnit === unit) ? 'Choose a different secondary unit and set a primary unit'
      : !secondaryUnit && secondaryMultiplier !== 1 ? 'Add a secondary unit or use multiplier 1' : null;
  return { unit, secondaryUnit, secondaryMultiplier, error };
}

function itemActions(core: Core, log: Log) {
  const st = () => core.get();
  return {
    /** Add or edit an item. Returns an error message or null. */
    saveItem(itemId: string | null, d: ItemDraft): string | null {
      const name = d.name.trim().replace(/\s+/g, ' ').slice(0, CONFIG.limits.nameMaxChars);
      if (!name) return 'Give the item a name';
      if (!Number.isSafeInteger(d.price) || d.price < 0 || d.price > CONFIG.limits.moneyMaxPaise) return 'Check the price';
      if (d.count !== null && (!Number.isFinite(d.count) || d.count < 0)) return 'Stock must be 0 or more';
      const existing = itemId ? st().folded.items[itemId] : undefined;
      const units = itemUnits(d, existing);
      if (units.error) return units.error;
      const { unit, secondaryUnit, secondaryMultiplier } = units;
      const discountPct = d.discountPct ?? 0;
      if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) return 'Discount must be between 0 and 100';
      const variants = d.variants ?? '';
      const addons = d.addons ?? '';
      if (!validOptionJson(variants)) return 'Check variant names and prices';
      if (!validOptionJson(addons)) return 'Check add-on names and prices';
      const items = Object.values(st().folded.items).filter((i) => !i.removed);
      if (!itemId && items.length >= CONFIG.limits.itemsMax) return 'The menu is full';
      const order = itemId ? undefined : items.reduce((m, i) => Math.max(m, i.order), 0) + 1;
      const id = itemId ?? core.env.makeId();
      const swatch = Math.abs(Math.trunc(d.swatch)) % CONFIG.swatchCount;
      log.dispatch('item.set', { itemId: id, fields: { name, price: d.price, swatch, category: d.category.trim(), stationId: d.stationId, count: d.count, unit, secondaryUnit, secondaryMultiplier, discountPct, variants, addons,
        ...(order === undefined ? {} : { order, lowAt: CONFIG.stock.lowAtDefault }) } });
      return null;
    },
    removeItem(itemId: string) { log.dispatch('item.set', { itemId, fields: { removed: true } }); },
    /** F-08 press-and-hold panel: −/+ (never below 0) and Mark sold out. */
    adjustStock(itemId: string, delta: number) {
      const it = st().folded.items[itemId];
      if (!it) return;
      if (it.count === null) { if (delta > 0) log.dispatch('item.set', { itemId, fields: { count: delta, soldOut: false } }); return; }
      if (!Number.isFinite(delta) || it.count + delta < -1e-10) return;
      log.dispatch('stock.adjust', { itemId, delta, reason: 'panel' });
      if (it.soldOut && it.count + delta > 0) log.dispatch('item.set', { itemId, fields: { soldOut: false } });
    },
    setSoldOut(itemId: string, soldOut: boolean) { log.dispatch('item.set', { itemId, fields: { soldOut } }); },
  };
}

/** P-3 A / PK-6 A: edit a category or station by id (a virtual one becomes a record with the same id; rename keeps it). */
function recordActions(log: Log) {
  const name = (t: string) => t.trim().replace(/\s+/g, ' ').slice(0, CONFIG.limits.nameMaxChars);
  return {
    setCategory(id: string, f: { name?: string; sortOrder?: number; defaultStation?: string; defaultSwatch?: number }, removed = false): string | null {
      const fields: Record<string, string | number> = {};
      if (f.name !== undefined) { if (!name(f.name)) return 'Give the category a name'; fields.name = name(f.name); }
      if (f.sortOrder !== undefined) fields.sort_order = Math.trunc(f.sortOrder);
      if (f.defaultStation !== undefined) fields.default_station = f.defaultStation;
      if (f.defaultSwatch !== undefined) fields.default_swatch = Math.abs(Math.trunc(f.defaultSwatch)) % CONFIG.swatchCount;
      log.dispatch('record.set', { table: 'category', id, fields, removed });
      return null;
    },
    setStation(id: string, f: { name?: string; icon?: string; colour?: string; sortOrder?: number }, removed = false): string | null {
      const fields: Record<string, string | number> = {};
      if (f.name !== undefined) { if (!name(f.name)) return 'Give the station a name'; fields.name = name(f.name); }
      if (f.icon !== undefined) fields.icon = f.icon.slice(0, 8);
      if (f.colour !== undefined) fields.colour = f.colour.slice(0, 20);
      if (f.sortOrder !== undefined) fields.sort_order = Math.trunc(f.sortOrder);
      log.dispatch('record.set', { table: 'station', id, fields, removed });
      return null;
    },
    /** P-13 day note (id = dayId; text and tags). */
    setDayNote(dayId: string, text: string, tags: string) {
      log.dispatch('record.set', { table: 'day_note', id: dayId, fields: { text: text.trim().slice(0, CONFIG.limits.recordTextMax), tags: tags.trim().slice(0, CONFIG.limits.noteMaxChars) }, removed: false });
    },
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

export function catalogActions(core: Core, log: Log) { return { ...itemActions(core, log), ...payeeActions(core, log), ...recordActions(log) }; }
