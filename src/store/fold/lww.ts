// F-02 Last-writer-wins by fold order, with conflict recording (Q-HARM-10): when two writers set the
// same field without having seen each other's op, both stay in the log and a Conflict row is added.
import type { Op } from '../../contract';
import type { Folded } from './state';

export function lww(s: Folded, target: string, field: string, op: Op): { state: Folded; conflict: boolean } {
  const key = `${target}|${field}`;
  const prev = s.lastWrite[key];
  const lastWrite = { ...s.lastWrite, [key]: { writer: op.writer, seq: op.seq, opId: op.opId } };
  const concurrent = prev !== undefined && prev.writer.split('.')[0] !== op.writer.split('.')[0] && (op.vv[prev.writer] ?? 0) < prev.seq;
  if (!concurrent) return { state: { ...s, lastWrite }, conflict: false };
  const conflict = { target, field, winner: op.opId, loser: prev.opId, at: op.wallAt };
  return { state: { ...s, lastWrite, conflicts: [...s.conflicts, conflict] }, conflict: true };
}
