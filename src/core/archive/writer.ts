// src/core/archive/writer.ts
import { zipSync, type Zippable } from 'fflate';
import type { Doc } from '../model/types.ts';
import { serializePresetJsonString } from '../model/serializer.ts';

export interface WriteOptions {
  preserveEntryOrder?: boolean;
  fixedTimestamp?: Date;
}

export function writePresetArchive(doc: Doc, options: WriteOptions = {}): Uint8Array {
  const isKomp = doc.kind === 'komp';
  const rootJsonName = isKomp ? 'komponent.json' : 'preset.json';

  const jsonString = serializePresetJsonString(doc);
  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(jsonString);

  const zippable: Zippable = {};

  if (options.preserveEntryOrder && doc.originalEntryOrder && doc.originalEntryOrder.length > 0) {
    for (const name of doc.originalEntryOrder) {
      if (name === rootJsonName) {
        zippable[rootJsonName] = [jsonBytes, { level: 6 }];
      } else if (name === 'preset_thumb_portrait.jpg' && doc.thumbs.portrait) {
        zippable['preset_thumb_portrait.jpg'] = [doc.thumbs.portrait, { level: 6 }];
      } else if (name === 'preset_thumb_landscape.jpg' && doc.thumbs.landscape) {
        zippable['preset_thumb_landscape.jpg'] = [doc.thumbs.landscape, { level: 6 }];
      } else if (name === 'komponent_thumb.jpg' && doc.thumbs.komp) {
        zippable['komponent_thumb.jpg'] = [doc.thumbs.komp, { level: 6 }];
      } else if (doc.assets.has(name)) {
        zippable[name] = [doc.assets.get(name)!, { level: 6 }];
      }
    }

    // Add any new assets or thumbs that weren't in originalEntryOrder
    if (doc.thumbs.portrait && !zippable['preset_thumb_portrait.jpg']) {
      zippable['preset_thumb_portrait.jpg'] = [doc.thumbs.portrait, { level: 6 }];
    }
    if (doc.thumbs.landscape && !zippable['preset_thumb_landscape.jpg']) {
      zippable['preset_thumb_landscape.jpg'] = [doc.thumbs.landscape, { level: 6 }];
    }
    if (doc.thumbs.komp && !zippable['komponent_thumb.jpg']) {
      zippable['komponent_thumb.jpg'] = [doc.thumbs.komp, { level: 6 }];
    }
    for (const [k, v] of doc.assets.entries()) {
      if (!zippable[k]) {
        zippable[k] = [v, { level: 6 }];
      }
    }
  } else {
    // Canonical entry order per section 9.1
    zippable[rootJsonName] = [jsonBytes, { level: 6 }];

    if (isKomp) {
      if (doc.thumbs.komp) {
        zippable['komponent_thumb.jpg'] = [doc.thumbs.komp, { level: 6 }];
      }
    } else {
      if (doc.thumbs.portrait) {
        zippable['preset_thumb_portrait.jpg'] = [doc.thumbs.portrait, { level: 6 }];
      }
      if (doc.thumbs.landscape) {
        zippable['preset_thumb_landscape.jpg'] = [doc.thumbs.landscape, { level: 6 }];
      }
    }

    // Sort asset entries for deterministic archive layout
    const assetKeys = Array.from(doc.assets.keys()).sort();
    for (const key of assetKeys) {
      zippable[key] = [doc.assets.get(key)!, { level: 6 }];
    }
  }

  return zipSync(zippable);
}
