import { describe, it, expect, beforeEach } from 'vitest';
import { currentDoc, setDoc, updateNodeProp } from '../../src/ui/state/editor-state.ts';
import { writePresetArchive } from '../../src/core/archive/writer.ts';
import type { Doc } from '../../src/core/model/types.ts';

describe('D01: Deep-copy via JSON destroys document assets and types', () => {
  beforeEach(() => {
    const assetBytes = new Uint8Array([137, 80, 78, 71]);
    const thumbBytes = new Uint8Array([255, 216, 255, 224]);
    const docWithAssets: Doc = {
      kind: 'kwgt',
      info: {
        title: 'Asset Test',
        version: 11,
      },
      root: {
        id: 'root',
        type: 'RootLayerModule',
        title: 'Root',
        props: {
          shape_width: { value: 100 },
        },
      },
      globals: {},
      assets: new Map([['bitmaps/test.png', assetBytes]]),
      thumbs: { 'preset_thumb.jpg': thumbBytes },
    };
    setDoc(docWithAssets);
  });

  // Current code uses JSON.parse(JSON.stringify(doc)), which turns Map into {}
  // and Uint8Arrays into plain objects, breaking assets.has and writePresetArchive.
  it.fails('preserves assets Map and Uint8Array instances across edits', () => {
    expect(currentDoc.value!.assets).toBeInstanceOf(Map);
    expect(currentDoc.value!.assets.has('bitmaps/test.png')).toBe(true);

    // Perform an edit
    updateNodeProp('root', 'shape_width', { value: 150 });

    // After edit, doc.assets must still be an instance of Map
    expect(currentDoc.value!.assets).toBeInstanceOf(Map);
    expect(currentDoc.value!.assets.has('bitmaps/test.png')).toBe(true);
    expect(currentDoc.value!.assets.get('bitmaps/test.png')).toBeInstanceOf(Uint8Array);
    expect(currentDoc.value!.thumbs['preset_thumb.jpg']).toBeInstanceOf(Uint8Array);

    // Exporting the edited doc must not throw
    const archive = writePresetArchive(currentDoc.value!);
    expect(archive).toBeInstanceOf(Uint8Array);
  });
});
