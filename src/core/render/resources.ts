import { resolveKfile } from '../archive/resolver.ts';
import type { Doc, Node } from '../model/types.ts';

export interface IconSetInfo {
  family: string;
  codes: Map<string, number>;
  rawJsonPath?: string;
  rawTtfPath?: string;
}

export interface DecodedImage {
  width: number;
  height: number;
  image: any;
  srcUrl?: string;
}

export interface ResourceRefInfo {
  uri: string;
  kind: 'font' | 'icon' | 'bitmap' | 'other';
  moduleId: string;
  moduleTitle: string;
  propKey: string;
  status: 'exact' | 'alias' | 'case_insensitive' | 'missing' | 'invalid_provider';
  resolvedPath?: string;
  details?: string;
}

/** 32-bit FNV-1a hash producing consistent CSS font-family tokens like 'kw_7f3a1c22' */
export function hash32(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export class ResourceManager {
  images = new Map<string, DecodedImage>();
  fontFamily = new Map<string, string>(); // resolved archive path -> CSS family (e.g. "kw_7f3a1c22")
  iconCodes = new Map<string, Map<string, number>>(); // resolved .ttf path / .json path / base -> codes
  iconSetFamilies = new Map<string, string>(); // resolved .ttf path / base -> CSS family
  assets: Map<string, Uint8Array>;
  prepared = false;

  constructor(assetsOrDoc?: Map<string, Uint8Array> | Doc | { assets?: Map<string, Uint8Array> }) {
    if (assetsOrDoc && 'assets' in assetsOrDoc && assetsOrDoc.assets instanceof Map) {
      this.assets = assetsOrDoc.assets;
    } else if (assetsOrDoc instanceof Map) {
      this.assets = assetsOrDoc;
    } else {
      this.assets = new Map();
    }

    // Index icon sets synchronously so getIconSet() is available immediately
    this.indexIconSets();
  }

  /**
   * Index icon sets from archive assets:
   * Strictly pairs `<Set>.ttf` with `<Set>.json` by basename, never falling back to "any json in icons/".
   */
  private indexIconSets() {
    const jsonEntries = new Map<string, { path: string; bytes: Uint8Array }>();
    const ttfEntries = new Map<string, string>(); // baseKey -> ttfPath

    for (const [path, bytes] of this.assets.entries()) {
      if (/^icons\/.+\.json$/i.test(path)) {
        const base = path.replace(/\.json$/i, '').toLowerCase();
        jsonEntries.set(base, { path, bytes });
      } else if (/^icons\/.+\.(ttf|otf)$/i.test(path)) {
        const base = path.replace(/\.(ttf|otf)$/i, '').toLowerCase();
        ttfEntries.set(base, path);
      }
    }

    for (const [baseKey, jsonItem] of jsonEntries.entries()) {
      const ttfPath = ttfEntries.get(baseKey);
      const codes = new Map<string, number>();

      try {
        const text = new TextDecoder('utf-8').decode(jsonItem.bytes);
        const data = JSON.parse(text);
        const iconList = Array.isArray(data.icons) ? data.icons : (Array.isArray(data) ? data : []);
        for (const ic of iconList) {
          const name = ic.properties?.name ?? ic.name;
          const codeVal = ic.properties?.code ?? ic.code;
          const code =
            typeof codeVal === 'number'
              ? codeVal
              : typeof codeVal === 'string'
              ? parseInt(codeVal, 10)
              : undefined;
          if (name && code !== undefined && !Number.isNaN(code)) {
            codes.set(String(name).toLowerCase(), code);
          }
        }
      } catch {
        // ignore malformed JSON
      }

      const fontKey = ttfPath ?? jsonItem.path;
      const fam = 'kw_' + hash32(fontKey.toLowerCase());
      const baseName = jsonItem.path.split('/').pop()?.replace(/\.json$/i, '') || '';

      // Register by json path
      this.iconCodes.set(jsonItem.path, codes);
      this.iconCodes.set(jsonItem.path.toLowerCase(), codes);

      // Register by base name
      this.iconCodes.set(baseName.toLowerCase(), codes);
      this.iconSetFamilies.set(baseName.toLowerCase(), fam);

      // Register under paired TTF path if present
      if (ttfPath) {
        this.iconCodes.set(ttfPath, codes);
        this.iconCodes.set(ttfPath.toLowerCase(), codes);
        this.iconSetFamilies.set(ttfPath, fam);
        this.iconSetFamilies.set(ttfPath.toLowerCase(), fam);
        this.fontFamily.set(ttfPath, fam);
        this.fontFamily.set(ttfPath.toLowerCase(), fam);
      }
    }
  }

  /**
   * Asynchronously prepares resources:
   * - Decodes all images (bitmaps) via createImageBitmap in browser, or loadImage in Node.
   * - Loads and registers fonts via FontFace in browser, or GlobalFonts in Node.
   * Both environments use identical CSS family names (`kw_<hash>`).
   */
  async prepare(doc?: Doc | { assets: Map<string, Uint8Array> }): Promise<void> {
    if (doc?.assets) {
      this.assets = doc.assets;
      this.indexIconSets();
    }

    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);

    let napiCanvas: any = null;
    if (isNode && !isBrowser) {
      try {
        const mod = '@napi-rs/canvas';
        napiCanvas = await import(/* @vite-ignore */ mod);
      } catch {
        // Node canvas optional/unavailable
      }
    }

    const jobs: Promise<void>[] = [];

    for (const [path, bytes] of this.assets.entries()) {
      // 1. Bitmaps
      if (/^bitmaps\//i.test(path) || /\.(png|jpe?g|webp|gif)$/i.test(path)) {
        if (isBrowser && typeof createImageBitmap === 'function') {
          jobs.push(
            (async () => {
              try {
                const blob = new Blob([bytes as any]);
                const bmp = await createImageBitmap(blob);
                const decoded: DecodedImage = {
                  width: bmp.width,
                  height: bmp.height,
                  image: bmp,
                  srcUrl: typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(blob) : undefined,
                };
                this.images.set(path, decoded);
                this.images.set(path.toLowerCase(), decoded);
              } catch (err) {
                console.warn(`[ResourceManager] Failed to decode bitmap "${path}":`, err);
              }
            })()
          );
        } else if (napiCanvas?.loadImage) {
          jobs.push(
            (async () => {
              try {
                const img = await napiCanvas.loadImage(Buffer.from(bytes));
                const decoded: DecodedImage = {
                  width: img.width,
                  height: img.height,
                  image: img,
                };
                this.images.set(path, decoded);
                this.images.set(path.toLowerCase(), decoded);
              } catch (err) {
                console.warn(`[ResourceManager] Failed to decode image in Node "${path}":`, err);
              }
            })()
          );
        }
      }

      // 2. Fonts
      if (/\.(ttf|otf)$/i.test(path)) {
        const fam = 'kw_' + hash32(path.toLowerCase());
        this.fontFamily.set(path, fam);
        this.fontFamily.set(path.toLowerCase(), fam);

        if (isBrowser && typeof FontFace !== 'undefined' && typeof document !== 'undefined') {
          jobs.push(
            (async () => {
              try {
                const fontBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
                const font = new FontFace(fam, fontBuffer);
                await font.load();
                document.fonts.add(font);
              } catch (err) {
                console.warn(`[ResourceManager] Failed to load font "${path}":`, err);
              }
            })()
          );
        } else if (napiCanvas?.GlobalFonts) {
          try {
            napiCanvas.GlobalFonts.register(Buffer.from(bytes), fam);
          } catch (err) {
            console.warn(`[ResourceManager] Failed to register font in Node "${path}":`, err);
          }
        }
      }
    }

    await Promise.all(jobs);
    this.prepared = true;
  }

  /**
   * One resolver for every kfile use: exact -> alias tail -> case-insensitive.
   * Returns the archive path if present.
   */
  resolve(uri: string): string | undefined {
    if (!uri) return undefined;
    const clean = uri.trim();
    if (this.assets.has(clean)) return clean;

    const res = resolveKfile(clean, this.assets);
    if (res.resolvedPath && res.status !== 'missing' && res.status !== 'invalid_provider') {
      return res.resolvedPath;
    }

    // Direct case-insensitive search
    const lower = clean.toLowerCase();
    for (const k of this.assets.keys()) {
      if (k.toLowerCase() === lower) return k;
    }

    // Try stripping leading folder or trailing extension
    const base = clean.split('/').pop()?.toLowerCase();
    if (base) {
      for (const k of this.assets.keys()) {
        const kLower = k.toLowerCase();
        if (kLower.endsWith('/' + base) || kLower === base) {
          return k;
        }
      }
    }

    return undefined;
  }

  /**
   * Returns the registered CSS font-family name for a font/icon URI.
   * Defaults to 'Roboto, sans-serif' for unknown fonts.
   */
  family(uri: string): string {
    if (!uri) return 'Roboto, sans-serif';
    const p = this.resolve(uri);
    if (p) {
      const fam = this.fontFamily.get(p) ?? this.fontFamily.get(p.toLowerCase());
      if (fam) return fam;
    }
    // If uri is already a plain family name without kfile or path slashes
    if (!uri.startsWith('kfile://') && !uri.includes('/') && !/\.(ttf|otf)$/i.test(uri)) {
      return uri;
    }
    return 'Roboto, sans-serif';
  }

  /** Returns decoded image from cache if available */
  getImage(uri: string): DecodedImage | undefined {
    if (!uri) return undefined;
    const p = this.resolve(uri);
    if (p) {
      const img = this.images.get(p) ?? this.images.get(p.toLowerCase());
      if (img) return img;
    }
    return this.images.get(uri) ?? this.images.get(uri.toLowerCase());
  }

  /** Set an image explicitly in cache */
  setImage(uri: string, img: DecodedImage) {
    this.images.set(uri, img);
  }

  /** Returns raw asset bytes for a kfile URI */
  getAssetBytes(uri: string): Uint8Array | undefined {
    if (!uri) return undefined;
    const p = this.resolve(uri);
    return p ? this.assets.get(p) : undefined;
  }

  /** Gets glyph codepoint map and font family for an icon set */
  getIconSet(setNameOrUri: string): IconSetInfo | undefined {
    if (!setNameOrUri) return undefined;

    let resolved = this.resolve(setNameOrUri);
    if (!resolved && !setNameOrUri.toLowerCase().endsWith('.ttf')) {
      resolved = this.resolve(setNameOrUri + '.ttf') || this.resolve('icons/' + setNameOrUri + '.ttf');
    }

    let codes = resolved ? (this.iconCodes.get(resolved) ?? this.iconCodes.get(resolved.toLowerCase())) : undefined;
    let fam = resolved ? (this.iconSetFamilies.get(resolved) ?? this.fontFamily.get(resolved)) : undefined;

    if (!codes) {
      const baseName = setNameOrUri.split('/').pop()?.replace(/\.(ttf|json)$/i, '').toLowerCase() || '';
      codes = this.iconCodes.get(baseName);
      fam = fam ?? this.iconSetFamilies.get(baseName);
    }

    const family = fam || 'KustomIcons';
    return { family, codes: codes ?? new Map() };
  }

  /**
   * Inspects all nodes in doc to find referenced resources and their resolution status.
   */
  listReferences(doc: Doc): ResourceRefInfo[] {
    const list: ResourceRefInfo[] = [];

    const checkProp = (
      val: unknown,
      kind: ResourceRefInfo['kind'],
      moduleId: string,
      moduleTitle: string,
      propKey: string
    ) => {
      if (typeof val !== 'string' || !val) return;
      if (!val.startsWith('kfile://') && !val.includes('/') && !/\.(ttf|otf|png|jpg|jpeg|webp)$/i.test(val)) return;

      const res = resolveKfile(val, this.assets);
      const resolved = this.resolve(val);

      let status: ResourceRefInfo['status'] = res.status;
      if (!res.resolvedPath && resolved) {
        status = 'alias';
      }

      list.push({
        uri: val,
        kind,
        moduleId,
        moduleTitle,
        propKey,
        status,
        resolvedPath: resolved ?? res.resolvedPath,
      });
    };

    const walk = (node: Node) => {
      const p = node.props;
      if (p.text_family?.value) {
        checkProp(p.text_family.value, 'font', node.id, node.title, 'text_family');
      }
      if (p.icon_set?.value) {
        checkProp(p.icon_set.value, 'icon', node.id, node.title, 'icon_set');
      }
      if (p.bitmap_bitmap?.value) {
        checkProp(p.bitmap_bitmap.value, 'bitmap', node.id, node.title, 'bitmap_bitmap');
      }
      if (p.bitmap_svg?.value) {
        checkProp(p.bitmap_svg.value, 'bitmap', node.id, node.title, 'bitmap_svg');
      }
      if (p.background_bitmap?.value) {
        checkProp(p.background_bitmap.value, 'bitmap', node.id, node.title, 'background_bitmap');
      }
      if (p.fx_gradient_bitmap?.value) {
        checkProp(p.fx_gradient_bitmap.value, 'bitmap', node.id, node.title, 'fx_gradient_bitmap');
      }

      for (const kid of node.children ?? []) {
        walk(kid);
      }
    };

    walk(doc.root);
    return list;
  }
}
