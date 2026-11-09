// src/core/device-pack/generator.ts
import { zipSync, type Zippable } from 'fflate';
import type { Doc, Node } from '../model/types.ts';
import { writePresetArchive } from '../archive/writer.ts';

function createBaseDoc(title: string, kind: 'kwgt' | 'klwp' = 'kwgt'): Doc {
  const rootNode: Node = {
    id: 'root',
    type: 'Root',
    title: 'Root Layer',
    props: {
      config_scale_value: { value: 100 },
      config_visible: { value: 'ALWAYS' },
      background_type: { value: 'SOLID' },
      background_color: { value: '#FF121214' },
    },
    children: [],
    extras: {},
  };

  return {
    kind,
    info: {
      version: 11,
      title,
      description: `Device Test Pack: ${title}`,
      author: 'KustomWeb Test Suite',
      width: 415,
      height: 542,
      features: '0',
      release: 370000000,
      locked: false,
    },
    root: rootNode,
    globals: {},
    assets: new Map(),
    thumbs: {},
    extras: {},
  };
}

/**
 * Generates test presets for all core features.
 */
export function generateTestPresets(): Record<string, Doc> {
  const presets: Record<string, Doc> = {};

  // 1. Shapes Test
  const shapesDoc = createBaseDoc('Test_01_Shapes');
  const shapeTypes = ['RECT', 'CIRCLE', 'TRIANGLE', 'RTRIANGLE', 'ARC', 'OVAL', 'SLICE', 'EXAGON'];
  shapeTypes.forEach((st, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    shapesDoc.root.children!.push({
      id: `shape_${st}`,
      type: 'ShapeModule',
      title: st,
      props: {
        shape_type: { value: st },
        shape_width: { value: 80 },
        shape_height: { value: 80 },
        shape_corners: { value: st === 'RECT' ? 12 : 0 },
        paint_color: { value: '#FFE11D48' },
        paint_style: { value: 'FILL' },
        position_anchor: { value: 'TOP_LEFT' },
        position_offset_x: { value: 40 + col * 180 },
        position_offset_y: { value: 40 + row * 110 },
      },
      extras: {},
    });
  });
  presets['Test_01_Shapes.kwgt'] = shapesDoc;

  // 2. Blend Modes Test
  const blendDoc = createBaseDoc('Test_02_BlendModes');
  const blendModes = ['NORMAL', 'CLEAR', 'XOR', 'MULTIPLY', 'SCREEN'];
  // Background card
  blendDoc.root.children!.push({
    id: 'blend_bg',
    type: 'ShapeModule',
    title: 'Background',
    props: {
      shape_type: { value: 'RECT' },
      shape_width: { value: 350 },
      shape_height: { value: 450 },
      paint_color: { value: '#FF27272A' },
      position_anchor: { value: 'CENTER' },
    },
    extras: {},
  });
  blendModes.forEach((bm, idx) => {
    blendDoc.root.children!.push({
      id: `blend_${bm}`,
      type: 'ShapeModule',
      title: bm,
      props: {
        shape_type: { value: 'CIRCLE' },
        shape_width: { value: 70 },
        shape_height: { value: 70 },
        paint_color: { value: '#FF3B82F6' },
        paint_mode: { value: bm },
        position_anchor: { value: 'TOP' },
        position_offset_y: { value: 60 + idx * 80 },
      },
      extras: {},
    });
  });
  presets['Test_02_BlendModes.kwgt'] = blendDoc;

  // 3. Gradients Test
  const gradDoc = createBaseDoc('Test_03_Gradients');
  const gradTypes = ['HORIZONTAL', 'VERTICAL', 'RADIAL', 'SWEEP'];
  gradTypes.forEach((gt, idx) => {
    gradDoc.root.children!.push({
      id: `grad_${gt}`,
      type: 'ShapeModule',
      title: gt,
      props: {
        shape_type: { value: 'RECT' },
        shape_width: { value: 320 },
        shape_height: { value: 80 },
        shape_corners: { value: 16 },
        paint_color: { value: '#FFE11D48' },
        fx_gradient: { value: gt },
        fx_gradient_color: { value: '#FF3B82F6' },
        position_anchor: { value: 'TOP' },
        position_offset_y: { value: 40 + idx * 110 },
      },
      extras: {},
    });
  });
  presets['Test_03_Gradients.kwgt'] = gradDoc;

  // 4. Clock Hands & Rotation Test
  const clockDoc = createBaseDoc('Test_04_ClockHands');
  clockDoc.root.children!.push({
    id: 'clock_face',
    type: 'ShapeModule',
    title: 'Dial',
    props: {
      shape_type: { value: 'CIRCLE' },
      shape_width: { value: 260 },
      shape_height: { value: 260 },
      paint_color: { value: '#FF202024' },
      paint_style: { value: 'FILL' },
      position_anchor: { value: 'CENTER' },
    },
    extras: {},
  });
  clockDoc.root.children!.push({
    id: 'hour_hand',
    type: 'ShapeModule',
    title: 'Hour Hand',
    props: {
      shape_type: { value: 'RECT' },
      shape_width: { value: 6 },
      shape_height: { value: 70 },
      shape_rotate_mode: { value: 'CLOCK_HOUR' },
      paint_color: { value: '#FFFFFFFF' },
      position_anchor: { value: 'CENTER' },
    },
    extras: {},
  });
  clockDoc.root.children!.push({
    id: 'min_hand',
    type: 'ShapeModule',
    title: 'Minute Hand',
    props: {
      shape_type: { value: 'RECT' },
      shape_width: { value: 4 },
      shape_height: { value: 100 },
      shape_rotate_mode: { value: 'CLOCK_MINUTE' },
      paint_color: { value: '#FFE11D48' },
      position_anchor: { value: 'CENTER' },
    },
    extras: {},
  });
  presets['Test_04_ClockHands.kwgt'] = clockDoc;

  // 5. Globals & Formulas Test
  const formulaDoc = createBaseDoc('Test_05_Globals_Formulas');
  formulaDoc.globals['theme_color'] = {
    key: 'theme_color',
    type: 'COLOR',
    value: '#FF10B981',
    description: 'Accent theme color',
  };
  formulaDoc.root.children!.push({
    id: 'text_clock',
    type: 'TextModule',
    title: 'Formatted Time',
    props: {
      text_expression: {
        value: 'Time',
        formula: '$df(hh:mm a)$',
        toggle: 10,
      },
      text_size: { value: 36 },
      paint_color: {
        value: '#FFFFFFFF',
        formula: 'gv(theme_color)',
        toggle: 100,
      },
      position_anchor: { value: 'CENTER' },
    },
    extras: {},
  });
  presets['Test_05_Globals_Formulas.kwgt'] = formulaDoc;

  return presets;
}

/**
 * Builds the complete Device Test Pack zip.
 */
export async function buildDeviceTestPackZip(): Promise<Uint8Array> {
  const presets = generateTestPresets();
  const zippable: Zippable = {};

  const readme = `# KustomWeb Device Test Pack
This test pack contains 5 focused test widgets to verify real-device compatibility:
1. Test_01_Shapes.kwgt - All 8 shape types with corner radius and stroke.
2. Test_02_BlendModes.kwgt - NORMAL, CLEAR, XOR, MULTIPLY, and SCREEN blend modes.
3. Test_03_Gradients.kwgt - HORIZONTAL, VERTICAL, RADIAL, and SWEEP gradients.
4. Test_04_ClockHands.kwgt - CLOCK_HOUR and CLOCK_MINUTE rotation modes.
5. Test_05_Globals_Formulas.kwgt - Formula evaluation ($df(...)$) and Global variables (gv(...)).

## On-Device Testing Instructions
1. Copy the .kwgt files to your Android device storage:
   \`Kustom/widgets/\`
2. In KWGT on your device, tap a widget space and choose 'Load Preset' -> 'Exported'.
3. Verify that each widget loads with zero import errors.
4. Take a screenshot of the widget on your home screen.
5. In KustomWeb, open the 'Compare' tab and drop your screenshot to run pixel diff comparison.
`;

  const encoder = new TextEncoder();
  zippable['README.md'] = [encoder.encode(readme), { level: 6 }];

  for (const [filename, doc] of Object.entries(presets)) {
    const archiveBytes = writePresetArchive(doc);
    zippable[filename] = [archiveBytes, { level: 6 }];
  }

  return zipSync(zippable);
}
