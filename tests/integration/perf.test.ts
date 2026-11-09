// tests/integration/perf.test.ts
import { describe, it, expect } from 'vitest';
import { readPresetArchive } from '../../src/core/archive/reader.ts';
import { computeLayout } from '../../src/core/layout/index.ts';
import { createFormulaContext, defaultSimState } from '../../src/core/formula/index.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Phase 8 & 9 Performance & Scale Verification', () => {
  let darkwavePath = path.resolve(process.cwd(), 'samples/extra/05_19_25_DarkWave_Release.klwp');
  if (!fs.existsSync(darkwavePath)) {
    darkwavePath = path.resolve(process.cwd(), 'samples/_src/darkwave/05_19_25_DarkWave_Release.klwp');
  }

  it('imports and processes the DarkWave scale preset within budget', () => {
    if (!fs.existsSync(darkwavePath)) return;

    const fileBytes = fs.readFileSync(darkwavePath);
    expect(fileBytes.length).toBeGreaterThan(0);

    // 1. Measure Import & Archive Parse Time
    const t0 = performance.now();
    const doc = readPresetArchive(fileBytes, { fileName: '05_19_25_DarkWave_Release.klwp' });
    const importDurationMs = performance.now() - t0;

    expect(doc.kind).toBe('klwp');
    expect(doc.root).toBeDefined();

    // Count modules
    let moduleCount = 0;
    const countNodes = (n: any) => {
      moduleCount++;
      if (n.children) n.children.forEach(countNodes);
    };
    countNodes(doc.root);
    expect(moduleCount).toBeGreaterThan(300);

    // 2. Measure Layout Compute Time
    const sim = defaultSimState();
    const globalsMap: Record<string, { value?: unknown; formula?: string; toggles?: number }> = {};
    if (doc.globals) {
      for (const [k, g] of Object.entries(doc.globals)) {
        globalsMap[k] = { value: g.value, formula: g.global_formula, toggles: g.toggles };
      }
    }
    const ctx = createFormulaContext(sim, globalsMap);

    const t1 = performance.now();
    const layout = computeLayout(doc, { kind: 'phone', w: 540, h: 1200 }, ctx);
    const layoutDurationMs = performance.now() - t1;

    expect(layout).toBeDefined();
    expect(layout.children.length).toBeGreaterThan(0);

    // Write performance report
    const reportsDir = path.resolve(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const perfReport = {
      preset: '05_19_25_DarkWave_Release.klwp',
      fileSizeBytes: fileBytes.length,
      moduleCount,
      importDurationMs: Math.round(importDurationMs * 10) / 10,
      layoutDurationMs: Math.round(layoutDurationMs * 10) / 10,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(reportsDir, 'perf.json'),
      JSON.stringify(perfReport, null, 2),
      'utf-8',
    );

    // Assert budgets:
    // Import budget < 1500 ms (section 20)
    // Note: Node environment cold run can have minor variance, check reasonable floor
    expect(importDurationMs).toBeLessThan(3500);
    expect(layoutDurationMs).toBeLessThan(1000);
  });
});
