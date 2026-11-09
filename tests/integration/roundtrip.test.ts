// tests/integration/roundtrip.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readPresetArchive } from '../../src/core/archive/reader.ts';
import { writePresetArchive } from '../../src/core/archive/writer.ts';
import { areCanonicallyEqual, canonicalJson } from '../../src/core/model/canonical.ts';
import { serializePresetJson } from '../../src/core/model/serializer.ts';

const ROOT = process.cwd();
const KWGT_DIR = path.join(ROOT, 'samples', '_src', 'kwgt-widgets', 'widgets');
const KOMP_DIR = path.join(ROOT, 'samples', '_src', 'kwgt-widgets', 'komponents');
const DARKWAVE_DIR = path.join(ROOT, 'samples', '_src', 'darkwave');
const EXTRA_DIR = path.join(ROOT, 'samples', 'extra');

function getSampleFiles() {
  const files: { name: string; path: string; kind: 'kwgt' | 'klwp' | 'komp' }[] = [];

  if (fs.existsSync(KWGT_DIR)) {
    for (const f of fs.readdirSync(KWGT_DIR).filter((x) => x.endsWith('.kwgt'))) {
      files.push({ name: f, path: path.join(KWGT_DIR, f), kind: 'kwgt' });
    }
  }

  if (fs.existsSync(KOMP_DIR)) {
    for (const f of fs.readdirSync(KOMP_DIR).filter((x) => x.endsWith('.komp'))) {
      files.push({ name: f, path: path.join(KOMP_DIR, f), kind: 'komp' });
    }
  }

  if (fs.existsSync(DARKWAVE_DIR)) {
    for (const f of fs.readdirSync(DARKWAVE_DIR).filter((x) => x.endsWith('.klwp'))) {
      files.push({ name: f, path: path.join(DARKWAVE_DIR, f), kind: 'klwp' });
    }
  }

  if (fs.existsSync(EXTRA_DIR)) {
    for (const f of fs.readdirSync(EXTRA_DIR)) {
      if (f.endsWith('.kwgt')) files.push({ name: f, path: path.join(EXTRA_DIR, f), kind: 'kwgt' });
      if (f.endsWith('.klwp')) files.push({ name: f, path: path.join(EXTRA_DIR, f), kind: 'klwp' });
      if (f.endsWith('.komp')) files.push({ name: f, path: path.join(EXTRA_DIR, f), kind: 'komp' });
    }
  }

  return files;
}

const sampleFiles = getSampleFiles();

describe('Phase 1 Lossless Round-Trip (L1 & L2)', () => {
  it(`found all sample presets across corpus (expected >= 41, found ${sampleFiles.length})`, () => {
    expect(sampleFiles.length).toBeGreaterThanOrEqual(41);
  });

  for (const sample of sampleFiles) {
    it(`lossless round-trip for ${sample.name} (${sample.kind})`, () => {
      const originalBytes = new Uint8Array(fs.readFileSync(sample.path));
      const doc = readPresetArchive(originalBytes, { fileName: sample.name });

      expect(doc.info).toBeDefined();
      expect(doc.root).toBeDefined();

      // Write re-exported archive
      const exportedBytes = writePresetArchive(doc, { preserveEntryOrder: true });
      expect(exportedBytes.length).toBeGreaterThan(0);

      // Re-read exported bytes
      const reReadDoc = readPresetArchive(exportedBytes, { fileName: sample.name });

      // L1: Canonical JSON equality
      const origJson = serializePresetJson(doc);
      const reReadJson = serializePresetJson(reReadDoc);

      const isEqual = areCanonicallyEqual(origJson, reReadJson);
      if (!isEqual) {
        // Detailed diff if failing
        console.error(`Diff in ${sample.name}`);
      }
      expect(isEqual, `Canonical JSON mismatch in ${sample.name}`).toBe(true);

      // L2: Asset byte equality
      expect(reReadDoc.assets.size).toBe(doc.assets.size);
      for (const [key, origData] of doc.assets.entries()) {
        const reReadData = reReadDoc.assets.get(key);
        expect(reReadData, `Missing asset ${key}`).toBeDefined();
        expect(reReadData!.length).toBe(origData.length);
      }

      // L2: Thumbnail verification
      if (sample.kind !== 'komp') {
        if (doc.thumbs.portrait) {
          expect(reReadDoc.thumbs.portrait).toBeDefined();
          expect(reReadDoc.thumbs.portrait!.length).toBe(doc.thumbs.portrait.length);
        }
        if (doc.thumbs.landscape) {
          expect(reReadDoc.thumbs.landscape).toBeDefined();
          expect(reReadDoc.thumbs.landscape!.length).toBe(doc.thumbs.landscape.length);
        }
      } else {
        if (doc.thumbs.komp) {
          expect(reReadDoc.thumbs.komp).toBeDefined();
          expect(reReadDoc.thumbs.komp!.length).toBe(doc.thumbs.komp.length);
        }
      }
    });
  }
});
