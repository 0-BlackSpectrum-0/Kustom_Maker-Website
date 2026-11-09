import { describe, it, expect } from 'vitest';
import { CanvasPainter } from '../../src/core/render/painter.ts';
import type { LayoutNode } from '../../src/core/layout/types.ts';

describe('D07: Blend modes and clipping masks isolation', () => {
  it('does not wipe the outer canvas when a child inside an overlap layer uses CLEAR blend mode', () => {
    // In Canvas 2D without an isolated group layer, painting CLEAR (destination-out)
    // directly on the shared context clears whatever was previously rendered underneath the entire group.
    let globalCompOpUsedOnRoot = '';
    const mockCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      rect: () => {},
      fill: () => {},
      stroke: () => {},
      clip: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      measureText: () => ({ width: 50 }),
      fillText: () => {},
      strokeText: () => {},
      drawImage: () => {},
      get globalCompositeOperation() {
        return globalCompOpUsedOnRoot;
      },
      set globalCompositeOperation(val: string) {
        globalCompOpUsedOnRoot = val;
      },
    } as unknown as CanvasRenderingContext2D;

    const clearChild: LayoutNode = {
      id: 'clearChild',
      type: 'ShapeModule',
      title: 'Clear Child',
      resolvedProps: {
        shape_type: 'RECT',
        paint_mode: 'CLEAR',
        shape_width: 50,
        shape_height: 50,
      },
      box: { x: 10, y: 10, w: 50, h: 50, pad: [0, 0, 0, 0] },
      children: [],
      unit: 1,
      childUnit: 1,
    };

    const group: LayoutNode = {
      id: 'group',
      type: 'OverlapLayerModule',
      title: 'Overlap Group',
      resolvedProps: {},
      box: { x: 0, y: 0, w: 200, h: 200, pad: [0, 0, 0, 0] },
      children: [clearChild],
      unit: 1,
      childUnit: 1,
    };

    const painter = new CanvasPainter();
    painter.paintNode(mockCtx, group);

    // Group should isolate blend modes with an offscreen buffer so globalCompositeOperation
    // on the main ctx is not set to destination-out directly.
    expect(globalCompOpUsedOnRoot).not.toBe('destination-out');
  });
});
