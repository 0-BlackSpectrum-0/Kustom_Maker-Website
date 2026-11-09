// src/core/archive/reader.ts
import { unzipSync } from 'fflate';
import type { Doc, PresetKind } from '../model/types.ts';
import { parsePresetJson } from '../model/parser.ts';

export interface ReadOptions {
  fileName?: string;
}

export function readPresetArchive(zipBytes: Uint8Array, options: ReadOptions = {}): Doc {
  const unzipped = unzipSync(zipBytes);
  const entryNames = Object.keys(unzipped);

  // Determine kind and root json
  let rootJsonName = 'preset.json';
  let kind: PresetKind = 'kwgt';

  if (entryNames.includes('komponent.json')) {
    rootJsonName = 'komponent.json';
    kind = 'komp';
  } else if (options.fileName?.endsWith('.klwp')) {
    kind = 'klwp';
  } else if (options.fileName?.endsWith('.komp')) {
    kind = 'komp';
  }

  if (!unzipped[rootJsonName]) {
    throw new Error(`Archive missing root JSON (${rootJsonName})`);
  }

  const decoder = new TextDecoder('utf-8');
  const jsonText = decoder.decode(unzipped[rootJsonName]);
  const rawData = JSON.parse(jsonText);

  // Check if locked
  if (rawData.preset_root?.internal_readonly === true || rawData.internal_readonly === true) {
    throw new Error('Preset is locked (internal_readonly: true). Decryption not supported.');
  }

  if (kind !== 'komp' && rawData.preset_info?.xscreens !== undefined) {
    // If xscreens is defined and > 0, or wallpaper specific fields present
    if (rawData.preset_root?.background_scroll !== undefined || rawData.preset_root?.internal_flows !== undefined) {
      kind = 'klwp';
    }
  }

  const { info, root, globals, extras } = parsePresetJson(rawData, kind);

  // Thumbnails
  const thumbs: Doc['thumbs'] = {};
  if (unzipped['preset_thumb_portrait.jpg']) {
    thumbs.portrait = unzipped['preset_thumb_portrait.jpg'];
  }
  if (unzipped['preset_thumb_landscape.jpg']) {
    thumbs.landscape = unzipped['preset_thumb_landscape.jpg'];
  }
  if (unzipped['komponent_thumb.jpg']) {
    thumbs.komp = unzipped['komponent_thumb.jpg'];
  }

  // Assets
  const assets = new Map<string, Uint8Array>();
  for (const name of entryNames) {
    if (
      name === 'preset.json' ||
      name === 'komponent.json' ||
      name === 'preset_thumb_portrait.jpg' ||
      name === 'preset_thumb_landscape.jpg' ||
      name === 'komponent_thumb.jpg'
    ) {
      continue;
    }
    // Skip directory entries if any
    if (name.endsWith('/')) continue;
    assets.set(name, unzipped[name]);
  }

  return {
    kind,
    info,
    root,
    globals,
    assets,
    thumbs,
    extras,
    originalEntryOrder: entryNames,
  };
}
