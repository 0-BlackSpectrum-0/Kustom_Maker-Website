import { describe, expect, it } from 'vitest';
import {
  computeLayout,
  PropertyResolver,
  measureNode,
  positionLayoutTree,
  arcGeometry,
  stripBBCode,
  calculateRotation,
  rotatedBoundingBox,
} from '../../src/core/layout/index.ts';
import { createFormulaContext, defaultSimState } from '../../src/core/formula/index.ts';
import type { Doc, Node } from '../../src/core/model/types.ts';

describe('Layout Engine - Measurement & Geometries', () => {
  it('strips BBCode tags cleanly', () => {
    expect(stripBBCode('[b]Bold[/b] and [c=#FFFF0000]Red[/c]')).toBe('Bold and Red');
    expect(stripBBCode('[size=24]Large[/size] Text')).toBe('Large Text');
  });

  it('calculates arc geometry correctly', () => {
    const arc = arcGeometry(100, 20, 90);
    expect(arc.w).toBeGreaterThan(0);
    expect(arc.h).toBeGreaterThan(0);
    expect(arc.r).toBeGreaterThan(0);
  });

  it('calculates clock rotations at 10:10:30', () => {
    const fixedDate = new Date('2026-05-15T10:10:30Z');
    fixedDate.setHours(10, 10, 30, 0);

    const hourRot = calculateRotation('CLOCK_HOUR', 0, fixedDate);
    // 10 * 30 = 300 deg
    expect(hourRot.rot).toBe(300);

    const minRot = calculateRotation('CLOCK_MINUTE', 0, fixedDate);
    // 10 * 6 = 60 deg
    expect(minRot.rot).toBe(60);

    const secRot = calculateRotation('CLOCK_SECOND', 0, fixedDate);
    // 30 * 6 = 180 deg
    expect(secRot.rot).toBe(180);
  });

  it('calculates rotated bounding boxes', () => {
    // 0 deg: same
    expect(rotatedBoundingBox(100, 50, 0)).toEqual([100, 50]);
    // 90 deg: transposed
    expect(rotatedBoundingBox(100, 50, 90)).toEqual([50, 100]);
    // 45 deg square: diagonal ~ 141
    const [rw, rh] = rotatedBoundingBox(100, 100, 45);
    expect(rw).toBeCloseTo(141, -1);
    expect(rh).toBeCloseTo(141, -1);
  });
});

describe('Layout Engine - Stacking and Anchoring', () => {
  it('computes stack layer layout with margins', () => {
    const child1: Node = {
      id: 'c1',
      type: 'ShapeModule',
      title: 'Box 1',
      props: {
        shape_type: { value: 'RECT' },
        shape_width: { value: 100 },
        shape_height: { value: 50 },
      },
      extras: {},
    };

    const child2: Node = {
      id: 'c2',
      type: 'ShapeModule',
      title: 'Box 2',
      props: {
        shape_type: { value: 'RECT' },
        shape_width: { value: 100 },
        shape_height: { value: 50 },
      },
      extras: {},
    };

    const stack: Node = {
      id: 'stack',
      type: 'StackLayerModule',
      title: 'My Stack',
      props: {
        config_stacking: { value: 'VERTICAL_CENTER' },
        config_margin: { value: 10 },
      },
      children: [child1, child2],
      extras: {},
    };

    const root: Node = {
      id: 'root',
      type: 'RootLayerModule',
      title: 'Root',
      props: {},
      children: [stack],
      extras: {},
    };

    const doc: Doc = {
      kind: 'kwgt',
      info: { width: 720, height: 720 },
      root,
      globals: {},
      assets: new Map(),
      thumbs: {},
      extras: {},
    };

    const ctx = createFormulaContext();
    const layout = computeLayout(doc, { kind: 'widget', w: 720, h: 720 }, ctx);

    expect(layout.box.w).toBe(720);
    expect(layout.box.h).toBe(720);

    const stackLayout = layout.children[0];
    expect(stackLayout).toBeDefined();
    // 2 boxes of height 50 with margin 10 = 50 + 10 + 50 = 110
    expect(stackLayout.box.h).toBe(110);
    expect(stackLayout.box.w).toBe(100);

    // Child positions inside stack
    expect(stackLayout.children[0].transform.y).toBe(0);
    expect(stackLayout.children[1].transform.y).toBe(60); // 50 + 10 margin
  });
});
