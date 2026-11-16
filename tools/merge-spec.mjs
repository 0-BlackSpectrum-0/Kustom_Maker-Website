// tools/merge-spec.mjs
// Aligns spec/modules.json and spec/defaults.json with observed.json
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const modulesPath = path.join(ROOT, 'spec', 'modules.json');
const defaultsPath = path.join(ROOT, 'spec', 'defaults.json');
const observedPath = path.join(ROOT, 'spec', 'observed.json');

const modules = JSON.parse(fs.readFileSync(modulesPath, 'utf8'));
const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
const observed = JSON.parse(fs.readFileSync(observedPath, 'utf8'));

// 1. ProgressModule
modules.ProgressModule = {
  sections: {
    position: modules.ProgressModule.sections.position || [],
    progress: [
      { key: 'progress_progress', type: 'enum', default: 'BATTERY', enum: 'Progress', desc: 'Progress data source (BATTERY, CUSTOM, MUSIC, etc.)' },
      { key: 'progress_mode', type: 'enum', default: 'PROGRESS', enum: 'ProgressMode', desc: 'Progress data mode' },
      { key: 'progress_level', type: 'number', default: 100, desc: 'Progress level (0..100)' },
      { key: 'progress_max', type: 'number', default: 100, desc: 'Maximum progress value' },
      { key: 'progress_count', type: 'number', default: 10, desc: 'Section count for split styles' },
      { key: 'progress_rotate_mode', type: 'enum', default: 'NONE', enum: 'rotate', desc: 'Progress rotation mode' },
      { key: 'progress_rotate_offset', type: 'angle', default: 0, desc: 'Progress rotation offset' },
      // Legacy unverified keys
      { key: 'progress_style', type: 'enum', default: 'LINEAR', enum: 'ProgressStyle', desc: 'Legacy progress style', legacy: true },
      { key: 'progress_shape', type: 'enum', default: 'RECT', enum: 'ProgressShape', desc: 'Legacy progress shape', legacy: true },
      { key: 'progress_size', type: 'number', default: 100, desc: 'Legacy progress size', legacy: true },
      { key: 'progress_width', type: 'number', default: 200, desc: 'Legacy progress width', legacy: true },
      { key: 'progress_height', type: 'number', default: 20, desc: 'Legacy progress height', legacy: true }
    ],
    style: [
      { key: 'style_style', type: 'enum', default: 'LINEAR', enum: 'ProgressStyle', desc: 'Visual style (LINEAR, CIRCLE, SPLIT)' },
      { key: 'style_shape', type: 'enum', default: 'RECT', enum: 'ProgressShape', desc: 'Shape used for progress items' },
      { key: 'style_width', type: 'number', default: 200, desc: 'Progress bar width' },
      { key: 'style_height', type: 'number', default: 20, desc: 'Progress bar height' },
      { key: 'style_size', type: 'number', default: 100, desc: 'Progress diameter or size' }
    ],
    color: [
      { key: 'color_mode', type: 'enum', default: 'CURRENT', enum: 'ProgressColorMode', desc: 'Color mode' },
      { key: 'color_color', type: 'color', default: '#FFFFFFFF', desc: 'Main progress color' },
      { key: 'color_fgcolor', type: 'color', default: '#FFFFFFFF', desc: 'Foreground progress color' },
      { key: 'color_bgcolor', type: 'color', default: '#33FFFFFF', desc: 'Background track color' },
      { key: 'color_tcolor', type: 'color', default: '#FFFFFFFF', desc: 'Track/target color' }
    ],
    paint: modules.ProgressModule.sections.paint || [],
    fx: modules.ProgressModule.sections.fx || []
  }
};

// 2. CurvedTextModule
modules.CurvedTextModule = {
  sections: {
    position: modules.CurvedTextModule.sections.position || [],
    text: [
      { key: 'text_expression', type: 'formula', default: 'Curved Text', desc: 'Text expression or formula' },
      { key: 'text_size', type: 'number', default: 40, desc: 'Font size in units' },
      { key: 'text_family', type: 'font', default: '', desc: 'Font file URI' },
      { key: 'text_width', type: 'number', default: 200, desc: 'Curve radius or width in units' },
      { key: 'text_rotate_mode', type: 'enum', default: 'NONE', enum: 'rotate', desc: 'Text rotation mode' },
      // Legacy unverified keys
      { key: 'curved_expression', type: 'formula', default: 'Curved Text', desc: 'Legacy curved expression', legacy: true },
      { key: 'curved_radius', type: 'number', default: 100, desc: 'Legacy curved radius', legacy: true },
      { key: 'curved_size', type: 'number', default: 40, desc: 'Legacy curved size', legacy: true },
      { key: 'curved_angle', type: 'angle', default: 0, desc: 'Legacy curved angle', legacy: true },
      { key: 'curved_family', type: 'font', default: '', desc: 'Legacy curved family', legacy: true }
    ],
    paint: modules.CurvedTextModule.sections.paint || [],
    fx: modules.CurvedTextModule.sections.fx || []
  }
};

// 3. OverlapLayerModule
if (modules.OverlapLayerModule?.sections?.layer) {
  const layerSec = modules.OverlapLayerModule.sections.layer;
  const existingKeys = new Set(layerSec.map(p => p.key));
  const newProps = [
    { key: 'config_fx', type: 'enum', default: 'NONE', enum: 'LayerFx', desc: 'Layer visual effect' },
    { key: 'config_fx_radius', type: 'number', default: 0, desc: 'Effect blur or radius' },
    { key: 'config_fx_dist', type: 'number', default: 0, desc: 'Effect distance' },
    { key: 'config_fx_angle', type: 'angle', default: 0, desc: 'Effect angle' },
    { key: 'config_fx_fcolor', type: 'color', default: '#FF000000', desc: 'Effect foreground/shadow color' },
    { key: 'config_fx_bcolor', type: 'color', default: '#00000000', desc: 'Effect background color' },
    { key: 'config_filter', type: 'enum', default: 'NONE', enum: 'colorFilter', desc: 'Color filter mode' },
    { key: 'config_filter_amount', type: 'percent', default: 100, desc: 'Color filter amount' },
  ];
  for (const p of newProps) {
    if (!existingKeys.has(p.key)) layerSec.push(p);
  }
}

// 4. ShapeModule
if (modules.ShapeModule?.sections?.fx) {
  const fxSec = modules.ShapeModule.sections.fx;
  const existingKeys = new Set(fxSec.map(p => p.key));
  const newProps = [
    { key: 'fx_bitmap_filter', type: 'enum', default: 'NONE', enum: 'colorFilter', desc: 'Bitmap color filter' },
    { key: 'fx_bitmap_filter_color', type: 'color', default: '#FFFFFFFF', desc: 'Bitmap filter color' },
    { key: 'fx_bitmap_filter_amount', type: 'percent', default: 100, desc: 'Bitmap filter amount' },
    { key: 'fx_bitmap_blur', type: 'number', default: 0, desc: 'Bitmap blur radius' },
    { key: 'fx_bitmap_dim', type: 'percent', default: 0, desc: 'Bitmap dim amount' }
  ];
  for (const p of newProps) {
    if (!existingKeys.has(p.key)) fxSec.push(p);
  }
}

// 5. TextModule
if (modules.TextModule?.sections?.text) {
  const textSec = modules.TextModule.sections.text;
  const existingKeys = new Set(textSec.map(p => p.key));
  if (!existingKeys.has('text_height')) {
    textSec.push({ key: 'text_height', type: 'number', default: 40, desc: 'Text block height' });
  }
  if (!existingKeys.has('text_filter')) {
    textSec.push({ key: 'text_filter', type: 'enum', default: 'NONE', enum: 'TextFilter', desc: 'Text case or format filter' });
  }
}

// 6. RootLayerModule
if (modules.RootLayerModule?.sections?.layer) {
  const layerSec = modules.RootLayerModule.sections.layer;
  for (const p of layerSec) {
    if (p.key === 'background_color' || p.key === 'background_type') {
      p.legacy = true;
    }
  }
  const existingKeys = new Set(layerSec.map(p => p.key));
  if (!existingKeys.has('background_bitmap')) {
    layerSec.push({ key: 'background_bitmap', type: 'bitmap', default: '', desc: 'Root wallpaper bitmap URI' });
  }
  if (!existingKeys.has('background_scroll')) {
    layerSec.push({ key: 'background_scroll', type: 'enum', default: 'NONE', enum: 'scroll', desc: 'Wallpaper scrolling mode' });
  }
  if (!existingKeys.has('config_scale_value')) {
    layerSec.push({ key: 'config_scale_value', type: 'number', default: 100, desc: 'Root scale percentage' });
  }
  if (!existingKeys.has('config_visible')) {
    layerSec.push({ key: 'config_visible', type: 'enum', default: 'ALWAYS', enum: 'visibility', desc: 'Root visibility mode' });
  }
}

// Defaults
const newDefaults = {
  progress_progress: 'BATTERY',
  progress_level: 100,
  progress_mode: 'PROGRESS',
  progress_count: 10,
  progress_max: 100,
  style_shape: 'RECT',
  style_style: 'LINEAR',
  style_width: 200,
  style_height: 20,
  style_size: 100,
  color_mode: 'CURRENT',
  color_color: '#FFFFFFFF',
  color_bgcolor: '#33FFFFFF',
  color_fgcolor: '#FFFFFFFF',
  color_tcolor: '#FFFFFFFF',
  config_fx: 'NONE',
  config_fx_radius: 0,
  config_fx_dist: 0,
  config_fx_angle: 0,
  config_fx_fcolor: '#FF000000',
  config_fx_bcolor: '#00000000',
  config_filter: 'NONE',
  config_filter_amount: 100,
  text_height: 40,
  text_filter: 'NONE'
};

for (const [k, v] of Object.entries(newDefaults)) {
  if (defaults[k] === undefined) {
    defaults[k] = v;
  }
}

fs.writeFileSync(modulesPath, JSON.stringify(modules, null, 2), 'utf8');
fs.writeFileSync(defaultsPath, JSON.stringify(defaults, null, 2), 'utf8');
console.log('Successfully aligned spec/modules.json and spec/defaults.json with observed corpus properties.');
