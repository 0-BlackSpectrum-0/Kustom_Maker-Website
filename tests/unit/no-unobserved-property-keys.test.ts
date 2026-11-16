// tests/unit/no-unobserved-property-keys.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { OBSERVED_KEYS } from '../../src/core/spec/generated.ts';

describe('R2: No unobserved property keys in source code', () => {
  // Build master set of all property keys seen in the real corpus across all modules
  const allObservedKeys = new Set<string>();
  for (const keys of Object.values(OBSERVED_KEYS)) {
    for (const k of keys) {
      allObservedKeys.add(k);
    }
  }

  // Explicit legacy allow-list for backwards-compatible fallbacks
  const legacyAllowList = new Set<string>([
    'curved_expression',
    'curved_radius',
    'curved_size',
    'curved_angle',
    'curved_family',
    'curved_rotate_mode',
    'curved_rotate_offset',
    'progress_style',
    'progress_shape',
    'progress_size',
    'progress_width',
    'progress_height',
    'progress_min',
    'background_color',
    'background_type',
    'series_mode',
    'movie_width',
    'movie_height',
    'stack_mode',
    'bitmap_rmode',
    'bitmap_rotate',
    'bitmap_svg',
    'bitmap_alpha',
    'bitmap_blur',
  ]);

  it('verifies all property getter calls in src/layout and src/render use observed or allowlisted keys', () => {
    function collectFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          files.push(...collectFiles(full));
        } else if (/\.(ts|tsx)$/.test(ent.name) && !ent.name.endsWith('.d.ts') && !ent.name.includes('generated.ts')) {
          files.push(full);
        }
      }
      return files;
    }

    const targetDirs = [path.resolve('src/core/layout'), path.resolve('src/core/render')];
    const targetFiles = targetDirs.flatMap(collectFiles);

    // Matches propStr(..., 'key_name'), propNum(..., 'key_name'), propEnum(..., 'key_name')
    const getterRegex = /prop(?:Str|Num|Enum)\s*\(\s*[^,]+,\s*['"]([a-z0-9_]+)['"]/g;
    const violations: { file: string; key: string }[] = [];

    for (const file of targetFiles) {
      const code = fs.readFileSync(file, 'utf8');
      let m: RegExpExecArray | null;
      while ((m = getterRegex.exec(code)) !== null) {
        const key = m[1];
        if (!allObservedKeys.has(key) && !legacyAllowList.has(key)) {
          violations.push({ file: path.relative(process.cwd(), file), key });
        }
      }
    }

    if (violations.length > 0) {
      console.error('Found unobserved property keys:', violations);
    }
    expect(violations).toEqual([]);
  });
});
