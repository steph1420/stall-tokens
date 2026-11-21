import { useState } from 'react';
import { calcItemPrice, formatItemCustomName, parseAddons, parseVariants, type ItemAddon, type ItemVariant } from '../../contract';
import { useApp } from '../../store';
import { Money } from '../kit/Money';
import { Sheet } from '../kit/Sheet';
import k from '../kit/kit.module.css';

function VariantChoice({ variant, selected, onSelect }: { variant: ItemVariant; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={selected ? k.choiceOn : k.choice} aria-pressed={selected} onClick={onSelect}>
      <span>{variant.name}</span><Money p={variant.price} />
    </button>
  );
}

function AddonChoice({ addon, selected, onToggle }: { addon: ItemAddon; selected: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={selected ? k.choiceOn : k.choice} aria-pressed={selected} onClick={onToggle}>
      <span>{selected ? '✓ ' : '+ '}{addon.name}</span><Money p={addon.price} />
    </button>
  );
}

function QuantityRow({ qty, onChange }: { qty: number; onChange: (next: number) => void }) {
  return (
    <div className={k.row}>
      <span className={k.fieldLab}>Quantity</span>
      <button type="button" className={k.quiet} aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => { onChange(Math.max(1, qty - 1)); }}>−</button>
      <strong aria-live="polite">{qty}</strong>
      <button type="button" className={k.quiet} aria-label="Increase quantity" onClick={() => { onChange(qty + 1); }}>+</button>
    </div>
  );
}

export function CustomizeItemSheet({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const item = useApp((st) => st.folded.items[itemId]);
  const counter = useApp((st) => st.counter);
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
  const toggleAddon = (key: string) => {
    setAddonKeys((current) => current.includes(key) ? current.filter((x) => x !== key) : [...current, key]);
  };
  const add = () => {
    for (let i = 0; i < qty; i++) counter.addItemCustom(item.id, customName, unitPrice);
    onClose();
  };

  return (
    <Sheet title="Customize item" onClose={onClose}>
      <div className={k.sheetTitle}>{item.name}</div>
      {variants.length ? <div className={k.field} role="group" aria-label="Choose variant">
        <div className={k.fieldLab}>Choose size / portion</div>
        <div className={k.choiceRow}>{variants.map((v) => {
          const key = v.id ?? v.name;
          return <VariantChoice key={key} variant={v} selected={variantKey === key} onSelect={() => { setVariantKey(key); }} />;
        })}</div>
      </div> : null}
      {addons.length ? <div className={k.field} role="group" aria-label="Add-ons">
        <div className={k.fieldLab}>Optional extras</div>
        <div className={k.choiceRow}>{addons.map((a) => {
          const key = a.id ?? a.name;
          return <AddonChoice key={key} addon={a} selected={addonKeys.includes(key)} onToggle={() => { toggleAddon(key); }} />;
        })}</div>
      </div> : null}
      {item.discountPct > 0 ? <div className={k.hint}>{item.discountPct}% item discount applied to the selected options.</div> : null}
      <QuantityRow qty={qty} onChange={setQty} />
      <div className={k.row}>
        <div><div className={k.fieldLab}>Unit price</div><Money p={unitPrice} /></div>
        <div><div className={k.fieldLab}>Total</div><Money p={unitPrice * qty} /></div>
      </div>
      <div className={k.row}>
        <button type="button" className={k.quiet} onClick={onClose}>Cancel</button>
        <span className={k.grow} />
        <button type="button" className={k.cta} onClick={add}>Add to order</button>
      </div>
    </Sheet>
  );
}
