// tests/unit/fuzz.test.ts
import { describe, it, expect } from 'vitest';
import { readPresetArchive } from '../../src/core/archive/reader.ts';
import { zipSync } from 'fflate';
import { evalFormula, defaultSimState } from '../../src/core/formula/index.ts';

describe('Phase 9 Robustness & Fuzz Testing', () => {
  it('gracefully throws on empty byte array', () => {
    expect(() => readPresetArchive(new Uint8Array(0))).toThrow();
  });

  it('gracefully throws on random garbage bytes', () => {
    const garbage = new Uint8Array(256);
    for (let i = 0; i < garbage.length; i++) {
      garbage[i] = Math.floor(Math.random() * 256);
    }
    expect(() => readPresetArchive(garbage)).toThrow();
  });

  it('rejects archive missing preset.json and komponent.json', () => {
    const encoder = new TextEncoder();
    const badZip = zipSync({
      'some_other_file.txt': [encoder.encode('hello'), { level: 0 }],
    });
    expect(() => readPresetArchive(badZip)).toThrow(/Archive missing root JSON/);
  });

  it('rejects archive with corrupt preset.json syntax', () => {
    const encoder = new TextEncoder();
    const badZip = zipSync({
      'preset.json': [encoder.encode('{ this is not json'), { level: 0 }],
    });
    expect(() => readPresetArchive(badZip)).toThrow();
  });

  it('refuses locked archives with internal_readonly: true', () => {
    const encoder = new TextEncoder();
    const lockedJson = JSON.stringify({
      preset_info: { title: 'Locked Preset' },
      preset_root: { internal_readonly: true },
    });
    const lockedZip = zipSync({
      'preset.json': [encoder.encode(lockedJson), { level: 0 }],
    });
    expect(() => readPresetArchive(lockedZip)).toThrow(/internal_readonly: true/);
  });

  it('formula evaluator never throws uncaught errors on extreme or malformed syntax', () => {
    const sim = defaultSimState();
    const malformedFormulas = [
      '$$$$$$',
      '$df($',
      '$gv(gv(gv(gv(gv(gv(gv())))))))$',
      '$1 / 0$',
      '$ce(#00, lum, invalid)$',
      '$tc(split, "a,b,c", ",", 999999)$',
      '$mu(sqrt, -100)$',
      '$if($',
      '$(($($)',
      '$tc(reg, "test", "[invalid-regex", "repl")$',
    ];

    for (const formula of malformedFormulas) {
      expect(() => {
        const val = evalFormula(formula, sim);
        expect(val).toBeDefined();
      }).not.toThrow();
    }
  });
});
