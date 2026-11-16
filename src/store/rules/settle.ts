// F-26..F-29 Settlement rules (pure; Q-PART-1 C, Q-NEXT-2 A, Q-SETTLE-GAPS). Balances run across days, so what is
// not settled carries over to the next fair by itself. + = the stall owes the person; − = the person holds stall money.
import type { Entry, Order, Paise, Person, Settlement } from '../../contract';
import type { Folded } from '../fold/state';
import { dayMoney } from './money';

const live = (xs: readonly Settlement[]) => xs.filter((x) => !x.undone);
const personParts = (e: Entry, id: string) => e.parts.filter((p) => p.source === 'person' && p.personId === id).reduce((t, p) => t + p.amount, 0);

/** Balance per person from Spent (paid personally), Received (paid in by them / landed in their pocket) and settlements. */
export function balances(f: Pick<Folded, 'entries' | 'settlements' | 'people'>): Record<string, Paise> {
  const out: Record<string, Paise> = Object.fromEntries(Object.keys(f.people).map((id) => [id, 0]));
  const add = (id: string, v: Paise) => { out[id] = (out[id] ?? 0) + v; };
  for (const e of f.entries.filter((x) => x.voided === null)) {
    for (const id of new Set(e.parts.flatMap((p) => (p.personId ? [p.personId] : [])))) add(id, e.dir === 'spent' ? personParts(e, id) : -personParts(e, id));
    if (e.dir === 'received' && e.personId) add(e.personId, e.amount);
  }
  for (const x of live(f.settlements)) {
    add(x.personId, -x.amount);
    if (x.kind === 'pay' && x.via === 'person' && x.byPersonId) add(x.byPersonId, x.amount); // a partner covering someone gets it added back
  }
  return out;
}

/** What the person's balance is made of, for the sheet subtitle ("Bought ice · 2 entries"). */
export function balanceWhy(f: Pick<Folded, 'entries'>, id: string): { labels: string[]; count: number } {
  const es = f.entries.filter((e) => e.voided === null && (e.personId === id || e.parts.some((p) => p.personId === id)));
  return { labels: [...new Set(es.map((e) => e.label))].slice(0, 2), count: es.length };
}

export interface Split {
  readonly inHand: Paise; readonly toSplit: Paise; readonly others: readonly { person: Person; owed: Paise }[];
  readonly partners: readonly { person: Person; share: Paise; owed: Paise; covering: readonly { personId: string; amount: Paise }[] }[];
  readonly sharesOk: boolean;
}
/** Settle up for one day: step 1 repay others; step 2 split what is left between partners by share, each partner's own
 * balance added back (Q-NEXT-2 A). Tips stay out (D-MONEY). A loss day gives negative shares: partners pay in. */
export function split(f: Folded, orders: readonly Order[], dayId: string): Split {
  const d = dayMoney(orders, f.entries, dayId);
  const pays = live(f.settlements).filter((x) => x.kind === 'pay' && x.dayId === dayId && x.via !== 'person').reduce((t, x) => t + x.amount, 0);
  const inHand = d.registerFlow + d.upiFlow - d.tips - pays;
  const bal = balances(f);
  const people = Object.values(f.people);
  const others = people.filter((p) => !p.isPartner && (bal[p.id] ?? 0) !== 0).map((p) => ({ person: p, owed: bal[p.id] ?? 0 }));
  const owedOthers = others.reduce((t, o) => t + o.owed, 0);
  const ps = people.filter((p) => p.isPartner);
  const owedPartners = ps.reduce((t, p) => t + (bal[p.id] ?? 0), 0);
  const base = inHand - owedOthers - owedPartners;
  const covering = (id: string) => live(f.settlements).filter((x) => x.kind === 'pay' && x.byPersonId === id).map((x) => ({ personId: x.personId, amount: x.amount }));
  const partners = ps.map((p) => ({ person: p, owed: bal[p.id] ?? 0, covering: covering(p.id), share: Math.round((base * p.sharePct) / 100) + (bal[p.id] ?? 0) }));
  return { inHand, toSplit: inHand - owedOthers, others, partners, sharesOk: ps.reduce((t, p) => t + p.sharePct, 0) === 100 };
}
