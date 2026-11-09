// tests/unit/fixers.test.ts
import { describe, it, expect } from 'vitest';
import type { Doc } from '../../src/core/model/types.ts';
import { validateDoc } from '../../src/core/validate/validator.ts';
import {
  fixColorFormat,
  fixDefaultOmit,
  fixInfoMissing,
  fixRelease,
  fixFeatures,
  fixKfileAlias,
  sanitize,
} from '../../src/core/validate/fixers/index.ts';

function createDummyDoc(): Doc {
  return {
    kind: 'kwgt',
    info: {
      title: 'TestWidget',
      version: 13,
      release: 377435216,
      width: 415,
      height: 542,
    },
    root: {
      id: 'root_1',
      type: 'RootLayerModule',
      title: 'Root',
      props: {},
      extras: {},
      children: [
        {
          id: 'shape_1',
          type: 'ShapeModule',
          title: 'Shape',
          props: {
            paint_color: { value: '#f00' },
            paint_mode: { value: 'NORMAL' },
            shape_type: { value: 'RECT' },
          },
          extras: {},
        },
      ],
    },
    globals: {},
    assets: new Map(),
    thumbs: {},
    extras: {},
  };
}

describe('Spec-Driven Fixers (Break-Then-Repair)', () => {
  it('F-color-format normalizes 3-char, 6-char, and lowercase colors', () => {
    const doc = createDummyDoc();
    doc.root.children![0].props['paint_color'] = { value: '#ff00ff00' };
    doc.root.children![0].props['custom_bg'] = { value: '#123' };

    const fixes = fixColorFormat(doc);
    expect(fixes.length).toBeGreaterThan(0);
    expect(doc.root.children![0].props['paint_color'].value).toBe('#FF00FF00');
    expect(doc.root.children![0].props['custom_bg'].value).toBe('#FF112233');
  });

  it('F-default-omit removes properties that equal spec defaults', () => {
    const doc = createDummyDoc();
    // Default paint_mode is NORMAL, default paint_style is FILL
    doc.root.children![0].props['paint_mode'] = { value: 'NORMAL' };
    doc.root.children![0].props['paint_style'] = { value: 'FILL' };

    const fixes = fixDefaultOmit(doc);
    expect(fixes.length).toBeGreaterThan(0);
    expect(doc.root.children![0].props['paint_mode']).toBeUndefined();
    expect(doc.root.children![0].props['paint_style']).toBeUndefined();
  });

  it('F-info-missing repairs missing title, version, locked', () => {
    const doc = createDummyDoc();
    delete (doc.info as any).version;
    delete (doc.info as any).title;

    const fixes = fixInfoMissing(doc);
    expect(fixes.length).toBe(3);
    expect(doc.info.version).toBe(13);
    expect(doc.info.title).toBe('Untitled');
    expect(doc.info.locked).toBe(false);
  });

  it('F-release repairs missing or future release build', () => {
    const doc = createDummyDoc();
    doc.info.release = 999999999;

    const fixes = fixRelease(doc, { targetRelease: 377435216 });
    expect(fixes.length).toBe(1);
    expect(doc.info.release).toBe(377435216);
  });

  it('F-features derives features from formulas and clock modes', () => {
    const doc = createDummyDoc();
    doc.root.children![0].props['shape_rotate_mode'] = { value: 'CLOCK_HOUR' };
    doc.root.children![0].props['temp_text'] = { formula: '$wi(temp)$' };
    doc.root.children![0].props['music_text'] = { formula: '$mi(title)$' };

    const fixes = fixFeatures(doc);
    expect(fixes.length).toBe(1);
    expect(doc.info.features).toContain('ANALOG_CLOCK');
    expect(doc.info.features).toContain('WEATHER');
    expect(doc.info.features).toContain('MUSIC');
  });

  it('F-kfile-alias normalizes preset-aliased resource paths', () => {
    const doc = createDummyDoc();
    doc.root.children![0].props['icon_set'] = {
      value: 'kfile://org.kustom.provider/widgets/OldWidget.kwgt/icons/material.ttf',
    };

    const fixes = fixKfileAlias(doc, { normalizeAliases: true });
    expect(fixes.length).toBe(1);
    expect(doc.root.children![0].props['icon_set'].value).toBe(
      'kfile://org.kustom.provider/icons/material.ttf'
    );
  });

  it('sanitize runs full pipeline and ensures document validates', () => {
    const doc = createDummyDoc();
    doc.root.children![0].props['paint_color'] = { value: '#abc' };
    doc.root.children![0].props['paint_mode'] = { value: 'NORMAL' };

    const fixes = sanitize(doc);
    expect(fixes.length).toBeGreaterThan(0);

    const report = validateDoc(doc);
    expect(report.valid).toBe(true);
    expect(report.errors).toBe(0);
  });
});
