// src/core/model/parser.ts
import type { Node, Prop, PresetInfo, PresetKind, GlobalDef } from './types.ts';
import { parseJsonWithLex } from './json-lex.ts';

let nextId = 1;
function genId(prefix = 'node'): string {
  return `${prefix}_${Date.now()}_${nextId++}`;
}

export function parseModule(raw: Record<string, unknown>): Node {
  const originalKeyOrder = Object.keys(raw);
  const type = String(raw.internal_type || 'Unknown');
  const title = String(raw.internal_title || type);

  const toggles = (raw.internal_toggles || {}) as Record<string, number>;
  const formulas = (raw.internal_formulas || {}) as Record<string, string>;
  const globals = (raw.internal_globals || {}) as Record<string, string>;

  const props: Record<string, Prop> = {};
  const extras: Record<string, unknown> = {};

  // Collect all known property names from values, toggles, formulas, globals
  const allPropKeys = new Set<string>([
    ...Object.keys(toggles),
    ...Object.keys(formulas),
    ...Object.keys(globals),
  ]);

  for (const [k, v] of Object.entries(raw)) {
    if (
      k.startsWith('internal_') ||
      k === 'viewgroup_items' ||
      k === 'globals_list' ||
      k === 'preset_info'
    ) {
      continue;
    }
    allPropKeys.add(k);
  }

  for (const key of allPropKeys) {
    props[key] = {
      value: raw[key],
      formula: formulas[key],
      global: globals[key],
      toggle: toggles[key],
    };
  }

  // Parse nested globals_list (e.g. on Komponents)
  let nodeGlobals: Record<string, GlobalDef> | undefined;
  if (raw.globals_list && typeof raw.globals_list === 'object') {
    nodeGlobals = {};
    for (const [k, v] of Object.entries(raw.globals_list as Record<string, GlobalDef>)) {
      nodeGlobals[k] = { ...v };
    }
  }

  // Preserve extras (any internal_ or other fields not handled above)
  for (const [k, v] of Object.entries(raw)) {
    if (
      k === 'internal_type' ||
      k === 'internal_title' ||
      k === 'internal_toggles' ||
      k === 'internal_formulas' ||
      k === 'internal_globals' ||
      k === 'viewgroup_items' ||
      k === 'globals_list' ||
      k === 'internal_events' ||
      k === 'internal_animations' ||
      k === 'internal_flows' ||
      k === 'preset_info'
    ) {
      continue;
    }
    if (!allPropKeys.has(k)) {
      extras[k] = v;
    }
  }

  // Children
  let children: Node[] | undefined;
  if (Array.isArray(raw.viewgroup_items)) {
    children = raw.viewgroup_items.map((item) =>
      parseModule(item as Record<string, unknown>)
    );
  }

  const node: Node = {
    id: genId(type.toLowerCase()),
    type,
    title,
    props,
    extras,
    children,
    events: Array.isArray(raw.internal_events) ? raw.internal_events : undefined,
    animations: Array.isArray(raw.internal_animations) ? raw.internal_animations : undefined,
    flows: Array.isArray(raw.internal_flows) ? raw.internal_flows : undefined,
    keyOrder: originalKeyOrder,
    originalKeyOrder: originalKeyOrder,
    globals: nodeGlobals,
  };

  return node;
}

export function parsePresetJson(
  rawJson: string | Record<string, unknown>,
  kind: PresetKind = 'kwgt'
): { info: PresetInfo; root: Node; globals: Record<string, GlobalDef>; extras: Record<string, unknown> } {
  const data = typeof rawJson === 'string' ? parseJsonWithLex(rawJson) : rawJson;

  const rawInfo = (data.preset_info || {}) as Record<string, unknown>;
  const infoKeyOrder = data.preset_info ? Object.keys(rawInfo) : undefined;
  const info: PresetInfo = {
    ...rawInfo,
    infoKeyOrder,
    originalKeyOrder: infoKeyOrder,
  };

  const rawRoot = (data.preset_root || (kind === 'komp' ? data : {})) as Record<string, unknown>;
  const root = parseModule(rawRoot);

  const globals: Record<string, GlobalDef> = {};
  const rawGlobals = (rawRoot.globals_list || {}) as Record<string, GlobalDef>;
  for (const [k, v] of Object.entries(rawGlobals)) {
    globals[k] = { ...v };
  }
  if (!root.globals && Object.keys(globals).length > 0) {
    root.globals = globals;
  }

  const extras: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k !== 'preset_info' && k !== 'preset_root') {
      extras[k] = v;
    }
  }

  return { info, root, globals, extras };
}
