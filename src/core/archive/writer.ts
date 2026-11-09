// src/core/archive/writer.ts
import { zipSync, type Zippable, type ZipOptions } from 'fflate';
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

  // MS-DOS date format used by ZIP requires dates between 1980 and 2099
  let mtime: Date | undefined;
  if (options.fixedTimestamp) {
    mtime = options.fixedTimestamp;
  } else if (doc.info.ts && typeof doc.info.ts === 'number') {
    const d = new Date(doc.info.ts);
    const yr = d.getUTCFullYear();
    if (yr >= 1980 && yr <= 2099) {
      mtime = d;
    }
  }

  const entryOpts: ZipOptions = mtime ? { level: 6, mtime } : { level: 6 };
  const zippable: Zippable = {};

  if (options.preserveEntryOrder && doc.originalEntryOrder && doc.originalEntryOrder.length > 0) {
    for (const name of doc.originalEntryOrder) {
      if (name === rootJsonName) {
        zippable[rootJsonName] = [jsonBytes, entryOpts];
      } else if (name === 'preset_thumb_portrait.jpg' && doc.thumbs.portrait) {
        zippable['preset_thumb_portrait.jpg'] = [doc.thumbs.portrait, entryOpts];
      } else if (name === 'preset_thumb_landscape.jpg' && doc.thumbs.landscape) {
        zippable['preset_thumb_landscape.jpg'] = [doc.thumbs.landscape, entryOpts];
      } else if (name === 'komponent_thumb.jpg' && doc.thumbs.komp) {
        zippable['komponent_thumb.jpg'] = [doc.thumbs.komp, entryOpts];
      } else if (doc.assets && doc.assets.has && doc.assets.has(name)) {
        zippable[name] = [doc.assets.get(name)!, entryOpts];
      }
    }

    // Add any new assets or thumbs that weren't in originalEntryOrder
    if (doc.thumbs.portrait && !zippable['preset_thumb_portrait.jpg']) {
      zippable['preset_thumb_portrait.jpg'] = [doc.thumbs.portrait, entryOpts];
    }
    if (doc.thumbs.landscape && !zippable['preset_thumb_landscape.jpg']) {
      zippable['preset_thumb_landscape.jpg'] = [doc.thumbs.landscape, entryOpts];
    }
    if (doc.thumbs.komp && !zippable['komponent_thumb.jpg']) {
      zippable['komponent_thumb.jpg'] = [doc.thumbs.komp, entryOpts];
    }
    if (doc.assets && doc.assets.entries) {
      for (const [k, v] of doc.assets.entries()) {
        if (!zippable[k]) {
          zippable[k] = [v, entryOpts];
        }
      }
    }
  } else {
    // Canonical entry order per section 9.1
    zippable[rootJsonName] = [jsonBytes, entryOpts];

    if (isKomp) {
      if (doc.thumbs.komp) {
        zippable['komponent_thumb.jpg'] = [doc.thumbs.komp, entryOpts];
      }
    } else {
      if (doc.thumbs.portrait) {
        zippable['preset_thumb_portrait.jpg'] = [doc.thumbs.portrait, entryOpts];
      }
      if (doc.thumbs.landscape) {
        zippable['preset_thumb_landscape.jpg'] = [doc.thumbs.landscape, entryOpts];
      }
    }

    // Sort asset entries for deterministic archive layout
    if (doc.assets && doc.assets.keys) {
      const assetKeys = Array.from(doc.assets.keys()).sort();
      for (const key of assetKeys) {
        zippable[key] = [doc.assets.get(key)!, entryOpts];
      }
    }
  }

  return zipSync(zippable);
}
