import type { Node } from '../model/types.ts';
import type { FormulaContext } from '../formula/types.ts';
import type { Box, LayoutNode } from './types.ts';
import { PropertyResolver, propEnum, propNum, propStr } from './resolver.ts';
import { calculateRotation, rotatedBoundingBox } from './rotation.ts';
import { VisibleModeValues, ShapeValues, PaintStyleValues } from '../spec/generated.ts';

export function stripBBCode(s: string): string {
  return s.replace(/\[\/?(b|i|u|s|up|dn|c|bl|bc|f|r|size|fa|mi|img|ic)(=[^\]]*)?\]/gi, '');
}

export function arcGeometry(len: number, thickness: number, angleDeg: number) {
  const angle = Math.min(360, Math.max(1e-4, angleDeg));
  const r = (360 * len) / (angle * 2 * Math.PI);
  const a0 = ((-90 - angle / 2) * Math.PI) / 180;
  const a1 = ((-90 + angle / 2) * Math.PI) / 180;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 32; i++) {
    const a = a0 + ((a1 - a0) * i) / 32;
    for (const rr of [r + thickness / 2, Math.max(0, r - thickness / 2)]) {
      pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
    }
  }
  const minX = Math.min(...pts.map((q) => q[0]));
  const maxX = Math.max(...pts.map((q) => q[0]));
  const minY = Math.min(...pts.map((q) => q[1]));
  const maxY = Math.max(...pts.map((q) => q[1]));
  return { cx: -minX, cy: -minY, r, t: thickness, a0, a1, w: maxX - minX, h: maxY - minY };
}

export function measureNode(
  node: Node,
  parentUnit: number,
  ctx: FormulaContext,
  resolver: PropertyResolver,
  targetW: number,
  targetH: number,
): LayoutNode {
  const resolved = resolver.resolveAll(node, ctx);

  // Unit scaling
  const scalePct = propNum(resolved, 'config_scale_value', 100);
  const unit = parentUnit;
  const childUnit = unit * Math.max(0.01, scalePct / 100);

  // Visibility (D09: spec-driven VisibleMode)
  const vis = propEnum(
    resolved,
    'config_visible',
    VisibleModeValues,
    'ALWAYS',
  );

  let removed = false;
  if (vis === 'REMOVE' || vis === 'NEVER') {
    removed = true;
  } else if (vis === 'IF_LOCKED') {
    removed = !ctx.sim?.screen?.locked;
  } else if (vis === 'IF_NOT_LOCKED') {
    removed = !!ctx.sim?.screen?.locked;
  } else if (vis === 'IF_LANDSCAPE') {
    removed = !ctx.sim?.screen?.land;
  } else if (vis === 'IF_PORTRAIT') {
    removed = !!ctx.sim?.screen?.land;
  }
  const visible = !removed;

  // Padding
  const padL = Math.round(propNum(resolved, 'position_padding_left') * unit);
  const padT = Math.round(propNum(resolved, 'position_padding_top') * unit);
  const padR = Math.round(propNum(resolved, 'position_padding_right') * unit);
  const padB = Math.round(propNum(resolved, 'position_padding_bottom') * unit);
  const userPad: [number, number, number, number] = [padL, padT, padR, padB];

  const layoutChildren: LayoutNode[] = [];
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      const childLayout = measureNode(child, childUnit, ctx, resolver, targetW, targetH);
      layoutChildren.push(childLayout);
    }
  }

  let boxW = 0;
  let boxH = 0;
  let rot = 0;
  let flipX = false;
  let flipY = false;

  const type = node.type;

  if (type === 'RootLayerModule') {
    boxW = targetW;
    boxH = targetH;
  } else if (type === 'StackLayerModule') {
    const stacking = propStr(resolved, 'config_stacking', 'VERTICAL_LEFT').toUpperCase();
    const vertical = stacking.startsWith('VERTICAL');
    const margin = Math.round(propNum(resolved, 'config_margin') * childUnit);

    const activeKids = layoutChildren.filter((k) => !k.removed);
    let totalW = 0;
    let totalH = 0;

    activeKids.forEach((k, i) => {
      const gap = i < activeKids.length - 1 ? margin : 0;
      if (vertical) {
        totalW = Math.max(totalW, k.box.w);
        totalH += k.box.h + gap;
      } else {
        totalW += k.box.w + gap;
        totalH = Math.max(totalH, k.box.h);
      }
    });

    boxW = totalW + padL + padR;
    boxH = totalH + padT + padB;
  } else if (type === 'OverlapLayerModule' || type === 'KomponentModule') {
    const activeKids = layoutChildren.filter((k) => !k.removed);
    let maxW = 0;
    let maxH = 0;
    for (const k of activeKids) {
      maxW = Math.max(maxW, k.box.w);
      maxH = Math.max(maxH, k.box.h);
    }
    boxW = maxW + padL + padR;
    boxH = maxH + padT + padB;
  } else if (type === 'ShapeModule') {
    const shape = propEnum(resolved, 'shape_type', ShapeValues, 'RECT');
    let w = propNum(resolved, 'shape_width', 100) * unit;
    const symmetric =
      shape === 'CIRCLE' ||
      shape === 'SQUARE' ||
      shape === 'EXAGON' ||
      shape === 'SLICE';
    let h = symmetric ? w : propNum(resolved, 'shape_height', 100) * unit;

    if (shape === 'ARC') {
      const arc = arcGeometry(w, h, propNum(resolved, 'shape_angle', 90));
      w = arc.w;
      h = arc.h;
    }

    const strokeStyle = propEnum(resolved, 'paint_style', PaintStyleValues, 'FILL');
    const strokeWidth = strokeStyle === 'STROKE' ? propNum(resolved, 'paint_stroke', 5) * unit : 0;

    const rInfo = calculateRotation(
      propStr(resolved, 'shape_rotate_mode', 'MANUAL'),
      propNum(resolved, 'shape_rotate_offset', 0),
      ctx.sim.now,
    );
    rot = rInfo.rot;
    flipX = rInfo.flipX;
    flipY = rInfo.flipY;

    const [rw, rh] = rotatedBoundingBox(w + strokeWidth, h + strokeWidth, rot);
    boxW = rw + padL + padR;
    boxH = rh + padT + padB;
  } else if (type === 'TextModule') {
    const rawText = stripBBCode(propStr(resolved, 'text_expression', ''));
    const fontSize = Math.max(1, propNum(resolved, 'text_size', 20) * unit);
    const rInfo = calculateRotation(
      propStr(resolved, 'text_rotate_mode', 'MANUAL'),
      propNum(resolved, 'text_rotate_offset', 0),
      ctx.sim.now,
    );
    rot = rInfo.rot;
    flipX = rInfo.flipX;
    flipY = rInfo.flipY;

    // Approximate text metrics in unit coordinate system
    // Average character width is ~0.55 * fontSize
    const lines = rawText.split('\n');
    const maxLineLen = Math.max(0, ...lines.map((l) => l.length));
    const textW = Math.max(fontSize, maxLineLen * (fontSize * 0.55));
    const textH = Math.max(fontSize, lines.length * (fontSize * 1.25));

    const [rw, rh] = rotatedBoundingBox(textW, textH, rot);
    boxW = rw + padL + padR;
    boxH = rh + padT + padB;
  } else if (type === 'FontIconModule') {
    const size = propNum(resolved, 'icon_size', 40) * unit;
    const rInfo = calculateRotation(
      propStr(resolved, 'icon_rotate_mode', 'MANUAL'),
      propNum(resolved, 'icon_rotate_offset', 0),
      ctx.sim.now,
    );
    rot = rInfo.rot;
    flipX = rInfo.flipX;
    flipY = rInfo.flipY;

    const [rw, rh] = rotatedBoundingBox(size, size, rot);
    boxW = rw + padL + padR;
    boxH = rh + padT + padB;
  } else if (type === 'BitmapModule') {
    const w = propNum(resolved, 'bitmap_width', 100) * unit;
    const h = propNum(resolved, 'bitmap_height', 100) * unit;
    const rInfo = calculateRotation(
      propStr(resolved, 'bitmap_rmode', 'MANUAL'),
      propNum(resolved, 'bitmap_rotate', 0),
      ctx.sim.now,
    );
    rot = rInfo.rot;
    flipX = rInfo.flipX;
    flipY = rInfo.flipY;

    const [rw, rh] = rotatedBoundingBox(w, h, rot);
    boxW = rw + padL + padR;
    boxH = rh + padT + padB;
  } else if (type === 'ProgressModule' || type === 'CurvedTextModule') {
    const size = propNum(resolved, 'progress_size', 100) * unit || 100 * unit;
    boxW = size + padL + padR;
    boxH = size + padT + padB;
  } else {
    // Default fallback
    boxW = padL + padR;
    boxH = padT + padB;
  }

  const layout: LayoutNode = {
    id: node.id,
    type: node.type,
    title: node.title,
    node,
    box: { w: Math.round(boxW), h: Math.round(boxH), pad: userPad, x: 0, y: 0 },
    transform: { x: 0, y: 0, rot, scaleX: flipX ? -1 : 1, scaleY: flipY ? -1 : 1 },
    resolvedProps: resolved,
    unit,
    childUnit,
    children: layoutChildren,
    visible,
    removed,
  };

  for (const child of layoutChildren) {
    child.parent = layout;
  }

  return layout;
}
