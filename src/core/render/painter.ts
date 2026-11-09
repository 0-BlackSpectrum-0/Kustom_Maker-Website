import type { LayoutNode } from '../layout/types.ts';
import type { ResourceManager } from './resources.ts';
import { propEnum, propNum, propStr } from '../layout/resolver.ts';
import { arcGeometry, stripBBCode } from '../layout/measure.ts';
import { parseColor } from '../formula/functions/color-utils.ts';

export function cssColor(hexStr: string, fallback = 'rgba(255,255,255,1)'): string {
  if (!hexStr) return fallback;
  const c = parseColor(hexStr);
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${(c.a / 255).toFixed(4)})`;
}

function quoteCssFamily(fam: string): string {
  if (!fam) return 'sans-serif';
  if (fam.startsWith('"') || fam.startsWith("'")) return fam;
  if (fam.includes(' ') || fam.startsWith('kw_')) {
    return `"${fam}"`;
  }
  return fam;
}

const BLEND_MODES: Record<string, GlobalCompositeOperation> = {
  NORMAL: 'source-over',
  CLEAR: 'destination-out',
  XOR: 'xor',
  SRC: 'copy',
  DARKEN: 'darken',
  LIGHTEN: 'lighten',
  MULTIPLY: 'multiply',
  SCREEN: 'screen',
  ADD: 'lighter',
  OVERLAY: 'overlay',
};

function createOffscreenCanvas(width: number, height: number): { canvas: any; ctx: any } | null {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));

  if (typeof (globalThis as any).OffscreenCanvas !== 'undefined') {
    try {
      const oc = new (globalThis as any).OffscreenCanvas(w, h);
      const ctx = oc.getContext('2d');
      if (ctx) return { canvas: oc, ctx };
    } catch {}
  }
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    try {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (ctx) return { canvas: c, ctx };
    } catch {}
  }
  if (typeof (globalThis as any).__kustom_create_canvas === 'function') {
    try {
      const c = (globalThis as any).__kustom_create_canvas(w, h);
      const ctx = c.getContext('2d');
      if (ctx) return { canvas: c, ctx };
    } catch {}
  }
  if (typeof process !== 'undefined' && Boolean(process.versions?.node)) {
    try {
      const napi = Function('try { return require("@napi-rs/canvas"); } catch { return null; }')();
      if (napi?.createCanvas) {
        const c = napi.createCanvas(w, h);
        const ctx = c.getContext('2d');
        if (ctx) return { canvas: c, ctx };
      }
    } catch {}
  }
  return {
    canvas: { width: w, height: h },
    ctx: {
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      beginPath: () => {},
      rect: () => {},
      fill: () => {},
      stroke: () => {},
      clip: () => {},
      measureText: () => ({ width: 50 }),
      fillText: () => {},
      strokeText: () => {},
      drawImage: () => {},
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
    },
  };
}

export class Painter {
  private resources?: ResourceManager;

  constructor(resources?: ResourceManager) {
    this.resources = resources;
  }

  paintTree(ctx: CanvasRenderingContext2D, root: LayoutNode) {
    this.paintBackground(ctx, root);
    this.paintNode(ctx, root);
  }

  private paintBackground(ctx: CanvasRenderingContext2D, root: LayoutNode) {
    const bgType = propStr(root.resolvedProps, 'background_type', 'SOLID').toUpperCase();
    const bgColor = propStr(root.resolvedProps, 'background_color', '#FF000000');

    ctx.save();
    ctx.fillStyle = cssColor(bgColor, '#000000');
    ctx.fillRect(0, 0, root.box.w, root.box.h);

    if (bgType === 'IMAGE') {
      const bgUri = propStr(root.resolvedProps, 'background_bitmap');
      if (bgUri) {
        const img = this.resources?.getImage(bgUri);
        if (img && img.image) {
          ctx.drawImage(img.image, 0, 0, root.box.w, root.box.h);
        }
      }
    }
    ctx.restore();
  }

  paintNode(ctx: CanvasRenderingContext2D, node: LayoutNode) {
    if (!node.visible || node.removed) return;

    ctx.save();

    // Layer-level alpha & transforms
    if (node.type !== 'RootLayerModule') {
      const alpha = Math.max(0, Math.min(100, propNum(node.resolvedProps, 'config_alpha', 100)));
      ctx.globalAlpha *= alpha / 100;
    }

    const { x, y, rot, scaleX, scaleY } = node.transform;
    ctx.translate(x, y);

    if (scaleX !== 1 || scaleY !== 1) {
      ctx.translate(node.box.w / 2, node.box.h / 2);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-node.box.w / 2, -node.box.h / 2);
    }

    if (rot !== 0) {
      ctx.translate(node.box.w / 2, node.box.h / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.translate(-node.box.w / 2, -node.box.h / 2);
    }

    // Paint leaf or container
    if (node.type === 'ShapeModule') {
      this.paintShape(ctx, node);
    } else if (node.type === 'TextModule') {
      this.paintText(ctx, node);
    } else if (node.type === 'FontIconModule') {
      this.paintFontIcon(ctx, node);
    } else if (node.type === 'BitmapModule') {
      this.paintBitmap(ctx, node);
    } else if (node.type === 'ProgressModule') {
      this.paintProgress(ctx, node);
    } else if (node.type === 'CurvedTextModule') {
      this.paintCurvedText(ctx, node);
    }

    // Children
    const activeKids = node.children.filter((k) => !k.removed);
    if (activeKids.length === 0) {
      ctx.restore();
      return;
    }

    // Isolate blend modes (CLEAR, XOR, SRC) and masks inside offscreen buffer
    const needsOffscreen =
      node.type !== 'RootLayerModule' &&
      activeKids.some((k) => {
        const pm = propStr(k.resolvedProps, 'paint_mode', 'NORMAL').toUpperCase();
        const mask = propStr(k.resolvedProps, 'fx_mask', 'NONE').toUpperCase();
        return pm !== 'NORMAL' || mask !== 'NONE';
      });

    const targetOffscreen = needsOffscreen ? createOffscreenCanvas(node.box.w, node.box.h) : null;
    const renderCtx: CanvasRenderingContext2D = targetOffscreen?.ctx ?? ctx;

    if (targetOffscreen) {
      renderCtx.save();
    }

    let clipNextPath: Path2D | null = null;
    let clipAllPath: Path2D | null = null;

    for (let i = 0; i < activeKids.length; i++) {
      const kid = activeKids[i];
      const mask = propStr(kid.resolvedProps, 'fx_mask', 'NONE').toUpperCase();

      renderCtx.save();

      if (clipNextPath) {
        renderCtx.clip(clipNextPath);
        clipNextPath = null;
      } else if (clipAllPath) {
        renderCtx.clip(clipAllPath);
      }

      const paintMode = propStr(kid.resolvedProps, 'paint_mode', 'NORMAL').toUpperCase();
      const compOp = BLEND_MODES[paintMode] ?? 'source-over';
      renderCtx.globalCompositeOperation = compOp;

      this.paintNode(renderCtx, kid);

      renderCtx.restore();

      if (mask === 'CLIP_NEXT') {
        clipNextPath = this.getShapePath(kid);
      } else if (mask === 'CLIP_ALL') {
        clipAllPath = this.getShapePath(kid);
      }
    }

    if (targetOffscreen) {
      renderCtx.restore();
      try {
        ctx.drawImage(targetOffscreen.canvas, 0, 0);
      } catch {
        // Fallback for mock contexts
      }
    }

    ctx.restore();
  }

  private applyStyleAndShadow(ctx: CanvasRenderingContext2D, node: LayoutNode, w: number, h: number): boolean {
    const colorHex = propStr(node.resolvedProps, 'paint_color', '#FFFFFFFF');
    const color = cssColor(colorHex);

    const grad = propStr(node.resolvedProps, 'fx_gradient', 'NONE').toUpperCase();
    let style: string | CanvasGradient | CanvasPattern = color;

    if (grad === 'HORIZONTAL') {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      const gColor = cssColor(propStr(node.resolvedProps, 'fx_gradient_color', '#FF888888'));
      g.addColorStop(0, color);
      g.addColorStop(1, gColor);
      style = g;
    } else if (grad === 'VERTICAL') {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      const gColor = cssColor(propStr(node.resolvedProps, 'fx_gradient_color', '#FF888888'));
      g.addColorStop(0, color);
      g.addColorStop(1, gColor);
      style = g;
    } else if (grad === 'RADIAL') {
      const cx = w / 2;
      const cy = h / 2;
      const rad = Math.max(1, Math.hypot(cx, cy));
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      const gColor = cssColor(propStr(node.resolvedProps, 'fx_gradient_color', '#FF888888'));
      g.addColorStop(0, color);
      g.addColorStop(1, gColor);
      style = g;
    } else if (grad === 'SWEEP' && typeof ctx.createConicGradient === 'function') {
      const cx = w / 2;
      const cy = h / 2;
      const g = ctx.createConicGradient(Math.PI / 2, cx, cy);
      const gColor = cssColor(propStr(node.resolvedProps, 'fx_gradient_color', '#FF888888'));
      g.addColorStop(0, color);
      g.addColorStop(1, gColor);
      style = g;
    } else if (grad === 'BITMAP') {
      const bUri = propStr(node.resolvedProps, 'fx_gradient_bitmap');
      if (bUri) {
        const img = this.resources?.getImage(bUri);
        if (img && img.image) {
          try {
            const pattern = ctx.createPattern(img.image, 'repeat');
            if (pattern) style = pattern;
          } catch {
            // Pattern creation fallback
          }
        }
      }
    }

    ctx.fillStyle = style;
    ctx.strokeStyle = style;

    const strokeStyle = propEnum(node.resolvedProps, 'paint_style', ['FILL', 'STROKE'] as const, 'FILL');
    const strokeWidth = propNum(node.resolvedProps, 'paint_stroke', 5) * node.unit;
    ctx.lineWidth = strokeWidth;

    const shadowType = propStr(node.resolvedProps, 'fx_shadow', 'NONE').toUpperCase();
    if (shadowType === 'OUTER') {
      const dist = propNum(node.resolvedProps, 'fx_shadow_distance', 5) * node.unit;
      const dir = propNum(node.resolvedProps, 'fx_shadow_direction', 0);
      const blur = propNum(node.resolvedProps, 'fx_shadow_blur', 5) * node.unit * 0.5;
      const rad = ((360 - dir) * Math.PI) / 180;
      ctx.shadowOffsetX = dist * Math.cos(rad);
      ctx.shadowOffsetY = dist * Math.sin(rad);
      ctx.shadowBlur = blur;
      ctx.shadowColor = cssColor(propStr(node.resolvedProps, 'fx_shadow_color', '#FF000000'));
    }

    return strokeStyle === 'STROKE';
  }

  getShapePath(node: LayoutNode): Path2D {
    const shape = propStr(node.resolvedProps, 'shape_type', 'RECT').toUpperCase();
    const w = Math.max(0, propNum(node.resolvedProps, 'shape_width', 100) * node.unit);
    const symmetric =
      shape === 'CIRCLE' ||
      shape === 'SQUARE' ||
      shape === 'EXAGON' ||
      shape === 'SLICE';
    const h = Math.max(0, symmetric ? w : propNum(node.resolvedProps, 'shape_height', 100) * node.unit);
    const corners = Math.max(0, propNum(node.resolvedProps, 'shape_corners', 0) * node.unit);

    const p = new Path2D();
    const [padL, padT] = node.box.pad;
    const x0 = padL;
    const y0 = padT;

    switch (shape) {
      case 'CIRCLE':
      case 'OVAL':
        p.ellipse(x0 + w / 2, y0 + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        break;
      case 'SQUARE':
        p.rect(x0, y0, w, w);
        break;
      case 'TRIANGLE':
        p.moveTo(x0 + w / 2, y0);
        p.lineTo(x0 + w, y0 + h);
        p.lineTo(x0, y0 + h);
        p.closePath();
        break;
      case 'RTRIANGLE':
        p.moveTo(x0, y0);
        p.lineTo(x0 + w, y0 + h);
        p.lineTo(x0, y0 + h);
        p.closePath();
        break;
      case 'EXAGON':
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 2;
          const px = x0 + w / 2 + (w / 2) * Math.cos(a);
          const py = y0 + h / 2 + (h / 2) * Math.sin(a);
          if (i === 0) p.moveTo(px, py);
          else p.lineTo(px, py);
        }
        p.closePath();
        break;
      case 'SLICE': {
        const sweep = (Math.min(360, Math.max(0, propNum(node.resolvedProps, 'shape_angle', 90))) * Math.PI) / 180;
        const r = w / 2;
        const inner = Math.max(0, r - Math.min(propNum(node.resolvedProps, 'shape_height', 20) * node.unit, r));
        const a0 = -Math.PI / 2;
        p.arc(x0 + r, y0 + r, r, a0, a0 + sweep);
        p.arc(x0 + r, y0 + r, inner, a0 + sweep, a0, true);
        p.closePath();
        break;
      }
      case 'ARC': {
        const g = arcGeometry(w, h, propNum(node.resolvedProps, 'shape_angle', 90));
        p.arc(x0 + g.cx, y0 + g.cy, g.r + g.t / 2, g.a0, g.a1);
        p.arc(x0 + g.cx, y0 + g.cy, Math.max(0, g.r - g.t / 2), g.a1, g.a0, true);
        p.closePath();
        break;
      }
      case 'PATH': {
        const svg = propStr(node.resolvedProps, 'shape_path');
        if (svg) {
          try {
            return new Path2D(`M ${x0},${y0} ` + svg);
          } catch {
            p.rect(x0, y0, w, h);
          }
        } else {
          p.rect(x0, y0, w, h);
        }
        break;
      }
      default:
        if (corners > 0 && w > 0 && h > 0 && typeof p.roundRect === 'function') {
          const radius = Math.max(0, Math.min(corners, w / 2, h / 2));
          p.roundRect(x0, y0, w, h, radius);
        } else {
          p.rect(x0, y0, w, h);
        }
    }

    return p;
  }

  private paintShape(ctx: CanvasRenderingContext2D, node: LayoutNode) {
    const isStroke = this.applyStyleAndShadow(ctx, node, node.box.w, node.box.h);
    const path = this.getShapePath(node);

    if (isStroke) {
      ctx.stroke(path);
    } else {
      ctx.fill(path);
    }
  }

  private paintText(ctx: CanvasRenderingContext2D, node: LayoutNode) {
    const isStroke = this.applyStyleAndShadow(ctx, node, node.box.w, node.box.h);
    const text = stripBBCode(propStr(node.resolvedProps, 'text_expression', ''));
    if (!text) return;

    const textLayout = node.textLayout;
    const fontSize = textLayout ? textLayout.fontSize : Math.max(1, propNum(node.resolvedProps, 'text_size', 20) * node.unit);
    const rawFamily = propStr(node.resolvedProps, 'text_family', 'sans-serif');
    const family = this.resources ? this.resources.family(rawFamily) : rawFamily;
    const fontStr = `${Math.round(fontSize)}px ${quoteCssFamily(family)}, sans-serif`;

    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      const prevFont = ctx.font;
      ctx.font = fontStr;
      if (ctx.font === prevFont && prevFont !== fontStr) {
        console.warn(`[Painter] Canvas ignored font assignment: "${fontStr}" (was "${prevFont}")`);
      }
    } else {
      ctx.font = fontStr;
    }

    ctx.textBaseline = 'top';

    const align = propStr(node.resolvedProps, 'text_align', 'LEFT').toUpperCase();
    const [padL, padT] = node.box.pad;
    const lines = textLayout ? textLayout.lines : text.split('\n');
    const lineHeight = textLayout ? textLayout.lineHeight : fontSize * 1.25;

    lines.forEach((line, i) => {
      let lx = padL;
      if (align === 'CENTER') {
        const lw = ctx.measureText(line).width;
        lx = padL + Math.max(0, (node.box.w - padL * 2 - lw) / 2);
      } else if (align === 'RIGHT') {
        const lw = ctx.measureText(line).width;
        lx = node.box.w - padL - lw;
      }
      const ly = padT + i * lineHeight;

      if (isStroke) {
        ctx.strokeText(line, lx, ly);
      } else {
        ctx.fillText(line, lx, ly);
      }
    });
  }

  private paintFontIcon(ctx: CanvasRenderingContext2D, node: LayoutNode) {
    const isStroke = this.applyStyleAndShadow(ctx, node, node.box.w, node.box.h);
    const setName = propStr(node.resolvedProps, 'icon_set');
    const iconName = propStr(node.resolvedProps, 'icon_icon').trim().toLowerCase();

    const iconSet = this.resources?.getIconSet(setName);
    const code = iconSet?.codes.get(iconName);
    const char = code !== undefined ? String.fromCodePoint(code) : '';
    if (!char) return;

    const size = Math.round(propNum(node.resolvedProps, 'icon_size', 40) * node.unit);
    const family = iconSet?.family || 'sans-serif';
    ctx.font = `${size}px ${quoteCssFamily(family)}, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const [padL, padT] = node.box.pad;
    const cx = padL + (node.box.w - padL * 2) / 2;
    const cy = padT + (node.box.h - padT * 2) / 2;

    if (isStroke) {
      ctx.strokeText(char, cx, cy);
    } else {
      ctx.fillText(char, cx, cy);
    }
  }

  private paintBitmap(ctx: CanvasRenderingContext2D, node: LayoutNode) {
    const uri = propStr(node.resolvedProps, 'bitmap_bitmap') || propStr(node.resolvedProps, 'bitmap_svg');
    if (!uri) return;

    const img = this.resources?.getImage(uri);
    if (!img || !img.image) return;

    const [padL, padT] = node.box.pad;
    const w = node.box.w - padL * 2;
    const h = node.box.h - padT * 2;

    const alpha = Math.max(0, Math.min(100, propNum(node.resolvedProps, 'bitmap_alpha', 100)));
    ctx.save();
    ctx.globalAlpha *= alpha / 100;

    const blur = propNum(node.resolvedProps, 'bitmap_blur', 0);
    if (blur > 0) {
      ctx.filter = `blur(${Math.round(blur * 0.5)}px)`;
    }

    ctx.drawImage(img.image, padL, padT, w, h);
    ctx.restore();
  }

  private paintProgress(ctx: CanvasRenderingContext2D, node: LayoutNode) {
    this.applyStyleAndShadow(ctx, node, node.box.w, node.box.h);
    const style = propStr(node.resolvedProps, 'progress_style', 'LINEAR').toUpperCase();
    const min = propNum(node.resolvedProps, 'progress_min', 0);
    const max = Math.max(1, propNum(node.resolvedProps, 'progress_max', 100));
    const level = propNum(
      node.resolvedProps,
      'progress_level',
      propNum(node.resolvedProps, 'progress_progress', 50)
    );
    const ratio = Math.max(0, Math.min(1, (level - min) / (max - min)));

    const [padL, padT] = node.box.pad;
    const w = Math.max(1, node.box.w - padL * 2);
    const h = Math.max(1, node.box.h - padT * 2);

    const bgColor = propStr(node.resolvedProps, 'color_bgcolor', '#33FFFFFF');
    const fillColor = propStr(
      node.resolvedProps,
      'color_color',
      propStr(node.resolvedProps, 'paint_color', '#FFFFFFFF')
    );

    if (style === 'CIRCLE') {
      const strokeW = Math.max(1, propNum(node.resolvedProps, 'paint_stroke', 10) * node.unit);
      const r = Math.max(1, Math.min(w, h) / 2 - strokeW / 2);
      const cx = padL + w / 2;
      const cy = padT + h / 2;

      ctx.save();
      ctx.lineWidth = strokeW;
      ctx.strokeStyle = cssColor(bgColor);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      if (ratio > 0) {
        ctx.strokeStyle = cssColor(fillColor);
        ctx.beginPath();
        const a0 = -Math.PI / 2;
        ctx.arc(cx, cy, r, a0, a0 + ratio * Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = cssColor(bgColor);
      ctx.fillRect(padL, padT, w, h);

      if (ratio > 0) {
        ctx.fillStyle = cssColor(fillColor);
        ctx.fillRect(padL, padT, w * ratio, h);
      }
      ctx.restore();
    }
  }

  private paintCurvedText(ctx: CanvasRenderingContext2D, node: LayoutNode) {
    this.applyStyleAndShadow(ctx, node, node.box.w, node.box.h);
    const text = stripBBCode(
      propStr(node.resolvedProps, 'curved_expression', propStr(node.resolvedProps, 'text_expression', ''))
    );
    if (!text) return;

    const radius = Math.max(
      1,
      propNum(node.resolvedProps, 'curved_radius', propNum(node.resolvedProps, 'text_width', 100)) * node.unit
    );
    const fontSize = Math.max(
      1,
      propNum(node.resolvedProps, 'curved_size', propNum(node.resolvedProps, 'text_size', 40)) * node.unit
    );
    const rawFamily = propStr(node.resolvedProps, 'curved_family', propStr(node.resolvedProps, 'text_family', ''));
    const family = this.resources ? this.resources.family(rawFamily) : 'sans-serif';
    ctx.font = `${Math.round(fontSize)}px ${quoteCssFamily(family)}, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = node.box.w / 2;
    const cy = node.box.h / 2;
    const angleOffset = (propNum(node.resolvedProps, 'curved_angle', 0) * Math.PI) / 180;

    const charSpacing = fontSize * 0.7;
    const angularSpan = (text.length * charSpacing) / radius;
    const startA = -Math.PI / 2 - angularSpan / 2 + angleOffset;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const a = startA + (i * charSpacing) / radius;
      ctx.save();
      ctx.translate(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
      ctx.rotate(a + Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
  }
}

export { Painter as CanvasPainter };
