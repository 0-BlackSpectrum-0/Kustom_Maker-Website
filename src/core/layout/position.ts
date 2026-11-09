import type { LayoutNode } from './types.ts';
import { propNum, propStr } from './resolver.ts';
import { AnchorModeValues, type AnchorMode } from '../spec/generated.ts';

export const ANCHOR_GRAVITY: Record<AnchorMode, [number, number]> = {
  TOPLEFT: [-1, -1],
  TOP: [0, -1],
  TOPRIGHT: [1, -1],
  CENTERLEFT: [-1, 0],
  CENTER: [0, 0],
  CENTERRIGHT: [1, 0],
  BOTTOMLEFT: [-1, 1],
  BOTTOM: [0, 1],
  BOTTOMRIGHT: [1, 1],
};

const warnedAnchors = new Set<string>();

export function anchorToGravity(anchor: string): [number, number] {
  if (!anchor) return [0, 0];
  const clean = anchor.toUpperCase().replace(/_/g, '') as AnchorMode;
  if (clean in ANCHOR_GRAVITY) {
    return ANCHOR_GRAVITY[clean];
  }
  if (!warnedAnchors.has(anchor)) {
    warnedAnchors.add(anchor);
    console.warn(`[KustomWeb] Unknown anchor mode: "${anchor}", falling back to CENTER`);
  }
  return [0, 0];
}

export function positionLayoutTree(
  node: LayoutNode,
  screenOffset = 0,
  screens = 1,
) {
  const [padL, padT, padR, padB] = node.box.pad;
  const innerW = node.box.w - padL - padR;
  const innerH = node.box.h - padT - padB;

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
      kid.box.x = x;
      kid.box.y = y;

      positionLayoutTree(kid, screenOffset, screens);
    }
  } else {
    // RootLayerModule, OverlapLayerModule, or KomponentModule
    for (const kid of activeKids) {
      const anchorStr = propStr(kid.resolvedProps, 'position_anchor', 'CENTER');
      const [gx, gy] = anchorToGravity(anchorStr);

      const ox = Math.round(propNum(kid.resolvedProps, 'position_offset_x') * node.childUnit);
      const oy = Math.round(propNum(kid.resolvedProps, 'position_offset_y') * node.childUnit);

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
      kid.box.x = x;
      kid.box.y = y;

      positionLayoutTree(kid, screenOffset, screens);
    }
  }
}
