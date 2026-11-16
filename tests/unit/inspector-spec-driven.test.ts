import { describe, it, expect, beforeEach } from 'vitest';
import { MODULE_SPECS, OBSERVED_KEYS } from '../../src/core/spec/generated.ts';

describe('Phase R4: Spec-Driven Inspector & Label Correctness', () => {
  it('covers every observed corpus property key across all module types in spec sections', () => {
    for (const [moduleType, observedKeys] of Object.entries(OBSERVED_KEYS)) {
      const spec = (MODULE_SPECS as any)[moduleType];
      if (!spec || !spec.sections) continue;

      const specKeys = new Set<string>();
      for (const props of Object.values(spec.sections) as any[]) {
        if (Array.isArray(props)) {
          for (const p of props) {
            specKeys.add(p.key);
          }
        }
      }

      for (const obsKey of observedKeys) {
        // Internal metadata keys like internal_globals or internal_formulas are not displayed properties
        if (obsKey.startsWith('internal_') || obsKey === 'globals_list') continue;
        expect(specKeys.has(obsKey), `Module ${moduleType} missing observed property ${obsKey} in spec`).toBe(true);
      }
    }
  });

  it('ensures no duplicate property labels within any single tab for all module types', () => {
    for (const [moduleType, spec] of Object.entries(MODULE_SPECS) as [string, any][]) {
      if (!spec || !spec.sections) continue;

      for (const [sectionName, props] of Object.entries(spec.sections) as [string, any][]) {
        if (!Array.isArray(props)) continue;

        const labelCounts = new Map<string, number>();
        for (const p of props) {
          const rawLabel = p.desc || p.key;
          labelCounts.set(rawLabel, (labelCounts.get(rawLabel) || 0) + 1);
        }

        // Check disambiguated labels
        const finalLabels = new Set<string>();
        for (const p of props) {
          const rawLabel = p.desc || p.key;
          let label = rawLabel;
          if ((labelCounts.get(rawLabel) || 0) > 1) {
            label = `${rawLabel} (${p.key.split('_')[0]})`;
          }
          expect(finalLabels.has(label), `Duplicate label "${label}" in ${moduleType}.${sectionName}`).toBe(false);
          finalLabels.add(label);
        }
      }
    }
  });
});
