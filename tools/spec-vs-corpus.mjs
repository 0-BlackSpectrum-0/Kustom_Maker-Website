// tools/spec-vs-corpus.mjs
// Analyzes all 46 real archives in samples/ and produces spec/observed.json
import fs from 'node:fs';
import path from 'node:path';
import { unzipSync } from 'fflate';

const ROOT = process.cwd();
const KWGT_DIR = path.join(ROOT, 'samples', '_src', 'kwgt-widgets', 'widgets');
const KOMP_DIR = path.join(ROOT, 'samples', '_src', 'kwgt-widgets', 'komponents');
const DARKWAVE_DIR = path.join(ROOT, 'samples', '_src', 'darkwave');
const EXTRA_DIR = path.join(ROOT, 'samples', 'extra');

function getSampleFiles() {
  const files = [];
  if (fs.existsSync(KWGT_DIR)) {
    for (const f of fs.readdirSync(KWGT_DIR).filter(x => x.endsWith('.kwgt'))) {
      files.push(path.join(KWGT_DIR, f));
    }
  }
  if (fs.existsSync(KOMP_DIR)) {
    for (const f of fs.readdirSync(KOMP_DIR).filter(x => x.endsWith('.komp'))) {
      files.push(path.join(KOMP_DIR, f));
    }
  }
  if (fs.existsSync(DARKWAVE_DIR)) {
    for (const f of fs.readdirSync(DARKWAVE_DIR).filter(x => x.endsWith('.klwp'))) {
      files.push(path.join(DARKWAVE_DIR, f));
    }
  }
  if (fs.existsSync(EXTRA_DIR)) {
    for (const f of fs.readdirSync(EXTRA_DIR)) {
      if (f.endsWith('.kwgt') || f.endsWith('.klwp') || f.endsWith('.komp')) {
        files.push(path.join(EXTRA_DIR, f));
      }
    }
  }
  return files;
}

const observed = {
  stats: {
    totalArchives: 0,
    moduleCounts: {},
  },
  modules: {},
};

function recordNode(node) {
  const type = node.internal_type || node.type || 'Unknown';
  observed.stats.moduleCounts[type] = (observed.stats.moduleCounts[type] || 0) + 1;
  if (!observed.modules[type]) {
    observed.modules[type] = {
      count: 0,
      props: {},
    };
  }
  observed.modules[type].count++;

  // Process all property keys in node
  for (const [k, v] of Object.entries(node)) {
    if (['internal_type', 'type', 'internal_title', 'title', 'viewgroup_items', 'children', 'internal_events', 'internal_animations', 'internal_flows', 'internal_toggles'].includes(k)) {
      continue;
    }
    if (!observed.modules[type].props[k]) {
      observed.modules[type].props[k] = {
        count: 0,
        values: {},
      };
    }
    observed.modules[type].props[k].count++;

    // Record sample values / enums
    let valStr = '';
    if (v !== null && typeof v === 'object' && 'value' in v) {
      valStr = String(v.value);
    } else if (v !== null && typeof v !== 'object') {
      valStr = String(v);
    }
    if (valStr && valStr.length < 100) {
      observed.modules[type].props[k].values[valStr] = (observed.modules[type].props[k].values[valStr] || 0) + 1;
    }
  }

  // Recurse into children
  const kids = node.viewgroup_items || node.children || [];
  for (const child of kids) {
    recordNode(child);
  }
}

const files = getSampleFiles();
observed.stats.totalArchives = files.length;
console.log(`Analyzing ${files.length} archives...`);

for (const file of files) {
  try {
    const buf = fs.readFileSync(file);
    const unzipped = unzipSync(new Uint8Array(buf));
    let presetBuf = unzipped['preset.json'];
    if (!presetBuf) {
      const match = Object.keys(unzipped).find(k => k.endsWith('preset.json'));
      if (match) presetBuf = unzipped[match];
    }
    if (!presetBuf) continue;

    const jsonStr = new TextDecoder().decode(presetBuf);
    const data = JSON.parse(jsonStr);

    if (data.preset_root) {
      recordNode(data.preset_root);
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
}

console.log('Module counts observed:', observed.stats.moduleCounts);

const outPath = path.join(ROOT, 'spec', 'observed.json');
fs.writeFileSync(outPath, JSON.stringify(observed, null, 2), 'utf-8');
console.log(`Wrote spec/observed.json successfully (${Object.keys(observed.modules).length} module types).`);
