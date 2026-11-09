import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_ENUMS, MODULE_TYPES } from '../../src/core/spec/generated.ts';

describe('Phase F2: No handwritten enum literals', () => {
  it('ensures all uppercase identifiers in src/ match generated spec enums or allowlist', () => {
    // Build set of all valid enum values across all spec enums
    const validEnums = new Set<string>();
    for (const values of Object.values(ALL_ENUMS)) {
      for (const val of values as readonly string[]) {
        validEnums.add(val);
      }
    }
    for (const m of MODULE_TYPES) {
      validEnums.add(m);
    }

    // Explicit allow-list of known non-spec uppercase tokens (validation codes, feature bits, simulation mocks)
    const allowList = new Set<string>([
      'UTF-8',
      'KUSTOMCLIP',
      'KUSTOM_CLIP_PREFIX',
      'HTML',
      'CSS',
      'DOM',
      'SHA-256',
      'RIFF',
      'WEBP',
      // Validation error codes
      'INFO_TITLE_MISSING',
      'INFO_VERSION_MISSING',
      'INFO_RELEASE_MISSING',
      'INFO_DIMS_MISSING',
      'GLOBAL_TYPE_INVALID',
      'MODULE_TYPE_UNKNOWN',
      'TOGGLE_ORPHAN_FORMULA',
      'TOGGLE_ORPHAN_GLOBAL',
      'COLOR_FORMAT_INVALID',
      'ENUM_INVALID',
      'NUMBER_INVALID',
      'RESOURCE_MISSING',
      // Feature bits
      'WEATHER',
      'FORECAST',
      'NOTIFICATIONS',
      'CALENDAR',
      'AIR_QUALITY',
      'NETWORK_INFO',
      'SIGNAL',
      'BLUETOOTH',
      'CLOCK_',
      'ANALOG_CLOCK',
      // Sim state values
      'USB',
      'SUNNY',
      'RAIN',
      'PARTLY_CLOUDY',
      'MOSTLY_SUNNY',
      'PLAYING',
      'PAUSED',
      'STOPPED',
    ]);

    function collectSourceFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          files.push(...collectSourceFiles(full));
        } else if (/\.(ts|tsx)$/.test(ent.name) && !ent.name.endsWith('.d.ts') && !ent.name.includes('generated.ts')) {
          files.push(full);
        }
      }
      return files;
    }

    const srcFiles = collectSourceFiles(path.resolve('src'));
    const unknownLiterals: { file: string; match: string }[] = [];

    // Match string literals like 'TOP_LEFT', "NORMAL", etc.
    const literalRegex = /['"`]([A-Z][A-Z_]{2,})['"`]/g;

    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      let m: RegExpExecArray | null;
      while ((m = literalRegex.exec(content)) !== null) {
        const token = m[1];
        if (!validEnums.has(token) && !allowList.has(token)) {
          unknownLiterals.push({
            file: path.relative(process.cwd(), file),
            match: token,
          });
        }
      }
    }

    if (unknownLiterals.length > 0) {
      console.warn('Unknown enum literals found:', unknownLiterals);
    }

    expect(unknownLiterals).toEqual([]);
  });
});
