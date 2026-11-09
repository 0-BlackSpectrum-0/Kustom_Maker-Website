// tests/integration/schema.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readPresetArchive } from '../../src/core/archive/reader.ts';
import { validateDoc } from '../../src/core/validate/validator.ts';

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

describe('Phase 2 Schema Validation (L3)', () => {
  for (const sample of sampleFiles) {
    it(`validates schema for ${sample.name} (${sample.kind}) with zero errors`, () => {
      const bytes = new Uint8Array(fs.readFileSync(sample.path));
      const doc = readPresetArchive(bytes, { fileName: sample.name });

      const report = validateDoc(doc);
      if (report.errors > 0) {
        console.error(`Validation errors in ${sample.name}:`, report.issues.filter((i) => i.severity === 'error'));
      }
      expect(report.valid, `Schema errors in ${sample.name}`).toBe(true);
      expect(report.errors).toBe(0);
    });
  }
});
