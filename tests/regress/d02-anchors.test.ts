import { describe, it, expect } from 'vitest';
import { positionLayoutTree } from '../../src/core/layout/position.ts';
import type { LayoutNode } from '../../src/core/layout/types.ts';

describe('D02: Real anchor names without underscores', () => {
  it('positions node at top-left when anchor is TOPLEFT (without underscore)', () => {
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
      transform: { x: 0, y: 0, rot: 0, scaleX: 1, scaleY: 1 },
      visible: true,
      removed: false,
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
      transform: { x: 0, y: 0, rot: 0, scaleX: 1, scaleY: 1 },
      visible: true,
      removed: false,
    };

    positionLayoutTree(root);

    // With TOPLEFT, child.box.x should be 0, child.box.y should be 0.
    expect(child.box.x).toBe(0);
    expect(child.box.y).toBe(0);
  });

  it('positions node at center-left when anchor is CENTERLEFT', () => {
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
      transform: { x: 0, y: 0, rot: 0, scaleX: 1, scaleY: 1 },
      visible: true,
      removed: false,
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
      transform: { x: 0, y: 0, rot: 0, scaleX: 1, scaleY: 1 },
      visible: true,
      removed: false,
    };

    positionLayoutTree(root);

    // With CENTERLEFT, child.box.x should be 0, child.box.y should be 150.
    expect(child.box.x).toBe(0);
    expect(child.box.y).toBe(150);
  });
});
