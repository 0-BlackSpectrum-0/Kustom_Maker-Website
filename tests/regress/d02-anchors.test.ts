import { describe, it, expect } from 'vitest';
import { positionLayoutTree } from '../../src/core/layout/position.ts';
import type { LayoutNode } from '../../src/core/layout/types.ts';

describe('D02: Real anchor names without underscores', () => {
  it.fails('positions node at top-left when anchor is TOPLEFT (without underscore)', () => {
    const child: LayoutNode = {
      id: 'child',
      type: 'ShapeModule',
      title: 'Child',
      resolvedProps: {
        position_anchor: 'TOPLEFT',
        position_offset_x: 0,
        position_offset_y: 0,
      },
      box: { x: 0, y: 0, w: 100, h: 100, pad: [0, 0, 0, 0] },
      children: [],
      unit: 1,
      childUnit: 1,
    };

    const root: LayoutNode = {
      id: 'root',
      type: 'RootLayerModule',
      title: 'Root',
      resolvedProps: {},
      box: { x: 0, y: 0, w: 400, h: 400, pad: [0, 0, 0, 0] },
      children: [child],
      unit: 1,
      childUnit: 1,
    };

    positionLayoutTree(root);

    // With TOPLEFT, child.box.x should be 0, child.box.y should be 0.
    // Currently, ANCHORS uses TOP_LEFT, so TOPLEFT falls back to CENTER (x = 150, y = 150).
    expect(child.box.x).toBe(0);
    expect(child.box.y).toBe(0);
  });

  it.fails('positions node at center-left when anchor is CENTERLEFT', () => {
    const child: LayoutNode = {
      id: 'child',
      type: 'ShapeModule',
      title: 'Child',
      resolvedProps: {
        position_anchor: 'CENTERLEFT',
        position_offset_x: 0,
        position_offset_y: 0,
      },
      box: { x: 0, y: 0, w: 100, h: 100, pad: [0, 0, 0, 0] },
      children: [],
      unit: 1,
      childUnit: 1,
    };

    const root: LayoutNode = {
      id: 'root',
      type: 'RootLayerModule',
      title: 'Root',
      resolvedProps: {},
      box: { x: 0, y: 0, w: 400, h: 400, pad: [0, 0, 0, 0] },
      children: [child],
      unit: 1,
      childUnit: 1,
    };

    positionLayoutTree(root);

    // With CENTERLEFT, child.box.x should be 0, child.box.y should be 150.
    // Currently, ANCHORS uses CENTER_LEFT, so CENTERLEFT falls back to CENTER (x = 150, y = 150).
    expect(child.box.x).toBe(0);
    expect(child.box.y).toBe(150);
  });
});
