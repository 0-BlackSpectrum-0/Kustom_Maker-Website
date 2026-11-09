import type { Doc } from '../model/types.ts';
import type { SimState } from '../formula/types.ts';
import type { CanvasTarget } from '../layout/types.ts';
import { createFormulaContext, defaultSimState } from '../formula/index.ts';
import { computeLayout } from '../layout/index.ts';
import { ResourceManager } from './resources.ts';
import { Painter } from './painter.ts';

export interface RenderOptions {
  sim?: SimState;
  target?: CanvasTarget;
  customCanvas?: any;
  screens?: number;
  offset?: number;
}

export async function renderPreset(
  doc: Doc,
  target?: CanvasTarget,
  options?: RenderOptions,
): Promise<any> {
  const effectiveTarget: CanvasTarget = target ?? options?.target ?? {
    kind: doc.kind === 'kwgt' ? 'widget' : 'phone',
    w: doc.info.width ?? (doc.kind === 'kwgt' ? 415 : 540),
    h: doc.info.height ?? (doc.kind === 'kwgt' ? 542 : 1200),
    screens: options?.screens ?? doc.info.xscreens ? (doc.info.xscreens ?? 0) + 1 : 1,
    offset: options?.offset ?? 0.5,
  };

  const sim = options?.sim ?? defaultSimState();

  // Build globals map
  const globalsMap: Record<string, { value?: unknown; formula?: string; toggles?: number }> = {};
  if (doc.globals) {
    for (const [k, g] of Object.entries(doc.globals)) {
      globalsMap[k] = {
        value: g.value,
        formula: g.global_formula,
        toggles: g.toggles,
      };
    }
  }

  const ctx = createFormulaContext(sim, globalsMap);

  // Setup Canvas
  let canvas: any = options?.customCanvas;
  let GlobalFonts: any = null;

  if (!canvas) {
    // Detect environment: Node or Browser
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      canvas.width = effectiveTarget.w;
      canvas.height = effectiveTarget.h;
    } else {
      // In Node.js: dynamically import @napi-rs/canvas
      const modName = '@napi-rs/canvas';
      const napiCanvas = await import(/* @vite-ignore */ modName);
      if (!globalThis.Path2D) {
        (globalThis as any).Path2D = napiCanvas.Path2D;
      }
      canvas = napiCanvas.createCanvas(effectiveTarget.w, effectiveTarget.h);
      GlobalFonts = napiCanvas.GlobalFonts;
    }
  }

  const resources = new ResourceManager(doc.assets);

  // Register fonts if in Node
  if (GlobalFonts) {
    for (const path of doc.assets.keys()) {
      if (path.startsWith('fonts/') && (path.endsWith('.ttf') || path.endsWith('.otf'))) {
        resources.registerFontIfPossible(path, GlobalFonts);
      } else if (path.startsWith('icons/') && path.endsWith('.ttf')) {
        resources.registerFontIfPossible(path, GlobalFonts);
      }
    }
  }

  // Compute Layout
  const layoutRoot = computeLayout(doc, effectiveTarget, ctx);

  // Paint
  const ctx2d = canvas.getContext('2d');
  const painter = new Painter(resources);
  painter.paintTree(ctx2d, layoutRoot);

  return canvas;
}
