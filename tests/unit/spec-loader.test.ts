// tests/unit/spec-loader.test.ts
import { describe, it, expect } from 'vitest';
import { loadSpec, SpecRegistry } from '../../src/core/spec/loader.ts';

describe('Spec Loader & Registry', () => {
  it('loads the full spec successfully', () => {
    const spec = loadSpec();
    expect(spec).toBeDefined();
    expect(spec.modules).toBeDefined();
    expect(spec.enums).toBeDefined();
    expect(spec.defaults).toBeDefined();
    expect(spec.functions).toBeDefined();
    expect(spec.archiveLayout).toBeDefined();
    expect(spec.provenance).toBeDefined();
  });

  it('contains all 10 core module types', () => {
    const registry = SpecRegistry.getInstance();
    const coreModules = [
      'RootLayerModule',
      'OverlapLayerModule',
      'StackLayerModule',
      'ShapeModule',
      'TextModule',
      'FontIconModule',
      'ProgressModule',
      'CurvedTextModule',
      'BitmapModule',
      'KomponentModule',
    ];

    for (const mod of coreModules) {
      const modSpec = registry.getModuleSpec(mod);
      expect(modSpec, `Module ${mod} must be defined in spec`).toBeDefined();
      expect(Object.keys(modSpec.sections).length).toBeGreaterThan(0);
    }
  });

  it('verifies enums are populated with valid options', () => {
    const registry = SpecRegistry.getInstance();
    const shapeEnums = registry.getEnumValues('shape');
    expect(shapeEnums).toContain('RECT');
    expect(shapeEnums).toContain('CIRCLE');
    expect(shapeEnums).toContain('PATH');

    const paintModes = registry.getEnumValues('paintMode');
    expect(paintModes).toContain('NORMAL');
    expect(paintModes).toContain('CLEAR');
    expect(paintModes).toContain('XOR');

    const masks = registry.getEnumValues('mask');
    expect(masks).toContain('CLIP_NEXT');
    expect(masks).toContain('CLIP_ALL');
  });

  it('retrieves default property values', () => {
    const registry = SpecRegistry.getInstance();
    expect(registry.getDefault('paint_color')).toBe('#FFFFFFFF');
    expect(registry.getDefault('paint_mode')).toBe('NORMAL');
    expect(registry.getDefault('config_scale_value')).toBe(100);
    expect(registry.getDefault('config_visible')).toBe('ALWAYS');
  });

  it('checks function registry tier assignments', () => {
    const registry = SpecRegistry.getInstance();
    expect(registry.getFunctionSpec('gv')?.tier).toBe('T1');
    expect(registry.getFunctionSpec('ce')?.tier).toBe('T1');
    expect(registry.getFunctionSpec('si')?.tier).toBe('T1');
    expect(registry.getFunctionSpec('mi')?.tier).toBe('T2');
    expect(registry.getFunctionSpec('wi')?.tier).toBe('T2');
    expect(registry.getFunctionSpec('sh')?.tier).toBe('T3');
  });

  it('verifies archive layout specs (F1, F3)', () => {
    const spec = loadSpec();
    expect(spec.archiveLayout.archiveType).toBe('ZIP');
    expect(spec.archiveLayout.compressionMethod).toBe('deflate');
    expect(spec.archiveLayout.thumbnail.format).toBe('WEBP');
    expect(spec.archiveLayout.thumbnail.klwpDimensions.portrait).toEqual([460, 1024]);
  });
});
