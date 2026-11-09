import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { readPresetArchive } from '../../src/core/archive/reader.ts';
import { renderPreset } from '../../src/core/render/renderer.ts';
import type { Doc, Node } from '../../src/core/model/types.ts';

describe('Renderer - Canvas 2D Painting', () => {
  it('renders a synthetic widget with shapes, gradients, and blend modes', async () => {
    const bg: Node = {
      id: 'bg',
      type: 'ShapeModule',
      title: 'Background',
      props: {
        shape_type: { value: 'RECT' },
        shape_width: { value: 400 },
        shape_height: { value: 400 },
        shape_corners: { value: 40 },
        paint_color: { value: '#FF1E1E1E' },
      },
      extras: {},
    };

    const circle: Node = {
      id: 'circle',
      type: 'ShapeModule',
      title: 'Red Circle',
      props: {
        shape_type: { value: 'CIRCLE' },
        shape_width: { value: 200 },
        shape_height: { value: 200 },
        paint_color: { value: '#FFFF0000' },
        fx_gradient: { value: 'RADIAL' },
        fx_gradient_color: { value: '#FF880000' },
      },
      extras: {},
    };

    const root: Node = {
      id: 'root',
      type: 'RootLayerModule',
      title: 'Root',
      props: {
        background_color: { value: '#00000000' },
      },
      children: [bg, circle],
      extras: {},
    };

    const doc: Doc = {
      kind: 'kwgt',
      info: { width: 400, height: 400 },
      root,
      globals: {},
      assets: new Map(),
      thumbs: {},
      extras: {},
    };

    const canvas = await renderPreset(doc, { kind: 'widget', w: 400, h: 400 });
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(400);

    const ctx = canvas.getContext('2d');
    const pixel = ctx.getImageData(200, 200, 1, 1).data;
    // Central pixel should be drawn (alpha > 0)
    expect(pixel[3]).toBeGreaterThan(0);
  });

  it('renders a real corpus preset (Nothing_Analog_5.kwgt)', async () => {
    const filePath = path.resolve('samples/_src/kwgt-widgets/widgets/Nothing_Analog_5.kwgt');
    if (!fs.existsSync(filePath)) return;

    const bytes = fs.readFileSync(filePath);
    const doc = await readPresetArchive(bytes);

    const canvas = await renderPreset(doc, { kind: 'widget', w: 415, h: 542 });
    expect(canvas.width).toBe(415);
    expect(canvas.height).toBe(542);

    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, 415, 542);
    // At least some pixels should be rendered
    let hasNonZeroPixel = false;
    for (let i = 3; i < imgData.data.length; i += 4) {
      if (imgData.data[i] > 0) {
        hasNonZeroPixel = true;
        break;
      }
    }
    expect(hasNonZeroPixel).toBe(true);
  });
});
