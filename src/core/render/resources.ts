import { resolveKfile } from '../archive/resolver.ts';

export interface IconSetInfo {
  family: string;
  codes: Map<string, number>;
}

export interface DecodedImage {
  width: number;
  height: number;
  image: any;
}

export class ResourceManager {
  private iconSets = new Map<string, IconSetInfo>();
  private imageCache = new Map<string, DecodedImage>();
  private fontFamilies = new Set<string>();
  private assets: Map<string, Uint8Array>;

  constructor(assets: Map<string, Uint8Array>) {
    this.assets = assets;
  }

  /** Resolves a kfile URI to actual Uint8Array asset bytes */
  getAssetBytes(uri: string): Uint8Array | undefined {
    if (!uri) return undefined;
    const res = resolveKfile(uri, this.assets);
    return res.data;
  }

  /** Gets glyph codepoint map and font family for an icon set */
  getIconSet(setName: string): IconSetInfo | undefined {
    if (!setName) return undefined;
    const cleanName = setName.replace(/\.ttf$/i, '').trim();
    if (this.iconSets.has(cleanName)) {
      return this.iconSets.get(cleanName);
    }

    // Try finding icons/<name>.json or any json in icons/
    let jsonBytes: Uint8Array | undefined;
    for (const [p, b] of this.assets.entries()) {
      if (p.toLowerCase().endsWith(`${cleanName.toLowerCase()}.json`)) {
        jsonBytes = b;
        break;
      }
    }

    if (!jsonBytes) {
      // Look for any .json in icons/
      for (const [p, b] of this.assets.entries()) {
        if (p.startsWith('icons/') && p.endsWith('.json')) {
          jsonBytes = b;
          break;
        }
      }
    }

    const codes = new Map<string, number>();
    const family = cleanName || 'KustomIcons';

    if (jsonBytes) {
      try {
        const text = new TextDecoder('utf-8').decode(jsonBytes);
        const data = JSON.parse(text);
        if (Array.isArray(data.icons)) {
          for (const ic of data.icons) {
            const name = ic.properties?.name;
            const code = ic.properties?.code;
            if (name && typeof code === 'number') {
              codes.set(String(name).toLowerCase(), code);
            }
          }
        }
      } catch {
        // ignore malformed JSON
      }
    }

    const info: IconSetInfo = { family, codes };
    this.iconSets.set(cleanName, info);
    return info;
  }

  /** Registers a font from the archive into the canvas font registry if in Node */
  registerFontIfPossible(fontUri: string, GlobalFonts?: any): string {
    const bytes = this.getAssetBytes(fontUri);
    if (!bytes || !GlobalFonts) return 'sans-serif';

    const baseName = fontUri.split('/').pop()?.replace(/\.[^.]+$/, '') || 'CustomFont';
    if (this.fontFamilies.has(baseName)) {
      return baseName;
    }

    try {
      GlobalFonts.register(Buffer.from(bytes), baseName);
      this.fontFamilies.add(baseName);
      return baseName;
    } catch {
      return 'sans-serif';
    }
  }

  /** Synchronous / cached image getter */
  getImage(uri: string): DecodedImage | undefined {
    return this.imageCache.get(uri);
  }

  /** Cache an already decoded image */
  setImage(uri: string, img: DecodedImage) {
    this.imageCache.set(uri, img);
  }
}
