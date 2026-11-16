// F-23..F-29 Money ops in the fold. Entries only add (they never clash, plan §2); a void keeps the record.
// Parts are checked here because ops come from other devices too: a part with a bad amount or source is dropped,
// and an entry whose parts do not add up to its amount is kept with one Register part (never half-applied).
import type { Entry, MoneyPart, Op } from '../../contract';
import { lww } from './lww';
import type { Folded } from './state';

const SOURCES: ReadonlySet<string> = new Set(['register', 'upi', 'person']);
function cleanParts(raw: readonly unknown[], amount: number): MoneyPart[] {
  const parts = raw.flatMap((p): MoneyPart[] => {
    if (typeof p !== 'object' || p === null) return [];
    const r = p as Record<string, unknown>;
    if (typeof r.source !== 'string' || !SOURCES.has(r.source) || typeof r.amount !== 'number' || !Number.isFinite(r.amount) || r.amount <= 0) return [];
    const personId = typeof r.personId === 'string' && r.personId ? r.personId : null;
    if (r.source === 'person' && !personId) return [];
    return [{ source: r.source as MoneyPart['source'], personId: r.source === 'person' ? personId : null, amount: Math.trunc(r.amount) }];
  });
  const sum = parts.reduce((t, p) => t + p.amount, 0);
  return sum === amount ? parts : [{ source: 'register', personId: null, amount }];
}

export function applyMoneyOp(s: Folded, op: Op<'person.set' | 'entry.add' | 'entry.void'>): Folded {
  switch (op.kind) {
    case 'person.set': {
      const st = lww(s, `person:${op.body.personId}`, 'all', op).state;
      const { personId: id, name, isPartner, sharePct, removed } = op.body;
      const people = removed
        ? Object.fromEntries(Object.entries(st.people).filter(([k]) => k !== id))
        : { ...st.people, [id]: { id, name, isPartner, sharePct: Math.max(0, Math.min(100, sharePct)) } };
      return { ...st, people };
    }
    case 'entry.add': {
      const b = op.body;
      const amount = Math.trunc(b.amount);
      if (amount <= 0 || s.entries.some((e) => e.id === b.entryId)) return s;
      const e: Entry = {
        id: b.entryId, dayId: b.dayId, dir: b.dir === 'received' ? 'received' : 'spent', amount, label: b.label, kind: b.kind === 'donation' ? 'donation' : 'normal',
        parts: cleanParts(b.parts, amount), note: b.note, personId: typeof b.personId === 'string' && b.personId ? b.personId : null, at: op.wallAt, by: op.writer, voided: null,
      };
      return { ...s, entries: [...s.entries, e] };
    }
    case 'entry.void':
      return { ...s, entries: s.entries.map((e) => (e.id === op.body.entryId && e.voided === null ? { ...e, voided: op.body.reason || 'voided' } : e)) };
  }
}
