import { useState } from 'react';
import { CONFIG } from '../../config';
import { parseAddons, parseRupees, parseVariants, type Item } from '../../contract';
import k from '../kit/kit.module.css';

export interface DraftOption {
  readonly id: string;
  readonly name: string;
  readonly price: string;
}

const R = CONFIG.money.paisePerRupee;

export function useItemOptions(item: Item | undefined) {
  const [variants, setVariants] = useState<readonly DraftOption[]>(() => item
    ? parseVariants(item).map((v, i) => ({ id: v.id ?? `variant-${String(i)}`, name: v.name, price: String(v.price / R) }))
    : []);
  const [addons, setAddons] = useState<readonly DraftOption[]>(() => item
    ? parseAddons(item).map((a, i) => ({ id: a.id ?? `addon-${String(i)}`, name: a.name, price: String(a.price / R) }))
    : []);
  return { variants, setVariants, addons, setAddons };
}

export function validateDraftOptions(options: readonly DraftOption[], label: string): string | null {
  for (const option of options) {
    const hasName = option.name.trim().length > 0;
    const hasPrice = option.price.trim().length > 0;
    if (!hasName && hasPrice) return `Give this ${label} a name`;
    if (hasName && parseRupees(option.price) === null) return `Check price for "${option.name.trim()}"`;
  }
  return null;
}

export function serializeOptions(options: readonly DraftOption[]): string {
  return JSON.stringify(options
    .filter((option) => option.name.trim())
    .map((option) => ({ id: option.id, name: option.name.trim(), price: parseRupees(option.price) ?? 0 })));
}

function OptionRows({ label, options, onChange }: {
  label: 'variant' | 'add-on';
  options: readonly DraftOption[];
  onChange: (next: readonly DraftOption[]) => void;
}) {
  const title = label === 'variant' ? 'Variants (sizes / portions)' : 'Add-ons (extras / toppings)';
  const addLabel = label === 'variant' ? 'Add variant' : 'Add add-on';
  const placeholder = label === 'variant' ? 'e.g. Half, Full, Large' : 'e.g. Extra cheese, Mayo';
  const update = (index: number, patch: Partial<DraftOption>) => {
    onChange(options.map((option, i) => i === index ? { ...option, ...patch } : option));
  };
  const remove = (index: number) => { onChange(options.filter((_, i) => i !== index)); };
  const add = () => { onChange([...options, { id: `${label}-${String(Date.now())}-${String(options.length)}`, name: '', price: '' }]); };

  return (
    <div className={k.field} role="group" aria-label={title}>
      <div className={k.fieldLab}>{title}</div>
      {options.map((option, index) => (
        <div className={k.row} key={option.id}>
          <input className={k.input} style={{ flex: 1, minWidth: 0 }} aria-label={`${label} name ${String(index + 1)}`} placeholder={placeholder}
            value={option.name} onChange={(e) => { update(index, { name: e.target.value }); }} />
          <input className={k.input} style={{ width: '6.5rem', minWidth: 0 }} aria-label={`${label} price ${String(index + 1)}`} inputMode="decimal"
            placeholder="Price ₹" value={option.price} onChange={(e) => { update(index, { price: e.target.value }); }} />
          <button type="button" className={k.quiet} aria-label={`Remove ${label} ${String(index + 1)}`} onClick={() => { remove(index); }}>×</button>
        </div>
      ))}
      <button type="button" className={k.quiet} onClick={add}>+ {addLabel}</button>
    </div>
  );
}

export function ItemOptionsEditor({ variants, onVariants, addons, onAddons }: {
  variants: readonly DraftOption[];
  onVariants: (next: readonly DraftOption[]) => void;
  addons: readonly DraftOption[];
  onAddons: (next: readonly DraftOption[]) => void;
}) {
  return <>
    <OptionRows label="variant" options={variants} onChange={onVariants} />
    <OptionRows label="add-on" options={addons} onChange={onAddons} />
  </>;
}
