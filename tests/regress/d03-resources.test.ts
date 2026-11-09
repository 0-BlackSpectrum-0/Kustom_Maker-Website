import { describe, it, expect } from 'vitest';
import { ResourceManager } from '../../src/core/render/resources.ts';

describe('D03: Resources - Fonts, Icons, and Images resolution', () => {
  it.fails('resolves icon set JSON correctly when given a kfile alias URI in an archive with multiple icon sets', () => {
    const featherJson = JSON.stringify({
      icons: [{ properties: { name: 'feather_icon', code: 101 } }],
    });
    const faJson = JSON.stringify({
      icons: [{ properties: { name: 'heart', code: 202 } }],
    });
    const assets = new Map<string, Uint8Array>([
      // Feather comes first in entry order
      ['icons/Feather.json', new TextEncoder().encode(featherJson)],
      ['icons/Feather.ttf', new Uint8Array([1, 2, 3])],
      ['icons/FontAwesome.json', new TextEncoder().encode(faJson)],
      ['icons/FontAwesome.ttf', new Uint8Array([4, 5, 6])],
    ]);

    const res = new ResourceManager(assets);
    // Requesting FontAwesome with full alias URI
    const uri = 'kfile://org.kustom.provider/wallpapers/MyTheme.klwp/icons/FontAwesome.ttf';
    const info = res.getIconSet(uri);

    // Because cleanName is the entire URI, endsWith(cleanName + '.json') never matches.
    // It falls through to the first json in icons/ (Feather), failing to resolve 'heart'.
    expect(info?.codes.get('heart')).toBe(202);
  });

  it.fails('resolves and caches decoded images from asset bytes', () => {
    const samplePng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const assets = new Map<string, Uint8Array>([
      ['bitmaps/bg.png', samplePng],
    ]);

    const res = new ResourceManager(assets);
    // Currently nothing decodes or populates imageCache from assets
    const img = res.getImage('kfile://org.kustom.provider/bitmaps/bg.png');
    expect(img).toBeDefined();
  });
});
