import { describe, it, expect } from 'vitest';
import { generatePresetThumbnails } from '../../src/core/render/thumbnails.ts';
import { writePresetArchive } from '../../src/core/archive/writer.ts';
import { readPresetArchive } from '../../src/core/archive/reader.ts';
import { createDefaultDoc } from '../../src/ui/state/editor-state.ts';
import type { Doc } from '../../src/core/model/types.ts';

describe('Phase R6: Export Correctness and Thumbnail Generation', () => {
  it('generates valid thumbnail bytes for a KWGT widget and includes them in export', async () => {
    const doc = createDefaultDoc();
    const thumbs = await generatePresetThumbnails(doc);

    expect(thumbs.portrait).toBeDefined();
    expect(thumbs.portrait!.length).toBeGreaterThan(0);

    const docToExport: Doc = {
      ...doc,
      thumbs,
    };

    const zipBytes = writePresetArchive(docToExport);
    expect(zipBytes.length).toBeGreaterThan(100);

    const reimported = await readPresetArchive(zipBytes);
    expect(reimported.thumbs.portrait).toBeDefined();
    expect(reimported.info.title).toBe(doc.info.title);
  });

  it('generates portrait and landscape thumbnail bytes for a KLWP wallpaper', async () => {
    const doc = createDefaultDoc();
    doc.kind = 'klwp';

    const thumbs = await generatePresetThumbnails(doc);
    expect(thumbs.portrait).toBeDefined();
    expect(thumbs.landscape).toBeDefined();

    const docToExport: Doc = {
      ...doc,
      thumbs,
    };

    const zipBytes = writePresetArchive(docToExport);
    const reimported = await readPresetArchive(zipBytes);

    expect(reimported.thumbs.portrait).toBeDefined();
    expect(reimported.thumbs.landscape).toBeDefined();
  });
});
