// F-30 / F-31 Stock actions: set a count, and Paste stock (adds stock per line + one Spent entry for the total, Q-PASTE-1 A).
import { CONFIG } from '../config';
import type { MoneyPart } from '../contract';
import type { Core, Log } from './core';
import { matchItem, pasteTotal, type PasteLine } from './rules/stock';

export function stockActions(core: Core, log: Log, addSpent: (amount: number, label: string, note: string, parts: MoneyPart[]) => string | null) {
  const st = () => core.get();
  const items = () => Object.values(st().folded.items);
  const addLine = (l: PasteLine, order: number) => {
    const it = matchItem(items(), l.name);
    if (!it) {
      log.dispatch('item.set', { itemId: core.env.makeId(), fields: { name: l.name.slice(0, CONFIG.limits.nameMaxChars), price: 0, swatch: 0, category: CONFIG.stock.supplyCategory, stationId: '', count: l.qty, unit: l.unit, lowAt: 0, order, supply: true, soldOut: false, removed: false } });
      return;
    }
    if (it.count === null) log.dispatch('item.set', { itemId: it.id, fields: { count: l.qty, soldOut: false } });
    else log.dispatch('stock.adjust', { itemId: it.id, delta: l.qty, reason: 'paste' });
    if (it.soldOut && it.count !== null) log.dispatch('item.set', { itemId: it.id, fields: { soldOut: false } });
    if (!it.unit && l.unit) log.dispatch('item.set', { itemId: it.id, fields: { unit: l.unit } });
  };
  return {
    /** Adds every clear line; the Spent entry goes first so a refused entry (Mixed not covered, day locked) adds nothing. */
    paste(lines: readonly PasteLine[], parts: MoneyPart[]): string | null {
      const ok = lines.filter((l) => l.ok);
      if (!ok.length) return 'Nothing to add yet';
      const total = pasteTotal(ok);
      if (total > 0) {
        const err = addSpent(total, `Stock · ${String(ok.length)} ${ok.length === 1 ? 'item' : 'items'}`, ok.map((l) => l.name).join(', '), parts);
        if (err) return err;
      }
      const top = items().reduce((m, i) => Math.max(m, i.order), 0);
      ok.forEach((l, i) => { addLine(l, top + i + 1); });
      return null;
    },
    /** Stock screen −/+: never below 0 (plan §7.2). */
    step(itemId: string, delta: number) {
      const it = st().folded.items[itemId];
      if (!it) return;
      if (it.count === null) { if (delta > 0) log.dispatch('item.set', { itemId, fields: { count: Math.trunc(delta), soldOut: false } }); return; }
      if (it.count + delta < 0) return;
      log.dispatch('stock.adjust', { itemId, delta: Math.trunc(delta), reason: 'stock' });
      if (it.soldOut && it.count + delta > 0) log.dispatch('item.set', { itemId, fields: { soldOut: false } });
    },
  };
}
