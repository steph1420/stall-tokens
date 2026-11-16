// The store core: owns the in-memory op log and the folded state; the only caller of data/ (ARCHITECTURE §2, §4).
import { CONTRACT_VERSION, compareOps, type Bodies, type Op, type OpKind } from '../contract';
import type { DataSource, DevicePrefs, SyncEngine, SyncStatus } from '../data';
import { applyOp, fold } from './fold/fold';
import { emptyFolded, type Folded } from './fold/state';
import { initialUi, type UiState } from './ui';

export interface CoreState {
  readonly ready: boolean;
  readonly folded: Folded;
  readonly prefs: DevicePrefs;
  readonly ui: UiState;
  readonly saveError: string | null;
  readonly unsaved: readonly Op[];
  readonly sync: SyncStatus;
  /** No usable IndexedDB: orders live in this tab only (calm banner). */
  readonly memoryOnly: boolean;
}

export interface Env {
  readonly ds: DataSource;
  readonly engine: SyncEngine;
  readonly makeId: () => string;
  readonly now: () => number;
}

export interface Core {
  get(): CoreState;
  set(patch: Partial<CoreState> | ((s: CoreState) => Partial<CoreState>)): void;
  env: Env;
}

export const initialCore = (prefs: DevicePrefs): CoreState => ({
  ready: false, folded: emptyFolded(), prefs, ui: initialUi, saveError: null, unsaved: [],
  sync: { pending: 0, lastOkAt: null, error: null, online: false }, memoryOnly: false,
});

/** Save ops; a failure keeps them in `unsaved` and shows the banner (never silent). */
function makePersist(core: Core) {
  return (ops: readonly Op[]) => {
    core.env.ds.ops.append(ops).then(
      () => {
        core.set((s) => {
          const unsaved = s.unsaved.filter((u) => !ops.some((o) => o.opId === u.opId));
          return { unsaved, saveError: unsaved.length ? s.saveError : null };
        });
      },
      (e: unknown) => {
        const msg = e instanceof DOMException && e.name === 'QuotaExceededError' ? 'This phone is out of storage space.' : 'This phone could not save the last change.';
        core.set((s) => ({ saveError: msg, unsaved: [...s.unsaved, ...ops.filter((o) => !s.unsaved.some((u) => u.opId === o.opId))] }));
      },
    );
  };
}

export function createLog(core: Core, writer: string) {
  let log: Op[] = [];
  let seq = 0;

  const persist = makePersist(core);

  return {
    load(ops: Op[]) {
      log = [...ops].sort(compareOps);
      core.set({ folded: fold(log), ready: true, memoryOnly: core.env.ds.ops.persistent?.() === false });
    },
    /** Make, apply and save one local op. */
    dispatch<K extends OpKind>(kind: K, body: Bodies[K]): Op {
      const f = core.get().folded;
      seq += 1;
      const op = { v: CONTRACT_VERSION, opId: `${writer}:${String(seq)}`, writer, seq, lamport: f.lamport + 1, vv: f.seen, wallAt: core.env.now(), kind, body } as Op;
      log.push(op);
      core.set({ folded: applyOp(f, op) });
      persist([op]);
      core.env.ds.channel.post([op]);
      core.env.engine.enqueue([op]);
      return op;
    },
    /** Ops from other tabs or devices. Re-folds when they land in the past. */
    intake(ops: readonly Op[], save: boolean) {
      const f = core.get().folded;
      const fresh = ops.filter((o) => !f.applied.has(o.opId));
      if (!fresh.length) return;
      const last = log[log.length - 1];
      log = [...log, ...fresh].sort(compareOps);
      const inOrder = !last || fresh.every((o) => compareOps(o, last) > 0);
      core.set({ folded: inOrder ? fresh.sort(compareOps).reduce(applyOp, f) : fold(log) });
      if (save) persist(fresh);
    },
    retrySave() { persist(core.get().unsaved); },
    all: () => log,
  };
}
export type Log = ReturnType<typeof createLog>;
