import type { ItemAddon, ItemVariant } from './op';
import type { Item } from './state';
import type { Paise } from './money';

function isCustomOption(value: unknown): value is { id?: string; name: string; price: Paise } {
  if (typeof value !== 'object' || value === null) return false;
  const option = value as Record<string, unknown>;
  return typeof option.name === 'string' && option.name.trim().length > 0
    && typeof option.price === 'number' && Number.isSafeInteger(option.price) && option.price >= 0
    && (option.id === undefined || typeof option.id === 'string');
}

function parseOptions(raw: string): Array<{ id?: string; name: string; price: Paise }> {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isCustomOption) : [];
  } catch {
    return [];
  }
}

export function parseVariants(item: Pick<Item, 'variants'>): ItemVariant[] {
  return parseOptions(item.variants);
}

export function parseAddons(item: Pick<Item, 'addons'>): ItemAddon[] {
  return parseOptions(item.addons);
}

export function calcItemPrice(basePrice: Paise, variant?: ItemVariant | null, addons: readonly ItemAddon[] = [], discountPct = 0): Paise {
  const beforeDiscount = (variant?.price ?? basePrice) + addons.reduce((sum, addon) => sum + addon.price, 0);
  const pct = Number.isFinite(discountPct) ? Math.max(0, Math.min(100, discountPct)) : 0;
  return Math.max(0, beforeDiscount - Math.round((beforeDiscount * pct) / 100));
}

export function formatItemCustomName(baseName: string, variant?: ItemVariant | null, addons: readonly ItemAddon[] = []): string {
  const parts = [baseName.trim()];
  if (variant?.name.trim()) parts.push(`(${variant.name.trim()})`);
  const names = addons.map((addon) => addon.name.trim()).filter(Boolean);
  if (names.length) parts.push(`+ ${names.join(', ')}`);
  return parts.join(' ');
}
