import type { LayoutNode } from './types.ts';
import { propEnum, propNum, propStr } from './resolver.ts';

const ANCHORS = [
  'TOP_LEFT',
  'TOP',
  'TOP_RIGHT',
  'CENTER_LEFT',
  'CENTER',
  'CENTER_RIGHT',
  'BOTTOM_LEFT',
  'BOTTOM',
  'BOTTOM_RIGHT',
] as const;

function anchorToGravity(anchor: string): [number, number] {
  const i = ANCHORS.indexOf(anchor.toUpperCase() as any);
  if (i < 0) return [0, 0]; // default CENTER
  const gx = (i % 3) - 1; // -1 = left, 0 = center, 1 = right
  const gy = Math.floor(i / 3) - 1; // -1 = top, 0 = center, 1 = bottom
  return [gx, gy];
}

export function positionLayoutTree(
  node: LayoutNode,
  screenOffset = 0,
  screens = 1,
) {
  const [padL, padT, padR, padB] = node.box.pad;
  const innerW = node.box.w - padL - padR;
  const innerH = node.box.h - padT - padB;

  const isRoot = node.type === 'RootLayerModule';
  const isStack = node.type === 'StackLayerModule';

  const activeKids = node.children.filter((k) => !k.removed);

  if (isStack) {
    const stacking = propStr(node.resolvedProps, 'config_stacking', 'VERTICAL_LEFT').toUpperCase();
    const vertical = stacking.startsWith('VERTICAL');
    const margin = Math.round(propNum(node.resolvedProps, 'config_margin') * node.childUnit);

    let crossAlign = 0; // -1 left/top, 0 center, 1 right/bottom
    if (stacking === 'VERTICAL_LEFT' || stacking === 'HORIZONTAL_TOP') crossAlign = -1;
    else if (stacking === 'VERTICAL_RIGHT' || stacking === 'HORIZONTAL_BOTTOM') crossAlign = 1;

    let pos = 0;
    for (const kid of activeKids) {
      let x = 0;
      let y = 0;

      if (vertical) {
        if (crossAlign < 0) x = padL;
        else if (crossAlign > 0) x = padL + innerW - kid.box.w;
        else x = padL + Math.round((innerW - kid.box.w) / 2);

        y = padT + pos;
        pos += kid.box.h + margin;
      } else {
        x = padL + pos;

        if (crossAlign < 0) y = padT;
        else if (crossAlign > 0) y = padT + innerH - kid.box.h;
        else y = padT + Math.round((innerH - kid.box.h) / 2);

        pos += kid.box.w + margin;
      }

      kid.transform.x = x;
      kid.transform.y = y;

      positionLayoutTree(kid, screenOffset, screens);
    }
  } else {
    // RootLayerModule or OverlapLayerModule
    for (const kid of activeKids) {
      const anchorStr = propStr(kid.resolvedProps, 'position_anchor', 'CENTER');
      const [gx, gy] = anchorToGravity(anchorStr);

      const ox = isRoot ? Math.round(propNum(kid.resolvedProps, 'position_offset_x') * node.childUnit) : 0;
      const oy = isRoot ? Math.round(propNum(kid.resolvedProps, 'position_offset_y') * node.childUnit) : 0;

      let x = 0;
      if (gx < 0) x = padL + ox;
      else if (gx > 0) x = padL + innerW - kid.box.w - ox;
      else x = padL + Math.round((innerW - kid.box.w) / 2) + ox;

      let y = 0;
      if (gy < 0) y = padT + oy;
      else if (gy > 0) y = padT + innerH - kid.box.h - oy;
      else y = padT + Math.round((innerH - kid.box.h) / 2) + oy;

      kid.transform.x = x;
      kid.transform.y = y;

      positionLayoutTree(kid, screenOffset, screens);
    }
  }
}
