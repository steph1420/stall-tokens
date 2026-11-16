// F-35 F-48 Q-HARM-10: apps-script/Code.gs stays in step with the app. Log projections only write declared columns;
// the bridge's fold (which rewrites the info tabs) gives the same state and the same clashes as the app's fold,
// under clock skew, offline concurrency, duplicates and Sheet hand edits; hand edits become the right ops; gaps
// are reported for resend.
import { describe, expect, it } from 'vitest';
import { compareOps, OP_KINDS, type Bodies, type Op, type OpKind, type VV } from '../contract';
import { fold } from '../store/fold/fold';
import code from '../../apps-script/Code.gs?raw';

type Row = Record<string, unknown>;
interface Gs {
  TABS: Record<string, [string, string, string][]>; INFO_ORDER: string[]; LOG_TABS: string[];
  infoCols_: (t: string) => [string, string, string][];
  project_: (op: unknown) => [string, Row] | null;
  foldState_: (ops: unknown[]) => { conflicts: { winner: string; loser: string; rule: string }[] };
  renderRows_: (s: unknown) => Record<string, Row[]>;
  rowToOps_: (tab: string, row: Row, edited: string[]) => { kind: string; body: Row }[];
  gaps_: (vv: VV, ops: unknown[]) => { writer: string; fromSeq: number }[];
}
// The .gs file is plain ES5; load it the way Apps Script would, as one script, and read what it exports for tests.
// eslint-disable-next-line @typescript-eslint/no-implied-eval -- test-only load of the repo's own Apps Script file
const load = new Function('module', `${code}\nreturn module.exports;`) as (m: { exports: unknown }) => Gs;
const gs = load({ exports: {} });

const DAY = 86_400_000;
function op<K extends OpKind>(writer: string, seq: number, lamport: number, vv: VV, kind: K, body: Bodies[K], wallAt = 1_794_800_000_000): Op {
  return { v: 2, opId: `${writer}:${String(seq)}`, writer, seq, lamport, vv, wallAt, kind, body } as Op;
}
function scenario(): Op[] {
  const a = 'aaaa.1'; const b = 'bbbb.1';
  return [
    op(a, 1, 1, {}, 'item.set', { itemId: 'tea', fields: { name: 'Tea', price: 2000, count: 10, stationId: 'Beverages', category: 'Drinks' } }, 1_794_800_000_000 + DAY),
    op(a, 2, 2, { [a]: 1 }, 'order.create', { orderId: 'o1', dayId: 'd1', token: 1, servedBy: 'A' }),
    op(a, 3, 3, { [a]: 2 }, 'line.add', { orderId: 'o1', lineId: 'l1', itemId: 'tea', name: 'Tea', price: 2000, category: 'Drinks', stationId: 'Beverages', qty: 3 }),
    op(a, 4, 4, { [a]: 3 }, 'order.send', { orderId: 'o1' }),
    op(b, 1, 5, {}, 'item.set', { itemId: 'tea', fields: { price: 2500 } }, 1_794_800_000_000 - DAY), // offline, concurrent
    op(a, 5, 5, { [a]: 4 }, 'item.set', { itemId: 'tea', fields: { price: 2200 } }),
    op('sheet', 1, 6, { [a]: 5 }, 'record.set', { table: 'source', id: 's1', fields: { name: 'Crawford Market', type: 'Market' }, removed: false }),
    op(b, 2, 7, { [b]: 1 }, 'record.set', { table: 'source', id: 's1', fields: { name: 'Old' }, removed: false }),
    op(a, 6, 8, { [a]: 5, sheet: 1 }, 'stock.adjust', { itemId: 'tea', delta: 4, reason: 'stock' }),
    op(a, 7, 9, { [a]: 6 }, 'person.set', { personId: 'p1', name: 'Ravi', isPartner: true, sharePct: 50, removed: false }),
  ];
}

describe('sheet bridge (F-35 F-48 Q-HARM-10)', () => {
  it('log projections only write declared columns, with op_id; info and log tabs never share a name', () => {
    for (const kind of OP_KINDS) {
      const p = gs.project_({ opId: 'dev1.a:1', kind, wallAt: 0, body: { orderId: 'o1', fields: {} } });
      if (!p) continue;
      const cols = (gs.TABS[p[0]] ?? []).map((c) => c[0]);
      for (const k of Object.keys(p[1])) expect(cols, `${kind}: ${k}`).toContain(k);
      expect(p[1].op_id).toBe('dev1.a:1');
    }
    for (const t of gs.INFO_ORDER) expect(gs.TABS[t], t).toBeUndefined();
    for (const t of gs.LOG_TABS) expect(gs.TABS[t], t).toBeDefined();
  });
  it('the bridge fold matches the app fold in any arrival order (clock skew ±1 day, concurrency, duplicates, sheet wins)', () => {
    const ops = scenario();
    const shuffled = [...ops].reverse().concat(ops.slice(0, 3));
    const app = fold([...ops].sort(compareOps));
    const S = gs.foldState_(shuffled);
    const rows = gs.renderRows_(S);
    const tea = rows.stock_current?.find((r) => r.item_id === 'tea');
    expect([app.items.tea?.price, app.items.tea?.count, app.items.tea?.sold]).toEqual([2500, 11, 3]);
    expect([rows.menu?.[0]?.price_inr, tea?.on_hand, tea?.sold]).toEqual([25, 11, 3]);
    expect(rows.sources?.[0]?.name).toBe(app.records.source?.s1?.fields.name);
    expect(rows.sources?.[0]?.name).toBe('Crawford Market');
    expect(S.conflicts.map((c) => [c.winner, c.loser, c.rule])).toEqual(app.conflicts.map((c) => [c.winner, c.loser, c.rule]));
    expect(rows.partners?.[0]).toMatchObject({ person_id: 'p1', name: 'Ravi', share_pct: 50, active: true });
  });
  it('hand edits become ops; read-only columns are ignored', () => {
    expect(gs.rowToOps_('menu', { item_id: 'tea', price_inr: 25.5, name: 'Tea' }, ['price_inr', 'updated_at'])).toEqual([{ kind: 'item.set', body: { itemId: 'tea', fields: { price: 2550 } } }]);
    expect(gs.rowToOps_('stock_current', { item_id: 'tea', sold: 9 }, ['sold'])).toEqual([]);
    const p = gs.rowToOps_('partners', { person_id: 'p9', name: 'Asha', share_pct: 40, phone: '98', active: true }, ['person_id', 'name', 'share_pct', 'phone', 'active']);
    expect(p.map((x) => x.kind)).toEqual(['person.set', 'record.set']);
    const d = gs.rowToOps_('event_days', { day_id: 'd1', float_inr: 500, open_time: '17:00', active: true }, ['float_inr', 'open_time']);
    expect(d).toEqual([{ kind: 'setting.set', body: { key: 'float:d1', value: '50000' } }, { kind: 'record.set', body: { table: 'event_day', id: 'd1', fields: { open_time: '17:00' }, removed: false } }]);
  });
  it('a gap in seq asks for a resend from the first missing op', () => {
    expect(gs.gaps_({ 'aaaa.1': 2 }, [{ writer: 'aaaa.1', seq: 5 }, { writer: 'bbbb.1', seq: 1 }])).toEqual([{ writer: 'aaaa.1', fromSeq: 3 }]);
    expect(gs.gaps_({}, [{ writer: 'x.1', seq: 1 }, { writer: 'x.1', seq: 2 }])).toEqual([]);
  });
});
