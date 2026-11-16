// data/: interfaces for every outside system (06 rule 4). Only store/ calls data/. Each has a fake.
import type { Op } from '../contract';

/** The op log on this device. */
export interface OpStore {
  load(): Promise<Op[]>;
  /** Append ops; duplicates by opId are ignored. Rejects on quota or private-mode errors. */
  append(ops: readonly Op[]): Promise<void>;
  /** False when ops live in memory only (no usable IndexedDB). Absent = persistent. */
  persistent?(): boolean;
}

/** One way ops travel between devices (Sheet bridge now; Bluetooth / local peer later). ARCHITECTURE §4.3. */
export interface Transport {
  readonly name: string;
  /** Send ops; resolves with the opIds the other side has stored. */
  push(ops: readonly Op[]): Promise<string[]>;
  /** Fetch ops after the cursor. */
  pull(cursor: string): Promise<{ ops: Op[]; cursor: string }>;
}

/** Same-device tabs. */
export interface TabChannel {
  post(ops: readonly Op[]): void;
  subscribe(listener: (ops: Op[]) => void): () => void;
}

export interface DevicePrefs {
  deviceId: string;
  theme: 'night' | 'day';
  servingName: string;
  rangeIndex: number;
  haptics: 'off' | 'light' | 'normal' | 'strong';
  autoPrep: boolean;
  stationLook: 'full' | 'items' | 'ticket';
  /** Q-ORDERS-5: Open Orders body look. */
  openLook: 'lines' | 'cards';
}

/** Per-device settings (not synced on purpose). */
export interface DeviceStore {
  read(): DevicePrefs;
  write(prefs: DevicePrefs): void;
}

export interface DataSource {
  readonly ops: OpStore;
  readonly device: DeviceStore;
  readonly channel: TabChannel;
  readonly transports: readonly Transport[];
}
