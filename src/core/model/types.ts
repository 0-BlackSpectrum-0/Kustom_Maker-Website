// src/core/model/types.ts

export type PresetKind = 'klwp' | 'kwgt' | 'komp';

export class LexNumber {
  public readonly v: number;
  public readonly raw: string;
  constructor(v: number, raw: string) {
    this.v = v;
    this.raw = raw;
  }
  valueOf(): number {
    return this.v;
  }
  toString(): string {
    return this.raw;
  }
  toJSON(): unknown {
    return this.v;
  }
}

export interface PresetInfo {
  title?: string;
  description?: string;
  author?: string;
  email?: string;
  version?: number;
  release?: number;
  width?: number;
  height?: number;
  locked?: boolean;
  features?: string;
  pflags?: number;
  archive?: string | null;
  xscreens?: number;
  yscreens?: number;
  hash?: string;
  id?: string;
  ts?: number;
  infoKeyOrder?: string[];
  originalKeyOrder?: string[];
  [key: string]: unknown;
}

export interface Prop {
  value?: unknown;
  formula?: string;
  global?: string;
  toggle?: number; // 0 = value, 10 = formula, 100 = global
}

export interface GlobalDef {
  index?: number;
  type?: string;
  title?: string;
  value?: unknown;
  global_formula?: string;
  min?: number;
  max?: number;
  toggles?: number;
  description?: string;
  entries?: string;
  [key: string]: unknown;
}

export interface Node {
  id: string;
  type: string;
  title: string;
  props: Record<string, Prop>;
  extras: Record<string, unknown>;
  children?: Node[];
  events?: unknown[];
  animations?: unknown[];
  flows?: unknown[];
  keyOrder?: string[];
  originalKeyOrder?: string[];
  globals?: Record<string, GlobalDef>;
}

export interface Doc {
  kind: PresetKind;
  info: PresetInfo;
  root: Node;
  globals: Record<string, GlobalDef>;
  assets: Map<string, Uint8Array>;
  thumbs: {
    portrait?: Uint8Array;
    landscape?: Uint8Array;
    komp?: Uint8Array;
  };
  extras: Record<string, unknown>;
  originalEntryOrder?: string[];
}
