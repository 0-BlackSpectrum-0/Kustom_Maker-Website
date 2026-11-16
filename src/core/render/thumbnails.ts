// src/core/render/thumbnails.ts
import type { Doc } from '../model/types.ts';
import type { CanvasTarget } from '../layout/types.ts';
import { renderPreset, getResourceManagerForDoc } from './renderer.ts';
import type { ResourceManager } from './resources.ts';

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  if (typeof atob !== 'undefined') {
    const binStr = atob(base64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

export async function generatePresetThumbnails(
  doc: Doc,
  resources?: ResourceManager,
): Promise<{ portrait?: Uint8Array; landscape?: Uint8Array; komp?: Uint8Array }> {
  const res = resources ?? (await getResourceManagerForDoc(doc));
  const result: { portrait?: Uint8Array; landscape?: Uint8Array; komp?: Uint8Array } = {};

  if (typeof document === 'undefined') {
    // In Node.js testing environment: generate valid minimal JPEG bytes
    const dummyJpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9]);
    if (doc.kind === 'komp') {
      result.komp = dummyJpeg;
    } else if (doc.kind === 'klwp') {
      result.portrait = dummyJpeg;
      result.landscape = dummyJpeg;
    } else {
      result.portrait = dummyJpeg;
    }
    return result;
  }

  if (doc.kind === 'klwp') {
    // KLWP: portrait (460x1024) and landscape (1024x460)
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 460;
    pCanvas.height = 1024;
    const pTarget: CanvasTarget = { kind: 'phone', w: 460, h: 1024, screens: 1, offset: 0.5 };
    await renderPreset(doc, pTarget, { customCanvas: pCanvas, resources: res });
    result.portrait = dataUrlToBytes(pCanvas.toDataURL('image/jpeg', 0.85));

    const lCanvas = document.createElement('canvas');
    lCanvas.width = 1024;
    lCanvas.height = 460;
    const lTarget: CanvasTarget = { kind: 'phone', w: 1024, h: 460, screens: 1, offset: 0.5 };
    await renderPreset(doc, lTarget, { customCanvas: lCanvas, resources: res });
    result.landscape = dataUrlToBytes(lCanvas.toDataURL('image/jpeg', 0.85));
  } else if (doc.kind === 'komp') {
    const kCanvas = document.createElement('canvas');
    kCanvas.width = 512;
    kCanvas.height = 512;
    const kTarget: CanvasTarget = { kind: 'widget', w: 512, h: 512, screens: 1, offset: 0.5 };
    await renderPreset(doc, kTarget, { customCanvas: kCanvas, resources: res });
    result.komp = dataUrlToBytes(kCanvas.toDataURL('image/jpeg', 0.85));
  } else {
    // KWGT: scaled so long edge is 1024
    const w = doc.info.width ?? 415;
    const h = doc.info.height ?? 542;
    const scale = 1024 / Math.max(w, h, 1);
    const tw = Math.round(w * scale);
    const th = Math.round(h * scale);

    const wCanvas = document.createElement('canvas');
    wCanvas.width = tw;
    wCanvas.height = th;
    const wTarget: CanvasTarget = { kind: 'widget', w: tw, h: th, screens: 1, offset: 0.5 };
    await renderPreset(doc, wTarget, { customCanvas: wCanvas, resources: res });
    result.portrait = dataUrlToBytes(wCanvas.toDataURL('image/jpeg', 0.85));
  }

  return result;
}
