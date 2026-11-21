import { useState } from 'react';
import { CONFIG } from '../../config';
import { calcItemPrice, formatItemCustomName, parseAddons, parseVariants, type ItemAddon, type ItemVariant } from '../../contract';
import { useApp } from '../../store';
import { Money } from '../kit/Money';
import { Sheet } from '../kit/Sheet';
import k from '../kit/kit.module.css';

function VariantChoice({ variant, selected, onSelect }: { variant: ItemVariant; selected: boolean; onSelect: () => void }) {
  return <button type="button" className={selected ? k.choiceOn : k.choice} aria-pressed={selected} onClick={onSelect}><span>{variant.name}</span><Money p={variant.price} /></button>;
}

function AddonChoice({ addon, selected, onToggle }: { addon: ItemAddon; selected: boolean; onToggle: () => void }) {
  return <button type="button" className={selected ? k.choiceOn : k.choice} aria-pressed={selected} onClick={onToggle}><span>{selected ? '✓ ' : '+ '}{addon.name}</span><Money p={addon.price} /></button>;
}

function QuantityRow({ qty, max, onChange }: { qty: number; max: number; onChange: (next: number) => void }) {
  return <div className={k.row}><span className={k.fieldLab}>Quantity</span><button type="button" className={k.quiet} aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => { onChange(Math.max(1, qty - 1)); }}>−</button><strong aria-live="polite">{qty}</strong><button type="button" className={k.quiet} aria-label="Increase quantity" disabled={qty >= max} onClick={() => { onChange(Math.min(max, qty + 1)); }}>+</button></div>;
}

function ItemChoices({ variants, variantKey, onVariant, addons, addonKeys, onAddon }: {
  variants: readonly ItemVariant[]; variantKey: string; onVariant: (key: string) => void;
  addons: readonly ItemAddon[]; addonKeys: readonly string[]; onAddon: (key: string) => void;
}) {
  return <>
    {variants.length ? <div className={k.field} role="group" aria-label="Choose variant"><div className={k.fieldLab}>Choose size / portion</div><div className={k.choiceRow}>{variants.map((variant) => {
      const key = variant.id ?? variant.name;
      return <VariantChoice key={key} variant={variant} selected={variantKey === key} onSelect={() => { onVariant(key); }} />;
    })}</div></div> : null}
    {addons.length ? <div className={k.field} role="group" aria-label="Add-ons"><div className={k.fieldLab}>Optional extras</div><div className={k.choiceRow}>{addons.map((addon) => {
      const key = addon.id ?? addon.name;
      return <AddonChoice key={key} addon={addon} selected={addonKeys.includes(key)} onToggle={() => { onAddon(key); }} />;
    })}</div></div> : null}
  </>;
}

export function CustomizeItemSheet({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const item = useApp((st) => st.folded.items[itemId]);
  const counter = useApp((st) => st.counter);
  const available = counter.available(itemId);
  const variants = item ? parseVariants(item) : [];
  const addons = item ? parseAddons(item) : [];
  const [variantKey, setVariantKey] = useState(() => variants[0] ? (variants[0].id ?? variants[0].name) : '');
  const [addonKeys, setAddonKeys] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  if (!item) return null;
  const variant = variants.find((v) => (v.id ?? v.name) === variantKey) ?? null;
  const chosenAddons = addons.filter((a) => addonKeys.includes(a.id ?? a.name));
  const unitPrice = calcItemPrice(item.price, variant, chosenAddons, item.discountPct);
  const customName = formatItemCustomName(item.name, variant, chosenAddons);
  const maxQty = Math.max(0, Math.min(CONFIG.limits.qtyMax, available));
  const selectedQty = Math.min(qty, maxQty);
  const toggleAddon = (key: string) => { setAddonKeys((current) => current.includes(key) ? current.filter((x) => x !== key) : [...current, key]); };
  const add = () => { for (let i = 0; i < selectedQty; i++) counter.addItemCustom(item.id, customName, unitPrice); if (selectedQty > 0) onClose(); };

  return (
    <Sheet title="Customize item" onClose={onClose}>
      <div className={k.sheetTitle}>{item.name}</div>
      <ItemChoices variants={variants} variantKey={variantKey} onVariant={setVariantKey} addons={addons} addonKeys={addonKeys} onAddon={toggleAddon} />
      {item.discountPct > 0 ? <div className={k.hint}>{item.discountPct}% item discount applied to the selected options.</div> : null}
      {maxQty === 0 ? <div className={k.err} role="alert">Sold out</div> : null}
      <QuantityRow qty={selectedQty} max={maxQty} onChange={setQty} />
      <div className={k.row}><div><div className={k.fieldLab}>Unit price</div><Money p={unitPrice} /></div><div><div className={k.fieldLab}>Total</div><Money p={unitPrice * selectedQty} /></div></div>
      <div className={k.row}><button type="button" className={k.quiet} onClick={onClose}>Cancel</button><span className={k.grow} /><button type="button" className={k.cta} disabled={selectedQty === 0} onClick={add}>Add to order</button></div>
    </Sheet>
  );
}
