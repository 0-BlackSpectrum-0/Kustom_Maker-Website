// src/core/layout/text-measure.ts
import type { TextLayoutData } from './types.ts';

let measureCtx: any = null;

export function setMeasureContext(ctx: any) {
  measureCtx = ctx;
}

export function getMeasureContext(): any {
  if (measureCtx) return measureCtx;
  if (typeof (globalThis as any).__kustom_measure_ctx !== 'undefined') {
    measureCtx = (globalThis as any).__kustom_measure_ctx;
    return measureCtx;
  }
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    measureCtx = c.getContext('2d');
    return measureCtx;
  }
  if (typeof (globalThis as any).OffscreenCanvas !== 'undefined') {
    try {
      const oc = new (globalThis as any).OffscreenCanvas(1, 1);
      measureCtx = oc.getContext('2d');
      return measureCtx;
    } catch {
      // ignore
    }
  }
  return null;
}

const measureCache = new Map<string, number>();

/**
 * Measures text width using real Canvas 2D measurement context with font metric caching.
 * Falls back to proportional character weights if no canvas context is available.
 */
export function measureTextWidth(text: string, font: string, fontSize: number): number {
  if (!text) return 0;
  const key = `${font}:::${fontSize}:::${text}`;
  const cached = measureCache.get(key);
  if (cached !== undefined) return cached;

  const ctx = getMeasureContext();
  let width = 0;
  if (ctx) {
    ctx.font = font;
    width = ctx.measureText(text).width;
  } else {
    // Proportional heuristic fallback if no canvas context is active
    let total = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if ('WM_@%#'.includes(ch)) total += 0.85;
      else if ('ijlI.,!|:;\'" '.includes(ch)) total += 0.32;
      else if ('abcdefghknopqrstuvxyz0123456789'.includes(ch)) total += 0.55;
      else total += 0.65;
    }
    width = Math.round(total * fontSize);
  }

  measureCache.set(key, width);
  return width;
}

/**
 * Word wraps text to fit within maxWidth.
 */
export function wrapTextToWidth(
  text: string,
  font: string,
  fontSize: number,
  maxWidth: number,
  maxLines = 0
): string[] {
  if (!text) return [];
  if (maxWidth <= 0) return [text];

  const rawParagraphs = text.split('\n');
  const resultLines: string[] = [];

  for (const para of rawParagraphs) {
    if (!para) {
      resultLines.push('');
      continue;
    }

    const words = para.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const w = measureTextWidth(candidate, font, fontSize);

      if (w <= maxWidth || !currentLine) {
        currentLine = candidate;
      } else {
        resultLines.push(currentLine);
        currentLine = word;
        if (maxLines > 0 && resultLines.length >= maxLines) {
          break;
        }
      }
    }

    if (currentLine && (maxLines <= 0 || resultLines.length < maxLines)) {
      resultLines.push(currentLine);
    }

    if (maxLines > 0 && resultLines.length >= maxLines) {
      break;
    }
  }

  return resultLines.length > 0 ? resultLines : [text];
}

/**
 * Computes full layout data for a TextModule:
 * Handles SINGLE_FONT_HEIGHT, SINGLE_FIXED_WIDTH, FIXED_WIDTH, and FIT_TO_BOX modes.
 */
export function layoutTextModule(
  text: string,
  rawFamily: string,
  fontSize: number,
  sizeType: 'SINGLE_FONT_HEIGHT' | 'SINGLE_FIXED_WIDTH' | 'FIXED_WIDTH' | 'FIT_TO_BOX',
  targetWidth: number,
  maxLines: number
): TextLayoutData {
  const family = rawFamily ? (rawFamily.includes(' ') || rawFamily.startsWith('kw_') ? `"${rawFamily}"` : rawFamily) : 'sans-serif';
  const font = `${Math.round(fontSize)}px ${family}, sans-serif`;

  if (sizeType === 'FIXED_WIDTH') {
    const lines = wrapTextToWidth(text, font, fontSize, targetWidth, maxLines);
    let maxLineWidth = 0;
    for (const line of lines) {
      const lw = measureTextWidth(line, font, fontSize);
      if (lw > maxLineWidth) maxLineWidth = lw;
    }
    const lineHeight = fontSize * 1.25;
    const totalHeight = Math.max(fontSize, lines.length * lineHeight);
    return {
      lines,
      fontSize,
      lineHeight,
      maxLineWidth: Math.max(1, Math.min(targetWidth, maxLineWidth)),
      totalHeight,
    };
  }

  if (sizeType === 'SINGLE_FIXED_WIDTH') {
    const rawW = measureTextWidth(text, font, fontSize);
    let effectiveFontSize = fontSize;
    let effectiveW = rawW;

    if (targetWidth > 0 && rawW > targetWidth) {
      const scale = targetWidth / rawW;
      effectiveFontSize = Math.max(1, Math.round(fontSize * scale));
      effectiveW = targetWidth;
    }

    const lineHeight = effectiveFontSize * 1.25;
    return {
      lines: [text],
      fontSize: effectiveFontSize,
      lineHeight,
      maxLineWidth: effectiveW,
      totalHeight: Math.max(effectiveFontSize, lineHeight),
    };
  }

  // Default: SINGLE_FONT_HEIGHT (or FIT_TO_BOX)
  const lines = text.split('\n');
  let maxLineWidth = 0;
  for (const line of lines) {
    const lw = measureTextWidth(line, font, fontSize);
    if (lw > maxLineWidth) maxLineWidth = lw;
  }
  const lineHeight = fontSize * 1.25;
  const totalHeight = Math.max(fontSize, lines.length * lineHeight);

  return {
    lines,
    fontSize,
    lineHeight,
    maxLineWidth: Math.max(fontSize, maxLineWidth),
    totalHeight,
  };
}
