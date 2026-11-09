import { describe, it, expect } from 'vitest';
import { ResourceManager, hash32 } from '../../src/core/render/resources.ts';
import type { Doc } from '../../src/core/model/types.ts';

describe('D03: Resources - Fonts, Icons, and Images resolution', () => {
  it('resolves icon set JSON correctly when given a kfile alias URI in an archive with multiple icon sets', () => {
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

    // Strictly pairs with FontAwesome by basename
    expect(info).toBeDefined();
    expect(info?.codes.get('heart')).toBe(202);
    expect(info?.codes.get('feather_icon')).toBeUndefined();
    expect(info?.family).toBe('kw_' + hash32('icons/FontAwesome.ttf'.toLowerCase()));
  });

  it('resolves and caches decoded images from asset bytes', async () => {
    // 1x1 valid PNG image
    const samplePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const assets = new Map<string, Uint8Array>([
      ['bitmaps/bg.png', new Uint8Array(samplePng)],
    ]);

    const res = new ResourceManager(assets);
    await res.prepare({ assets } as any);
    const img = res.getImage('kfile://org.kustom.provider/bitmaps/bg.png');
    expect(img).toBeDefined();
    expect(img?.width).toBe(1);
    expect(img?.height).toBe(1);
  });

  it('generates consistent deterministic CSS family names and resolves aliases', async () => {
    const assets = new Map<string, Uint8Array>([
      ['fonts/ProductSans.ttf', new Uint8Array([10, 20, 30])],
    ]);
    const res = new ResourceManager(assets);
    await res.prepare({ assets } as any);

    const exactUri = 'kfile://org.kustom.provider/fonts/ProductSans.ttf';
    const aliasUri = 'kfile://org.kustom.provider/wallpapers/MyTheme.klwp/fonts/ProductSans.ttf';
    const missingUri = 'kfile://org.kustom.provider/fonts/NoSuchFont.ttf';

    const expectedFam = 'kw_' + hash32('fonts/productsans.ttf');
    expect(res.family(exactUri)).toBe(expectedFam);
    expect(res.family(aliasUri)).toBe(expectedFam);
    expect(res.family(missingUri)).toBe('Roboto, sans-serif');
  });

  it('inspects document to list referenced resources with accurate status', () => {
    const assets = new Map<string, Uint8Array>([
      ['fonts/MyFont.ttf', new Uint8Array([1, 2])],
      ['bitmaps/photo.png', new Uint8Array([3, 4])],
    ]);
    const res = new ResourceManager(assets);

    const doc: Doc = {
      kind: 'klwp',
      info: { title: 'TestDoc' },
      globals: {},
      assets,
      root: {
        id: 'root',
        type: 'RootLayerModule',
        title: 'Root',
        props: {
          background_bitmap: { value: 'kfile://org.kustom.provider/bitmaps/photo.png' },
        },
        children: [
          {
            id: 'text1',
            type: 'TextModule',
            title: 'Title Text',
            props: {
              text_family: { value: 'kfile://org.kustom.provider/wallpapers/Theme.klwp/fonts/MyFont.ttf' },
            },
            children: [],
          },
          {
            id: 'icon1',
            type: 'FontIconModule',
            title: 'Home Icon',
            props: {
              icon_set: { value: 'kfile://org.kustom.provider/icons/MissingIcons.ttf' },
            },
            children: [],
          },
        ],
      },
    };

    const refs = res.listReferences(doc);
    expect(refs.length).toBe(3);

    const bgRef = refs.find((r) => r.propKey === 'background_bitmap');
    expect(bgRef?.status).toBe('exact');
    expect(bgRef?.resolvedPath).toBe('bitmaps/photo.png');

    const fontRef = refs.find((r) => r.propKey === 'text_family');
    expect(fontRef?.status).toBe('alias');
    expect(fontRef?.resolvedPath).toBe('fonts/MyFont.ttf');

    const iconRef = refs.find((r) => r.propKey === 'icon_set');
    expect(iconRef?.status).toBe('missing');
  });
});
