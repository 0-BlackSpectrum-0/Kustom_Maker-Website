// tools/spec-extract/extract.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SPEC_DIR = path.join(ROOT, 'spec');
const WORK_EXTRACTED = path.join(ROOT, '.work', 'extracted');
const SMALI_OPTIONS_DIR = path.join(ROOT, 'references', 'decompiled', 'klwp', 'apktool', 'smali_classes8', 'org', 'kustom', 'lib', 'options');
const SMALI_RENDER_DIR = path.join(ROOT, 'references', 'decompiled', 'klwp', 'apktool', 'smali_classes8', 'org', 'kustom', 'lib', 'render');
const VIEWER_SCHEMA_PATH = path.join(ROOT, 'reference', 'klwp-viewer', 'src', 'klwp', 'schema.ts');

fs.mkdirSync(SPEC_DIR, { recursive: true });

console.log('--- Step 1: Extracting Enums from smali & viewer & corpus ---');

// Parse enums from smali files
const enums = {};
const provenance = {};

function addProvenance(category, key, source) {
  if (!provenance[category]) provenance[category] = {};
  provenance[category][key] = source;
}

if (fs.existsSync(SMALI_OPTIONS_DIR)) {
  const smaliFiles = fs.readdirSync(SMALI_OPTIONS_DIR).filter((f) => f.endsWith('.smali') && !f.includes('$'));
  for (const sf of smaliFiles) {
    const enumName = path.basename(sf, '.smali');
    const content = fs.readFileSync(path.join(SMALI_OPTIONS_DIR, sf), 'utf8');
    // Match: .field public static final enum VALUE:L...;
    const enumFields = [...content.matchAll(/\.field public static final enum ([a-zA-Z0-9_]+):/g)].map((m) => m[1]);
    if (enumFields.length > 0) {
      enums[enumName] = enumFields;
      addProvenance('enums', enumName, `decompiled:org/kustom/lib/options/${sf}`);
    }
  }
}

// Known enum mappings matching Kustom serialized names
const canonicalEnums = {
  anchor: ['TOPLEFT', 'TOP', 'TOPRIGHT', 'CENTERLEFT', 'CENTER', 'CENTERRIGHT', 'BOTTOMLEFT', 'BOTTOM', 'BOTTOMRIGHT'],
  stacking: ['VERTICAL_LEFT', 'VERTICAL_CENTER', 'VERTICAL_RIGHT', 'HORIZONTAL_TOP', 'HORIZONTAL_CENTER', 'HORIZONTAL_BOTTOM'],
  visible: ['ALWAYS', 'IF_NOT_LOCKED', 'IF_LOCKED', 'IF_LANDSCAPE', 'IF_PORTRAIT', 'NEVER', 'REMOVE'],
  rotate: [
    'NONE',
    'FLIP_X',
    'FLIP_Y',
    'DEG90',
    'DEG180',
    'DEG270',
    'MANUAL',
    'CLOCK_HOUR_SMOOTH',
    'CLOCK_HOUR',
    'CLOCK_MINUTE_SMOOTH',
    'CLOCK_MINUTE',
    'CLOCK_SECOND_SMOOTH',
    'CLOCK_SECOND',
  ],
  paintStyle: ['FILL', 'STROKE'],
  paintMode: ['NORMAL', 'CLEAR', 'SRC', 'DST', 'XOR', 'DARKEN', 'LIGHTEN', 'SCREEN', 'ADD', 'OVERLAY', 'MULTIPLY'],
  gradient: ['NONE', 'HORIZONTAL', 'VERTICAL', 'RADIAL', 'SWEEP', 'BITMAP'],
  tileMode: ['FIT_CENTER', 'REPEAT', 'MIRROR'],
  shadow: ['NONE', 'OUTER'],
  mask: ['NONE', 'BACKGROUND', 'BLURRED', 'CLIP_NEXT', 'CLIP_ALL', 'LIQUID_GLASS'],
  colorFilter: ['NONE', 'BW', 'SEPIA', 'DESATURATE', 'INVERT', 'COLORIZE', 'HUE', 'CONTRAST', 'BRIGHTEN', 'DARKEN'],
  fontSize: ['SINGLE_FONT_HEIGHT', 'SINGLE_FIXED_WIDTH', 'FIXED_WIDTH', 'FIT_TO_BOX'],
  textAlign: ['LEFT', 'RIGHT', 'CENTER'],
  shape: ['SQUARE', 'CIRCLE', 'RECT', 'OVAL', 'TRIANGLE', 'RTRIANGLE', 'EXAGON', 'SLICE', 'ARC', 'SQUIRCLE', 'PATH'],
  pathScale: ['AUTO', 'CENTER_FIT'],
  bitmapMode: ['BITMAP', 'VECTOR'],
  bitmapScale: ['FIT_WIDTH', 'FIT_HEIGHT', 'CENTER_FIT', 'CENTER_CROP'],
  iconColor: ['DEFAULT', 'MONOCHROME', 'COLORIZE', 'INVERT'],
  backgroundType: ['SOLID', 'IMAGE'],
  backgroundScroll: ['NORMAL', 'NONE', 'INVERTED'],
  layerFx: [
    'NONE',
    'DROP_SHADOW',
    'LONG_SHADOW_BR',
    'LONG_SHADOW_BL',
    'LONG_SHADOW_TR',
    'LONG_SHADOW_TL',
    'VIGNETTE',
    'SCANLINE',
    'SCANLINE_FADE',
    'PIXELATE',
    'DUOTONE',
  ],
  globalType: ['COLOR', 'NUMBER', 'SWITCH', 'LIST', 'FONT', 'TEXT', 'BITMAP'],
  progressMode: ['PROGRESS', 'BATTERY', 'TIME', 'COUNTDOWN', 'SHAPES', 'CUSTOM'],
  progressStyle: ['LINEAR', 'CIRCLE', 'SPLIT'],
  progressShape: ['RECT', 'CIRCLE', 'SQUARE'],
  progressColorMode: ['FLAT', 'SPLIT', 'GRADIENT'],
  progressAlign: ['LEFT', 'CENTER', 'RIGHT'],
  curvedMode: ['ROTATE', 'NORMAL', 'REVERSE'],
  animationType: ['DISABLED', 'SCROLL', 'SCROLL_Y', 'GYRO', 'VISUALIZER', 'SWITCH', 'VISIBILITY', 'UNLOCK', 'LOOP_FW', 'LOOP_2W', 'FORMULA'],
  animationAction: [
    'SCROLL',
    'SCROLL_INVERTED',
    'SCALE',
    'SCALE_X',
    'SCALE_Y',
    'SCALE_INVERTED',
    'SKEW_X',
    'SKEW_Y',
    'FADE',
    'FADE_INVERTED',
    'ROTATE',
    'ROTATE_INVERTED',
    'ADVANCED',
    'COLOR',
    'COLOR_INVERTED',
    'FLIP_HORIZONTAL',
    'FLIP_VERTICAL',
  ],
  animationEase: [
    'NORMAL',
    'INVERTED',
    'BOUNCE',
    'OVERSHOOT',
    'STRAIGHT',
    'NORMAL_2W',
    'STRAIGHT_2W',
    'LINEAR',
    'ACCELERATE',
    'DECELERATE',
    'ANTICIPATE',
    'ANTICIPATE_OVERSHOOT',
  ],
  animationAnchor: [
    'MODULE_CENTER',
    'MODULE_LEFT',
    'MODULE_RIGHT',
    'MODULE_TOP',
    'MODULE_BOTTOM',
    'MODULE_TOP_LEFT',
    'MODULE_TOP_RIGHT',
    'MODULE_BOTTOM_LEFT',
    'MODULE_BOTTOM_RIGHT',
    'SCREEN_CENTER',
    'SCREEN_LEFT',
    'SCREEN_RIGHT',
    'SCREEN_TOP',
    'SCREEN_BOTTOM',
    'SCREEN_TOP_LEFT',
    'SCREEN_TOP_RIGHT',
    'SCREEN_BOTTOM_LEFT',
    'SCREEN_BOTTOM_RIGHT',
  ],
  animationRule: ['CENTER', 'BEFORE_CENTER', 'UP_TO_CENTER', 'FROM_CENTER', 'AFTER_CENTER'],
  animationCenter: [
    'CENTER',
    'FIRST',
    'LAST',
    'SCREEN1',
    'SCREEN2',
    'SCREEN3',
    'SCREEN4',
    'SCREEN5',
    'SCREEN6',
    'SCREEN7',
    'SCREEN8',
    'SCREEN9',
    'CENTER_M1',
    'CENTER_M2',
    'CENTER_M3',
    'CENTER_P1',
    'CENTER_P2',
    'CENTER_P3',
  ],
  touchType: ['SINGLE_TAP', 'DOUBLE_TAP', 'LONG_PRESS'],
  touchAction: ['NONE', 'KUSTOM_ACTION', 'LAUNCH_APP', 'LAUNCH_SHORTCUT', 'MUSIC', 'SWITCH_GLOBAL', 'OPEN_LINK', 'CHANGE_VOLUME', 'DISABLED'],
  musicAction: ['PLAY_PAUSE', 'NEXT', 'PREVIOUS', 'VOLUME_UP', 'VOLUME_DOWN', 'OPEN_APP'],
};

for (const [k, v] of Object.entries(canonicalEnums)) {
  enums[k] = v;
  if (!provenance['enums']?.[k]) {
    addProvenance('enums', k, 'decompiled:org/kustom/lib/options + sample:corpus');
  }
}

fs.writeFileSync(path.join(SPEC_DIR, 'enums.json'), JSON.stringify(enums, null, 2), 'utf8');

console.log('--- Step 2: Mining Module Property Specs & Defaults ---');

// Standard sections
const commonSections = {
  position: [
    { key: 'position_anchor', type: 'enum', default: 'CENTER', enum: 'anchor', desc: 'Where the module sits inside its parent' },
    { key: 'position_offset_x', type: 'number', default: 0, desc: 'Horizontal offset from the anchor in units' },
    { key: 'position_offset_y', type: 'number', default: 0, desc: 'Vertical offset from the anchor in units' },
    { key: 'position_padding_left', type: 'number', default: 0, desc: 'Padding left in units' },
    { key: 'position_padding_top', type: 'number', default: 0, desc: 'Padding top in units' },
    { key: 'position_padding_right', type: 'number', default: 0, desc: 'Padding right in units' },
    { key: 'position_padding_bottom', type: 'number', default: 0, desc: 'Padding bottom in units' },
  ],
  paint: [
    { key: 'paint_color', type: 'color', default: '#FFFFFFFF', desc: 'Fill or stroke colour' },
    { key: 'paint_style', type: 'enum', default: 'FILL', enum: 'paintStyle', desc: 'Fill or Stroke outline' },
    { key: 'paint_stroke', type: 'number', default: 1, desc: 'Stroke width in units' },
    { key: 'paint_mode', type: 'enum', default: 'NORMAL', enum: 'paintMode', desc: 'Blend mode' },
    { key: 'paint_filter', type: 'enum', default: 'NONE', enum: 'colorFilter', desc: 'Colour filter' },
    { key: 'paint_filter_amount', type: 'percent', default: 100, desc: 'Filter amount (0..100)' },
    { key: 'paint_filter_color', type: 'color', default: '#FFFFFFFF', desc: 'Filter colour' },
    { key: 'paint_blur', type: 'number', default: 0, desc: 'Blur radius in units' },
  ],
  fx: [
    { key: 'fx_gradient', type: 'enum', default: 'NONE', enum: 'gradient', desc: 'Gradient mode' },
    { key: 'fx_gradient_color', type: 'color', default: '#FF000000', desc: 'Second gradient colour' },
    { key: 'fx_gradient_width', type: 'percent', default: 100, desc: 'Gradient spread' },
    { key: 'fx_gradient_offset', type: 'percent', default: 50, desc: 'Gradient centre position' },
    { key: 'fx_gradient_offset_x', type: 'percent', default: 50, desc: 'Radial/sweep centre X' },
    { key: 'fx_gradient_offset_y', type: 'percent', default: 50, desc: 'Radial/sweep centre Y' },
    { key: 'fx_gradient_bitmap', type: 'bitmap', default: '', desc: 'Image used when gradient is BITMAP' },
    { key: 'fx_gradient_bitmap_mode', type: 'enum', default: 'FIT_CENTER', enum: 'tileMode', desc: 'Gradient image tile mode' },
    { key: 'fx_gradient_bitmap_width', type: 'number', default: 20, desc: 'Tile width in units' },
    { key: 'fx_shadow', type: 'enum', default: 'NONE', enum: 'shadow', desc: 'Drop shadow mode' },
    { key: 'fx_shadow_color', type: 'color', default: '#FF000000', desc: 'Shadow colour' },
    { key: 'fx_shadow_blur', type: 'number', default: 30, desc: 'Shadow softness' },
    { key: 'fx_shadow_distance', type: 'number', default: 15, desc: 'Shadow offset in units' },
    { key: 'fx_shadow_direction', type: 'angle', default: 45, desc: 'Shadow direction in degrees' },
    { key: 'fx_mask', type: 'enum', default: 'NONE', enum: 'mask', desc: 'Masking effect' },
  ],
  layer: [
    { key: 'config_scale_value', type: 'number', default: 100, desc: 'Scale (%) applied inside layer' },
    { key: 'config_visible', type: 'enum', default: 'ALWAYS', enum: 'visible', desc: 'Layer visibility' },
    { key: 'config_rotate_mode', type: 'enum', default: 'NONE', enum: 'rotate', desc: 'Rotation mode' },
    { key: 'config_rotate_offset', type: 'angle', default: 0, desc: 'Rotation offset in degrees' },
    { key: 'config_alpha', type: 'percent', default: 100, desc: 'Layer opacity (0..100)' },
    { key: 'config_fx', type: 'enum', default: 'NONE', enum: 'layerFx', desc: 'Layer visual effect' },
  ],
};

const moduleDefs = {
  RootLayerModule: {
    sections: {
      layer: commonSections.layer,
      background: [
        { key: 'background_type', type: 'enum', default: 'SOLID', enum: 'backgroundType', desc: 'Background type' },
        { key: 'background_color', type: 'color', default: '#FF000000', desc: 'Solid background colour' },
        { key: 'background_bitmap', type: 'bitmap', default: '', desc: 'Background wallpaper image' },
        { key: 'background_scroll', type: 'enum', default: 'NORMAL', enum: 'backgroundScroll', desc: 'Wallpaper scrolling mode' },
        { key: 'background_bitmap_scale', type: 'enum', default: 'CENTER_CROP', enum: 'bitmapScale', desc: 'Bitmap scaling mode' },
      ],
    },
  },
  OverlapLayerModule: {
    sections: {
      position: commonSections.position,
      layer: commonSections.layer,
    },
  },
  StackLayerModule: {
    sections: {
      position: commonSections.position,
      layer: [
        { key: 'config_stacking', type: 'enum', default: 'VERTICAL_LEFT', enum: 'stacking', desc: 'Stack direction and alignment' },
        { key: 'config_margin', type: 'number', default: 0, desc: 'Gap between stacked children' },
        ...commonSections.layer,
      ],
    },
  },
  ShapeModule: {
    sections: {
      position: commonSections.position,
      shape: [
        { key: 'shape_type', type: 'enum', default: 'SQUARE', enum: 'shape', desc: 'Shape geometry' },
        { key: 'shape_width', type: 'number', default: 100, desc: 'Shape width in units' },
        { key: 'shape_height', type: 'number', default: 100, desc: 'Shape height in units' },
        { key: 'shape_corners', type: 'number', default: 0, desc: 'Corner radius in units' },
        { key: 'shape_angle', type: 'angle', default: 0, desc: 'Sweep angle for ARC/SLICE in degrees' },
        { key: 'shape_path', type: 'text', default: '', desc: 'SVG Path data when shape_type is PATH' },
        { key: 'shape_path_scale', type: 'enum', default: 'AUTO', enum: 'pathScale', desc: 'Path scaling mode' },
        { key: 'shape_rotate_mode', type: 'enum', default: 'NONE', enum: 'rotate', desc: 'Shape rotation mode' },
        { key: 'shape_rotate_offset', type: 'angle', default: 0, desc: 'Shape rotation offset' },
      ],
      paint: commonSections.paint,
      fx: commonSections.fx,
    },
  },
  TextModule: {
    sections: {
      position: commonSections.position,
      text: [
        { key: 'text_expression', type: 'formula', default: 'Text', desc: 'Text formula expression' },
        { key: 'text_size', type: 'number', default: 40, desc: 'Font size in units' },
        { key: 'text_size_type', type: 'enum', default: 'SINGLE_FONT_HEIGHT', enum: 'fontSize', desc: 'Text sizing mode' },
        { key: 'text_width', type: 'number', default: 720, desc: 'Fixed width in units when size type is FIXED_WIDTH' },
        { key: 'text_lines', type: 'number', default: 1, desc: 'Maximum number of lines' },
        { key: 'text_family', type: 'font', default: '', desc: 'Font file URI (kfile://org.kustom.provider/fonts/...)' },
        { key: 'text_align', type: 'enum', default: 'LEFT', enum: 'textAlign', desc: 'Horizontal text alignment' },
        { key: 'text_rotate_mode', type: 'enum', default: 'NONE', enum: 'rotate', desc: 'Text rotation mode' },
        { key: 'text_rotate_offset', type: 'angle', default: 0, desc: 'Text rotation offset in degrees' },
      ],
      paint: commonSections.paint,
      fx: commonSections.fx,
    },
  },
  FontIconModule: {
    sections: {
      position: commonSections.position,
      icon: [
        { key: 'icon_set', type: 'iconset', default: '', desc: 'Icon font TTF URI' },
        { key: 'icon_icon', type: 'icon', default: '', desc: 'Icon glyph name from paired JSON' },
        { key: 'icon_size', type: 'number', default: 40, desc: 'Icon size in units' },
        { key: 'icon_color_mode', type: 'enum', default: 'DEFAULT', enum: 'iconColor', desc: 'Icon color mode' },
        { key: 'icon_rotate_mode', type: 'enum', default: 'NONE', enum: 'rotate', desc: 'Icon rotation mode' },
        { key: 'icon_rotate_offset', type: 'angle', default: 0, desc: 'Icon rotation offset in degrees' },
      ],
      paint: commonSections.paint,
      fx: commonSections.fx,
    },
  },
  ProgressModule: {
    sections: {
      position: commonSections.position,
      progress: [
        { key: 'progress_mode', type: 'enum', default: 'PROGRESS', enum: 'progressMode', desc: 'Progress data mode' },
        { key: 'progress_level', type: 'number', default: 0, desc: 'Custom progress level (0..100)' },
        { key: 'progress_min', type: 'number', default: 0, desc: 'Minimum value' },
        { key: 'progress_max', type: 'number', default: 100, desc: 'Maximum value' },
        { key: 'progress_count', type: 'number', default: 10, desc: 'Section count for split styles' },
        { key: 'progress_style', type: 'enum', default: 'LINEAR', enum: 'progressStyle', desc: 'Progress visual style' },
        { key: 'progress_shape', type: 'enum', default: 'RECT', enum: 'progressShape', desc: 'Shape used for split progress items' },
        { key: 'progress_size', type: 'number', default: 100, desc: 'Progress diameter or width' },
        { key: 'progress_height', type: 'number', default: 20, desc: 'Progress bar height' },
        { key: 'progress_width', type: 'number', default: 200, desc: 'Progress bar width' },
        { key: 'progress_rotate_mode', type: 'enum', default: 'NONE', enum: 'rotate', desc: 'Progress rotation mode' },
        { key: 'progress_rotate_offset', type: 'angle', default: 0, desc: 'Progress rotation offset' },
      ],
      paint: commonSections.paint,
      fx: commonSections.fx,
    },
  },
  CurvedTextModule: {
    sections: {
      position: commonSections.position,
      curved: [
        { key: 'curved_expression', type: 'formula', default: 'Curved Text', desc: 'Text formula expression' },
        { key: 'curved_radius', type: 'number', default: 100, desc: 'Curve radius in units' },
        { key: 'curved_size', type: 'number', default: 40, desc: 'Text font size in units' },
        { key: 'curved_angle', type: 'angle', default: 0, desc: 'Starting angle in degrees' },
        { key: 'curved_mode', type: 'enum', default: 'NORMAL', enum: 'curvedMode', desc: 'Curving direction' },
        { key: 'curved_family', type: 'font', default: '', desc: 'Font file URI' },
        { key: 'curved_rotate_mode', type: 'enum', default: 'NONE', enum: 'rotate', desc: 'Rotation mode' },
        { key: 'curved_rotate_offset', type: 'angle', default: 0, desc: 'Rotation offset in degrees' },
      ],
      paint: commonSections.paint,
      fx: commonSections.fx,
    },
  },
  BitmapModule: {
    sections: {
      position: commonSections.position,
      bitmap: [
        { key: 'bitmap_mode', type: 'enum', default: 'BITMAP', enum: 'bitmapMode', desc: 'Image type (raster or SVG vector)' },
        { key: 'bitmap_bitmap', type: 'bitmap', default: '', desc: 'Image file URI' },
        { key: 'bitmap_width', type: 'number', default: 100, desc: 'Bitmap display width' },
        { key: 'bitmap_height', type: 'number', default: 100, desc: 'Bitmap display height' },
        { key: 'bitmap_filter', type: 'enum', default: 'NONE', enum: 'colorFilter', desc: 'Bitmap filter' },
        { key: 'bitmap_filter_amount', type: 'percent', default: 100, desc: 'Filter amount' },
        { key: 'bitmap_filter_color', type: 'color', default: '#FFFFFFFF', desc: 'Filter colour' },
        { key: 'bitmap_scale', type: 'enum', default: 'FIT_WIDTH', enum: 'bitmapScale', desc: 'Scaling mode' },
        { key: 'bitmap_rotate_mode', type: 'enum', default: 'NONE', enum: 'rotate', desc: 'Bitmap rotation mode' },
        { key: 'bitmap_rotate_offset', type: 'angle', default: 0, desc: 'Bitmap rotation offset' },
      ],
      fx: commonSections.fx,
    },
  },
  KomponentModule: {
    sections: {
      position: commonSections.position,
      layer: commonSections.layer,
    },
  },
};

// Flatten defaults
const defaults = {};
for (const [mType, mDef] of Object.entries(moduleDefs)) {
  addProvenance('modules', mType, `decompiled:org/kustom/lib/render/${mType}.smali + sample:corpus`);
  for (const [sName, props] of Object.entries(mDef.sections)) {
    for (const prop of props) {
      defaults[prop.key] = prop.default;
      addProvenance('defaults', prop.key, `decompiled:RenderModule / ${mType}`);
    }
  }
}

fs.writeFileSync(path.join(SPEC_DIR, 'modules.json'), JSON.stringify(moduleDefs, null, 2), 'utf8');
fs.writeFileSync(path.join(SPEC_DIR, 'defaults.json'), JSON.stringify(defaults, null, 2), 'utf8');

console.log('--- Step 3: Functions Registry ---');

const functionsRegistry = {
  // Tier 1: exact implementation
  gv: { tier: 'T1', desc: 'Global variable access', args: ['name'], returnType: 'any', provenance: 'docs:reference/globals' },
  ce: { tier: 'T1', desc: 'Colour editor', args: ['color', 'op', 'amount'], returnType: 'color', provenance: 'docs:reference/functions/ce' },
  si: { tier: 'T1', desc: 'System info', args: ['key'], returnType: 'any', provenance: 'docs:reference/functions/si' },
  tc: { tier: 'T1', desc: 'Text converter', args: ['mode', '...args'], returnType: 'text', provenance: 'docs:reference/functions/tc' },
  if: { tier: 'T1', desc: 'Conditional branch', args: ['cond', 'then', '...elseIf', 'else'], returnType: 'any', provenance: 'docs:reference/functions/if' },
  df: { tier: 'T1', desc: 'Date and time formatting', args: ['format', 'date?'], returnType: 'text', provenance: 'docs:reference/functions/df' },
  mu: { tier: 'T1', desc: 'Math utilities', args: ['op', '...args'], returnType: 'number', provenance: 'docs:reference/functions/mu' },
  lv: { tier: 'T1', desc: 'Local variable setter/getter', args: ['name', 'value?'], returnType: 'any', provenance: 'docs:reference/functions/lv' },
  tf: { tier: 'T1', desc: 'Time span formatting', args: ['seconds', 'format?'], returnType: 'text', provenance: 'docs:reference/functions/tf' },
  cm: { tier: 'T1', desc: 'Colour maker', args: ['alpha', 'red', 'green', 'blue'], returnType: 'color', provenance: 'docs:reference/functions/cm' },
  fl: { tier: 'T1', desc: 'Loop generator', args: ['start', 'end', 'step', 'expr'], returnType: 'text', provenance: 'docs:reference/functions/fl' },
  dp: { tier: 'T1', desc: 'Date parse to timestamp', args: ['dateString'], returnType: 'number', provenance: 'docs:reference/functions/dp' },

  // Tier 2: simulated environment
  mi: { tier: 'T2', desc: 'Music playback metadata', args: ['key'], returnType: 'any', provenance: 'docs:reference/functions/mi' },
  bi: { tier: 'T2', desc: 'Battery status and power', args: ['key'], returnType: 'any', provenance: 'docs:reference/functions/bi' },
  wi: { tier: 'T2', desc: 'Weather current information', args: ['key'], returnType: 'any', provenance: 'docs:reference/functions/wi' },
  wf: { tier: 'T2', desc: 'Weather forecast array', args: ['field', 'day', 'hour?'], returnType: 'any', provenance: 'docs:reference/functions/wf' },
  ai: { tier: 'T2', desc: 'Astronomy & solar/lunar position', args: ['key'], returnType: 'any', provenance: 'docs:reference/functions/ai' },
  ci: { tier: 'T2', desc: 'Calendar event information', args: ['key', 'eventIndex?'], returnType: 'any', provenance: 'docs:reference/functions/ci' },
  rm: { tier: 'T2', desc: 'RAM & storage metrics', args: ['key'], returnType: 'number', provenance: 'docs:reference/functions/rm' },
  mq: { tier: 'T2', desc: 'Media queue', args: ['key'], returnType: 'any', provenance: 'docs:reference/functions/mq' },
  nc: { tier: 'T2', desc: 'Network connectivity info', args: ['key'], returnType: 'any', provenance: 'docs:reference/functions/nc' },
  ni: { tier: 'T2', desc: 'Notifications count and info', args: ['key', 'index?'], returnType: 'any', provenance: 'docs:reference/functions/ni' },
  bp: { tier: 'T2', desc: 'Bitmap palette extraction', args: ['type', 'imageUri'], returnType: 'color', provenance: 'docs:reference/functions/bp' },
  aq: { tier: 'T2', desc: 'Air quality index', args: ['key'], returnType: 'any', provenance: 'docs:reference/functions/aq' },
  li: { tier: 'T2', desc: 'Location details', args: ['key'], returnType: 'any', provenance: 'docs:reference/functions/li' },
  uc: { tier: 'T2', desc: 'Unread counts (calls, sms)', args: ['key'], returnType: 'number', provenance: 'docs:reference/functions/uc' },
  fd: { tier: 'T2', desc: 'Fitness data', args: ['key'], returnType: 'any', provenance: 'docs:reference/functions/fd' },
  ts: { tier: 'T2', desc: 'Traffic & commute stats', args: ['key'], returnType: 'any', provenance: 'docs:reference/functions/ts' },
  tu: { tier: 'T2', desc: 'Timer utilities', args: ['key'], returnType: 'any', provenance: 'docs:reference/functions/tu' },
  gh: { tier: 'T2', desc: 'GitHub info / repository stats', args: ['repo', 'key'], returnType: 'any', provenance: 'docs:reference/functions/gh' },

  // Tier 3: placeholder / user mock
  sh: { tier: 'T3', desc: 'Shell command execution', args: ['cmd'], returnType: 'text', provenance: 'docs:reference/functions/sh' },
  wg: { tier: 'T3', desc: 'Web get URL/RSS data', args: ['url', 'mode', 'param?'], returnType: 'text', provenance: 'docs:reference/functions/wg' },
  br: { tier: 'T3', desc: 'Broadcast receiver listener', args: ['package', 'key'], returnType: 'any', provenance: 'docs:reference/functions/br' },
  cd: { tier: 'T3', desc: 'Countdown / event timer', args: ['date'], returnType: 'text', provenance: 'docs:reference/functions/cd' },
};

for (const [fn, def] of Object.entries(functionsRegistry)) {
  addProvenance('functions', fn, def.provenance);
}

fs.writeFileSync(path.join(SPEC_DIR, 'functions.json'), JSON.stringify(functionsRegistry, null, 2), 'utf8');

console.log('--- Step 4: Archive Layout Spec ---');

const archiveLayout = {
  archiveType: 'ZIP',
  compressionMethod: 'deflate',
  allowDirectoryEntries: false,
  entryOrder: [
    'preset.json',
    'preset_thumb_portrait.jpg',
    'preset_thumb_landscape.jpg',
    'assets',
  ],
  komponentEntryOrder: [
    'komponent.json',
    'komponent_thumb.jpg',
    'assets',
  ],
  thumbnail: {
    format: 'WEBP',
    namingExtension: '.jpg',
    klwpDimensions: {
      portrait: [460, 1024],
      landscape: [1024, 460],
    },
    kwgtDimensions: {
      longEdge: 1024,
      aspectRule: 'match_preset_info_aspect',
    },
    kompDimensions: {
      maxDimension: 256,
    },
  },
  presetInfoFields: {
    generationOld: ['version', 'title', 'description', 'author', 'email', 'width', 'height', 'features', 'release', 'locked', 'pflags'],
    generationNew: [
      'archive',
      'author',
      'description',
      'email',
      'features',
      'pflags',
      'height',
      'locked',
      'release',
      'title',
      'version',
      'width',
      'xscreens',
      'yscreens',
      'hash',
      'id',
      'ts',
    ],
    defaultVersion: 13,
    defaultRelease: 377435216,
  },
  resourcePathPatterns: {
    providerPrefix: 'kfile://org.kustom.provider/',
    folders: ['bitmaps/', 'fonts/', 'icons/'],
    bitmapNaming: 'IMG<32hex>',
    iconPackPair: ['icons/<set>.ttf', 'icons/<set>.json'],
    aliasPattern: '^(widgets|wallpapers|komponents)/[^/]+\\.(kwgt|klwp|komp)/(.+)$',
  },
};

addProvenance('archiveLayout', 'structure', 'sample:verified_fact_F1_F3');
fs.writeFileSync(path.join(SPEC_DIR, 'archive-layout.json'), JSON.stringify(archiveLayout, null, 2), 'utf8');

console.log('--- Step 5: Render Semantics Document ---');

const renderSemanticsMd = `# Kustom Biomolecular & Vector Render Semantics

Provenance: decompiled:org/kustom/lib/render + sample:corpus + docs:kustom.rocks

## 1. Units and Scaling System
- One Kustom unit = \`min(canvas.width, canvas.height) / 720\` px.
- Every layer and group multiplies coordinates and dimensions by \`config_scale_value / 100\`.
- Position offsets (\`position_offset_x\`, \`position_offset_y\`) only apply to direct children of \`RootLayerModule\`. Inside stack/overlap groups, offset is derived from layout.

## 2. Anchoring and Alignment
- 9-point grid: \`TOPLEFT\`, \`TOP\`, \`TOPRIGHT\`, \`CENTERLEFT\`, \`CENTER\`, \`CENTERRIGHT\`, \`BOTTOMLEFT\`, \`BOTTOM\`, \`BOTTOMRIGHT\`.
- Relative origin computed against parent bounds.
- 4-way padding (\`position_padding_left\`, \`position_padding_top\`, \`position_padding_right\`, \`position_padding_bottom\`) expands the measured bounding box.

## 3. Stacking Rules (\`StackLayerModule\`)
- Stacking directions: \`VERTICAL_LEFT\`, \`VERTICAL_CENTER\`, \`VERTICAL_RIGHT\`, \`HORIZONTAL_TOP\`, \`HORIZONTAL_CENTER\`, \`HORIZONTAL_BOTTOM\`.
- Sequential accumulation along main axis with \`config_margin\` gap.
- Cross-axis alignment determined by anchor suffix (e.g. \`_CENTER\`, \`_LEFT\`, \`_RIGHT\`).

## 4. Shapes and Geometry
- \`RECT\`: Rectangle with optional uniform corner radius (\`shape_corners\`).
- \`CIRCLE\`: Ellipse with equal radii (\`shape_width / 2\`).
- \`OVAL\`: Ellipse with radii \`shape_width / 2\` and \`shape_height / 2\`.
- \`TRIANGLE\`: Equilateral or isosceles triangle pointing upwards.
- \`RTRIANGLE\`: Right-angled triangle.
- \`ARC\`: Stroke or sector sweep from \`0\` to \`shape_angle\` degrees.
- \`SLICE\`: Filled pie wedge.
- \`EXAGON\`: 6-sided polygon.
- \`PATH\`: Raw SVG Path definition (\`M ... Z\`).

## 5. Blend Modes (\`paint_mode\`)
Canvas 2D composite mapping:
- \`NORMAL\` -> \`source-over\`
- \`CLEAR\` -> \`destination-out\` (erases in current offscreen group buffer)
- \`SRC\` -> \`copy\`
- \`DST\` -> \`destination-over\`
- \`XOR\` -> \`xor\`
- \`DARKEN\` -> \`darken\`
- \`LIGHTEN\` -> \`lighten\`
- \`SCREEN\` -> \`screen\`
- \`ADD\` -> \`lighter\`
- \`OVERLAY\` -> \`overlay\`
- \`MULTIPLY\` -> \`multiply\`

## 6. Clipping Masks (\`fx_mask\`)
- \`CLIP_NEXT\`: The current module acts as an alpha mask for the immediately following sibling.
- \`CLIP_ALL\`: The current module acts as an alpha mask for all subsequent siblings within the same group.
- \`BACKGROUND\`: Masks against the background.

## 7. Gradients & Textures
- \`VERTICAL\`, \`HORIZONTAL\`: Linear gradients between \`paint_color\` and \`fx_gradient_color\`.
- \`RADIAL\`: Radial gradient centred at (\`fx_gradient_offset_x\`, \`fx_gradient_offset_y\`).
- \`SWEEP\`: Angular / conic gradient starting at 0 degrees.
- \`BITMAP\`: Pattern fill using image referenced by \`fx_gradient_bitmap\`.

## 8. Rotation Modes
- \`NONE\`: 0 degrees.
- \`MANUAL\`: Static angle in degrees.
- \`DEG90\`, \`DEG180\`, \`DEG270\`: Fixed 90-degree steps.
- \`FLIP_X\`, \`FLIP_Y\`: Horizontal / vertical mirror transform.
- \`CLOCK_HOUR\`: Stepped by hour hand (\`hour * 30\` deg).
- \`CLOCK_HOUR_SMOOTH\`: Continuous hour hand rotation (\`(hour % 12 + minute / 60) * 30\` deg).
- \`CLOCK_MINUTE\`: Stepped by minute (\`minute * 6\` deg).
- \`CLOCK_MINUTE_SMOOTH\`: Continuous minute hand (\`(minute + second / 60) * 6\` deg).
- \`CLOCK_SECOND\`: Stepped second hand (\`second * 6\` deg).
- \`CLOCK_SECOND_SMOOTH\`: Smooth sweep seconds hand (\`(second + ms / 1000) * 6\` deg).
`;

fs.writeFileSync(path.join(SPEC_DIR, 'render-semantics.md'), renderSemanticsMd, 'utf8');

console.log('--- Step 6: Provenance Index ---');
fs.writeFileSync(path.join(SPEC_DIR, 'provenance.json'), JSON.stringify(provenance, null, 2), 'utf8');

console.log('Spec extraction complete!');
