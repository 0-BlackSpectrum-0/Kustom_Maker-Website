// src/core/model/serializer.ts
import type { Node, PresetInfo, GlobalDef } from './types.ts';
import { stringifyWithLex } from './json-lex.ts';

export function serializeModule(node: Node, isRoot = false, globals?: Record<string, GlobalDef>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const toggles: Record<string, number> = {};
  const formulas: Record<string, string> = {};
  const modGlobals: Record<string, string> = {};

  if (node.props) {
    for (const [key, prop] of Object.entries(node.props)) {
      if (prop.toggle !== undefined) {
        toggles[key] = prop.toggle;
      }
      if (prop.formula !== undefined && prop.formula !== '') {
        formulas[key] = prop.formula;
      }
      if (prop.global !== undefined && prop.global !== '') {
        modGlobals[key] = prop.global;
      }
      if (prop.value !== undefined) {
        result[key] = prop.value;
      }
    }
  }

  result.internal_type = node.type;
  result.internal_title = node.title;

  if (Object.keys(toggles).length > 0) {
    result.internal_toggles = toggles;
  }
  if (Object.keys(formulas).length > 0) {
    result.internal_formulas = formulas;
  }
  if (Object.keys(modGlobals).length > 0) {
    result.internal_globals = modGlobals;
  }

  if (node.events && node.events.length > 0) {
    result.internal_events = node.events;
  }
  if (node.animations && node.animations.length > 0) {
    result.internal_animations = node.animations;
  }
  if (node.flows && node.flows.length > 0) {
    result.internal_flows = node.flows;
  }

  // If root and globals present, or if child node has globals (e.g. KomponentModule)
  const effectiveGlobals = isRoot && globals ? globals : node.globals;
  if (effectiveGlobals && Object.keys(effectiveGlobals).length > 0) {
    result.globals_list = effectiveGlobals;
  }

  // Extras
  if (node.extras) {
    for (const [k, v] of Object.entries(node.extras)) {
      result[k] = v;
    }
  }

  // Children
  if (node.children && node.children.length > 0) {
    result.viewgroup_items = node.children.map((child) =>
      serializeModule(child, false)
    );
  }

  // If node has keyOrder or originalKeyOrder, preserve key order
  const keyOrder = node.keyOrder || node.originalKeyOrder;
  if (keyOrder && keyOrder.length > 0) {
    const ordered: Record<string, unknown> = {};
    for (const key of keyOrder) {
      if (key in result) {
        ordered[key] = result[key];
      }
    }
    // Append any keys that weren't in keyOrder
    for (const key of Object.keys(result)) {
      if (!(key in ordered)) {
        ordered[key] = result[key];
      }
    }
    return ordered;
  }

  return result;
}

export function serializePresetJson(
  doc: { info: PresetInfo; root: Node; globals?: Record<string, GlobalDef>; extras?: Record<string, unknown>; kind?: string }
): Record<string, unknown> {
  const isKomp = doc.kind === 'komp';

  const serializedRoot = serializeModule(doc.root, true, doc.globals);

  // Preserve preset_info key order if present
  let infoObj: Record<string, unknown> = { ...doc.info };
  const origInfoOrder = doc.info.infoKeyOrder || (doc.info as Record<string, unknown>).originalKeyOrder as string[] | undefined;
  delete infoObj.originalKeyOrder;
  delete infoObj.infoKeyOrder;

  if (origInfoOrder && origInfoOrder.length > 0) {
    const orderedInfo: Record<string, unknown> = {};
    for (const k of origInfoOrder) {
      if (k in infoObj) {
        orderedInfo[k] = infoObj[k];
      }
    }
    for (const k of Object.keys(infoObj)) {
      if (!(k in orderedInfo)) {
        orderedInfo[k] = infoObj[k];
      }
    }
    infoObj = orderedInfo;
  }

  if (isKomp) {
    return {
      preset_info: infoObj,
      ...serializedRoot,
      ...(doc.extras || {}),
    };
  }

  return {
    preset_info: infoObj,
    preset_root: serializedRoot,
    ...(doc.extras || {}),
  };
}

export function serializePresetJsonString(
  doc: { info: PresetInfo; root: Node; globals?: Record<string, GlobalDef>; extras?: Record<string, unknown>; kind?: string }
): string {
  const obj = serializePresetJson(doc);
  return stringifyWithLex(obj, 2);
}
