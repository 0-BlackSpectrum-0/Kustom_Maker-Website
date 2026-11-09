import type { Doc } from '../model/types.ts';
import type { FormulaContext } from '../formula/types.ts';
import type { CanvasTarget, LayoutNode } from './types.ts';
import { PropertyResolver } from './resolver.ts';
import { measureNode } from './measure.ts';
import { positionLayoutTree } from './position.ts';

export * from './types.ts';
export * from './resolver.ts';
export * from './rotation.ts';
export * from './measure.ts';
export * from './position.ts';

export function computeLayout(
  doc: Doc,
  target: CanvasTarget,
  ctx: FormulaContext,
  resolver = new PropertyResolver(),
): LayoutNode {
  const W = target.w;
  const H = target.h;
  const unit = Math.min(W, H) / 720;
  const rootLayout = measureNode(doc.root, unit, ctx, resolver, W, H);
  positionLayoutTree(rootLayout, target.offset ?? 0.5, target.screens ?? 1);
  return rootLayout;
}
