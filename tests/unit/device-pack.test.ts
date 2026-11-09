// tests/unit/device-pack.test.ts
import { describe, it, expect } from 'vitest';
import { generateTestPresets, buildDeviceTestPackZip } from '../../src/core/device-pack/generator.ts';
import { writePresetArchive } from '../../src/core/archive/writer.ts';
import { readPresetArchive } from '../../src/core/archive/reader.ts';
import { validateDoc } from '../../src/core/validate/validator.ts';
import { unzipSync } from 'fflate';

describe('Phase 7 Device Test Pack & Export Fidelity', () => {
  it('generates 5 focused test presets covering key features', () => {
    const presets = generateTestPresets();
    const filenames = Object.keys(presets);
    expect(filenames).toHaveLength(5);
    expect(filenames).toContain('Test_01_Shapes.kwgt');
    expect(filenames).toContain('Test_02_BlendModes.kwgt');
    expect(filenames).toContain('Test_03_Gradients.kwgt');
    expect(filenames).toContain('Test_04_ClockHands.kwgt');
    expect(filenames).toContain('Test_05_Globals_Formulas.kwgt');
  });

  it('validates each generated test preset with zero schema errors', () => {
    const presets = generateTestPresets();
    for (const [filename, doc] of Object.entries(presets)) {
      const report = validateDoc(doc);
      const errors = report.issues.filter((i) => i.severity === 'error');
      expect(errors, `Expected zero errors in ${filename}`).toHaveLength(0);
    }
  });

  it('performs lossless roundtrip on all generated test presets', async () => {
    const presets = generateTestPresets();
    for (const [filename, doc] of Object.entries(presets)) {
      const bytes = writePresetArchive(doc);
      expect(bytes.byteLength).toBeGreaterThan(0);

      const reloadedDoc = await readPresetArchive(bytes);
      expect(reloadedDoc.info.title).toBe(doc.info.title);
      expect(reloadedDoc.root.children?.length).toBe(doc.root.children?.length);
    }
  });

  it('builds a complete device test pack zip with README and test files', async () => {
    const zipBytes = await buildDeviceTestPackZip();
    expect(zipBytes.byteLength).toBeGreaterThan(1000);

    const unzipped = unzipSync(zipBytes);
    expect(unzipped['README.md']).toBeDefined();
    expect(unzipped['Test_01_Shapes.kwgt']).toBeDefined();
    expect(unzipped['Test_02_BlendModes.kwgt']).toBeDefined();
    expect(unzipped['Test_03_Gradients.kwgt']).toBeDefined();
    expect(unzipped['Test_04_ClockHands.kwgt']).toBeDefined();
    expect(unzipped['Test_05_Globals_Formulas.kwgt']).toBeDefined();

    const decoder = new TextDecoder();
    const readmeText = decoder.decode(unzipped['README.md']);
    expect(readmeText).toContain('KustomWeb Device Test Pack');
    expect(readmeText).toContain('On-Device Testing Instructions');
  });
});
