// F-35 Q-SHEET-DEPLOY: apps-script/Code.gs projections only write columns that its schema (TABS) declares, so the
// Sheet layout and the script cannot drift; every projected row carries op_id.
import { describe, expect, it } from 'vitest';
import { OP_KINDS } from '../contract';
import code from '../../apps-script/Code.gs?raw';

interface Gs { TABS: Record<string, [string, string, string][]>; project_: (op: unknown) => [string, Record<string, unknown>] | null }
// The .gs file is plain ES5; load it the way Apps Script would, as one script, and read what it exports for tests.
// eslint-disable-next-line @typescript-eslint/no-implied-eval -- test-only load of the repo's own Apps Script file
const load = new Function('module', `${code}\nreturn module.exports;`) as (m: { exports: unknown }) => Gs;
const gs = load({ exports: {} });

describe('sheet schema (F-35)', () => {
  it('projects every op kind into declared columns with op_id', () => {
    for (const kind of OP_KINDS) {
      const p = gs.project_({ opId: 'dev1.a:1', kind, wallAt: 0, body: { orderId: 'o1', fields: {} } });
      if (!p) continue;
      const cols = (gs.TABS[p[0]] ?? []).map((c) => c[0]);
      expect(cols.length, `${kind} -> ${p[0]}`).toBeGreaterThan(0);
      for (const k of Object.keys(p[1])) expect(cols, `${kind}: ${k}`).toContain(k);
      expect(p[1].op_id).toBe('dev1.a:1');
    }
  });
});
