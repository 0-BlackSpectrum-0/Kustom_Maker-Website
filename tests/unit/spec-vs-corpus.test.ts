// tests/unit/spec-vs-corpus.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('R2: Spec vs Corpus Fidelity Gate', () => {
  const observedPath = path.resolve('spec/observed.json');
  expect(fs.existsSync(observedPath)).toBe(true);
  const observed = JSON.parse(fs.readFileSync(observedPath, 'utf-8'));

  it('matches expected corpus archive and module counts', () => {
    expect(observed.stats.totalArchives).toBe(46);

    const counts = observed.stats.moduleCounts;
    expect(counts.RootLayerModule).toBe(44);
    expect(counts.OverlapLayerModule).toBeGreaterThanOrEqual(800);
    expect(counts.ShapeModule).toBeGreaterThanOrEqual(1900);
    expect(counts.StackLayerModule).toBeGreaterThanOrEqual(700);
    expect(counts.TextModule).toBeGreaterThanOrEqual(380);
    expect(counts.ProgressModule).toBe(66);
    expect(counts.CurvedTextModule).toBe(24);
    expect(counts.FontIconModule).toBeGreaterThanOrEqual(250);
    expect(counts.BitmapModule).toBeGreaterThanOrEqual(10);
    expect(counts.KomponentModule).toBeGreaterThanOrEqual(9);
  });

  it('proves ProgressModule in corpus uses progress_progress, style_*, color_* and zero progress_style', () => {
    const progressProps = observed.modules.ProgressModule.props;
    expect(progressProps.progress_progress).toBeDefined();
    expect(progressProps.progress_progress.count).toBeGreaterThanOrEqual(60);

    expect(progressProps.style_style).toBeDefined();
    expect(progressProps.style_shape).toBeDefined();
    expect(progressProps.style_width).toBeDefined();
    expect(progressProps.color_mode).toBeDefined();

    // Invented keys never seen in real files
    expect(progressProps.progress_style).toBeUndefined();
    expect(progressProps.progress_shape).toBeUndefined();
    expect(progressProps.progress_size).toBeUndefined();
  });

  it('proves CurvedTextModule in corpus uses text_* keys and zero curved_* keys', () => {
    const curvedProps = observed.modules.CurvedTextModule.props;
    expect(curvedProps.text_expression).toBeDefined();
    expect(curvedProps.text_expression.count).toBe(24);
    expect(curvedProps.text_size).toBeDefined();
    expect(curvedProps.text_size.count).toBe(24);
    expect(curvedProps.text_width).toBeDefined();

    // Invented curved_* keys never seen
    expect(curvedProps.curved_expression).toBeUndefined();
    expect(curvedProps.curved_radius).toBeUndefined();
    expect(curvedProps.curved_size).toBeUndefined();
    expect(curvedProps.curved_angle).toBeUndefined();
    expect(curvedProps.curved_family).toBeUndefined();
  });

  it('proves RootLayerModule in corpus has zero background_color and zero background_type', () => {
    const rootProps = observed.modules.RootLayerModule.props;
    expect(rootProps.globals_list).toBeDefined();
    expect(rootProps.config_scale_value).toBeDefined();

    expect(rootProps.background_color).toBeUndefined();
    expect(rootProps.background_type).toBeUndefined();
  });
});
