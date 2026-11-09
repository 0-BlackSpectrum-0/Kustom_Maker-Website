import { describe, it, expect } from 'vitest';
import { positionLayoutTree } from '../../src/core/layout/position.ts';
import type { LayoutNode } from '../../src/core/layout/types.ts';

describe('D05: Positioning rules for groups and screen offset', () => {
  it('applies position_offset_x and position_offset_y to children of OverlapLayerModule', () => {
    const kid: LayoutNode = {
      id: 'kid1',
      type: 'ShapeModule',
      title: 'Shape in Overlap',
      box: { x: 0, y: 0, w: 50, h: 50, pad: [0, 0, 0, 0] },
      transform: { x: 0, y: 0, rot: 0, scaleX: 1, scaleY: 1 },
      visible: true,
      removed: false,
      unit: 1,
      childUnit: 1,
      resolvedProps: {
        position_anchor: 'CENTER',
        position_offset_x: 25,
        position_offset_y: -15,
      },
      children: [],
    };

    const overlap: LayoutNode = {
      id: 'overlap1',
      type: 'OverlapLayerModule',
      title: 'Overlap Group',
      box: { x: 0, y: 0, w: 200, h: 200, pad: [0, 0, 0, 0] },
      transform: { x: 0, y: 0, rot: 0, scaleX: 1, scaleY: 1 },
      visible: true,
      removed: false,
      unit: 1,
      childUnit: 1,
      resolvedProps: {},
      children: [kid],
    };

    positionLayoutTree(overlap);

    // Center of 200 is (200-50)/2 = 75.
    // With offset_x = 25 -> 75 + 25 = 100
    // With offset_y = -15 -> 75 - 15 = 60
    expect(kid.transform.x).toBe(100);
    expect(kid.transform.y).toBe(60);
  });

  it('correctly shifts KLWP horizontal scroll position according to screenOffset and screens', () => {
    const root: LayoutNode = {
      id: 'root',
      type: 'RootLayerModule',
      title: 'Root',
      box: { x: 0, y: 0, w: 720, h: 1280, pad: [0, 0, 0, 0] },
      transform: { x: 0, y: 0, rot: 0, scaleX: 1, scaleY: 1 },
      visible: true,
      removed: false,
      unit: 1,
      childUnit: 1,
      resolvedProps: {},
      children: [],
    };

    // 3 screens, screenOffset = 0 (first screen) vs 0.5 (center screen)
    positionLayoutTree(root, 0, 3);
    expect(root.transform.x).toBe(0);

    positionLayoutTree(root, 0.5, 3);
    // At offset 0.5 with 3 screens, screen 2 of 3 is centered
    expect(root.screenScrollX).toBeDefined();
    expect(root.screenScrollX).toBe(-720);
  });
});
