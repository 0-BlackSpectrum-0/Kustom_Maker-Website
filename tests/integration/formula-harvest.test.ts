import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { readPresetArchive } from '../../src/core/archive/reader.ts';
import { createFormulaContext, defaultSimState, evaluateValue, parseExpression } from '../../src/core/formula/index.ts';
import type { Node } from '../../src/core/model/types.ts';

interface ManifestEntry {
  id: string;
  preset: string;
  type: string;
}

interface Manifest {
  samples: ManifestEntry[];
}

function collectFormulas(node: Node, out: string[]) {
  if (node.props) {
    for (const prop of Object.values(node.props)) {
      if (prop.formula && typeof prop.formula === 'string') {
        out.push(prop.formula);
      }
    }
  }
  if (node.extras) {
    const intFormulas = node.extras.internal_formulas as Record<string, string> | undefined;
    if (intFormulas && typeof intFormulas === 'object') {
      for (const f of Object.values(intFormulas)) {
        if (typeof f === 'string') {
          out.push(f);
        }
      }
    }
  }
  if (node.children) {
    for (const child of node.children) {
      collectFormulas(child, out);
    }
  }
}

describe('Formula Engine - Corpus Harvesting & L4 Formula Health', () => {
  const manifestPath = path.resolve('samples/manifest.json');
  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  it('harvests and parses/evaluates formulas across all 46 presets', async () => {
    let totalFormulas = 0;
    const parseFailures: { preset: string; formula: string; error: string }[] = [];
    const evalFailures: { preset: string; formula: string; error: string }[] = [];

    const sim = defaultSimState();

    for (const sample of manifest.samples) {
      const presetPath = path.resolve(sample.preset);
      if (!fs.existsSync(presetPath)) continue;

      const bytes = fs.readFileSync(presetPath);
      const doc = await readPresetArchive(bytes);

      const globalsMap: Record<string, { value?: unknown; formula?: string }> = {};
      const formulas: string[] = [];

      // Collect from globals
      if (doc.globals) {
        for (const [name, g] of Object.entries(doc.globals)) {
          globalsMap[name] = {
            value: g.value,
            formula: g.global_formula,
          };
          if (g.global_formula) {
            formulas.push(g.global_formula);
          }
        }
      }

      // Collect from tree
      collectFormulas(doc.root, formulas);
      totalFormulas += formulas.length;

      const ctx = createFormulaContext(sim, globalsMap);

      for (const formula of formulas) {
        // Test parsing
        try {
          // If formula contains $, test parsing inside the $ segment
          const trimmed = formula.trim();
          if (trimmed.startsWith('$') && trimmed.endsWith('$')) {
            const inner = trimmed.slice(1, -1);
            parseExpression(inner);
          } else {
            // Might be mixed text or template
            evaluateValue(formula, ctx);
          }
        } catch (e) {
          parseFailures.push({
            preset: sample.id,
            formula,
            error: (e as Error).message,
          });
        }

        // Test evaluation
        try {
          evaluateValue(formula, ctx);
        } catch (e) {
          evalFailures.push({
            preset: sample.id,
            formula,
            error: (e as Error).message,
          });
        }
      }
    }

    console.log(`Harvested ${totalFormulas} formulas across all presets.`);
    console.log(`Parse failures: ${parseFailures.length}`);
    console.log(`Eval failures: ${evalFailures.length}`);

    if (parseFailures.length > 0) {
      console.error('Sample parse failures:', parseFailures.slice(0, 5));
    }

    expect(parseFailures).toHaveLength(0);
    expect(evalFailures).toHaveLength(0);
    expect(totalFormulas).toBeGreaterThan(1000);
  });
});
