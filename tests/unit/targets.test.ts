// tests/unit/targets.test.ts
import { describe, it, expect } from 'vitest';
import { DEVICE_PROFILES, getDeviceProfile } from '../../src/ui/targets/device-profiles.ts';
import { WIDGET_SIZE_PRESETS, getWidgetSizePreset } from '../../src/ui/targets/widget-sizes.ts';
import { renderPreset } from '../../src/core/render/renderer.ts';
import { readPresetArchive } from '../../src/core/archive/reader.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Phase 6 Targets & Widget Sizes', () => {
  it('loads valid device profiles with expected properties', () => {
    expect(DEVICE_PROFILES.length).toBeGreaterThanOrEqual(5);

    const pixel8 = getDeviceProfile('pixel-8');
    expect(pixel8).toBeDefined();
    expect(pixel8?.width).toBe(1080);
    expect(pixel8?.height).toBe(2400);
    expect(pixel8?.density).toBe(2.625);
    expect(pixel8?.statusBarHeight).toBeGreaterThan(0);
    expect(pixel8?.navBarHeight).toBeGreaterThan(0);

    const s24 = getDeviceProfile('galaxy-s24');
    expect(s24).toBeDefined();
    expect(s24?.width).toBe(1080);
    expect(s24?.height).toBe(2340);
  });

  it('provides calibrated widget sizes matching spec Appendix B', () => {
    const s1x1 = getWidgetSizePreset('1x1');
    expect(s1x1).toBeDefined();
    expect(s1x1?.width).toBe(165);
    expect(s1x1?.height).toBe(226);

    const s2x2 = getWidgetSizePreset('2x2');
    expect(s2x2).toBeDefined();
    expect(s2x2?.width).toBe(415);
    expect(s2x2?.height).toBe(542);

    const s4x2 = getWidgetSizePreset('4x2');
    expect(s4x2).toBeDefined();
    expect(s4x2?.width).toBe(916);
    expect(s4x2?.height).toBe(542);

    const s4x4 = getWidgetSizePreset('4x4');
    expect(s4x4).toBeDefined();
    expect(s4x4?.width).toBe(916);
    expect(s4x4?.height).toBe(1169);
  });

  it('renders a sample preset at 2x2, 4x2, and 4x4 without errors', async () => {
    const samplePath = path.resolve(process.cwd(), 'samples/Clean_Time_Date_Info.kwgt');
    if (!fs.existsSync(samplePath)) return;

    const bytes = fs.readFileSync(samplePath);
    const doc = await readPresetArchive(bytes);

    // Render at 2x2
    const canvas2x2 = await renderPreset(doc, { kind: 'widget', w: 415, h: 542 });
    expect(canvas2x2.width).toBe(415);
    expect(canvas2x2.height).toBe(542);

    // Render at 4x2
    const canvas4x2 = await renderPreset(doc, { kind: 'widget', w: 916, h: 542 });
    expect(canvas4x2.width).toBe(916);
    expect(canvas4x2.height).toBe(542);

    // Render at 4x4
    const canvas4x4 = await renderPreset(doc, { kind: 'widget', w: 916, h: 1169 });
    expect(canvas4x4.width).toBe(916);
    expect(canvas4x4.height).toBe(1169);
  });

  it('renders multi-screen KLWP preset with scroll offsets', async () => {
    const klwpPath = path.resolve(process.cwd(), 'samples/05_19_25_DarkWave_Release.klwp');
    if (!fs.existsSync(klwpPath)) return;

    const bytes = fs.readFileSync(klwpPath);
    const doc = await readPresetArchive(bytes);

    // Render at offset 0.0 (Screen 1)
    const canvasScreen1 = await renderPreset(doc, { kind: 'phone', w: 540, h: 1200, screens: 3, offset: 0.0 });
    expect(canvasScreen1.width).toBe(540);

    // Render at offset 0.5 (Screen 2)
    const canvasScreen2 = await renderPreset(doc, { kind: 'phone', w: 540, h: 1200, screens: 3, offset: 0.5 });
    expect(canvasScreen2.width).toBe(540);

    // Render at offset 1.0 (Screen 3)
    const canvasScreen3 = await renderPreset(doc, { kind: 'phone', w: 540, h: 1200, screens: 3, offset: 1.0 });
    expect(canvasScreen3.width).toBe(540);
  });
});
