#!/usr/bin/env node
// tools/cli/kweb.ts
import fs from 'node:fs';
import path from 'node:path';
import { readPresetArchive } from '../../src/core/archive/reader.ts';
import { writePresetArchive } from '../../src/core/archive/writer.ts';
import { areCanonicallyEqual, canonicalJson } from '../../src/core/model/canonical.ts';
import { serializePresetJson } from '../../src/core/model/serializer.ts';

const args = process.argv.slice(2);
const command = args[0];

function usage() {
  console.log(`
Usage: kweb <command> [options]

Commands:
  inspect <file>               Inspect preset metadata, structure, assets, and thumbs
  roundtrip <file> [-o out]    Parse and re-export preset, verifying lossless fidelity
  validate <file>              Validate archive layout, schema, and references
`);
  process.exit(1);
}

if (!command) usage();

if (command === 'inspect') {
  const filePath = args[1];
  if (!filePath) {
    console.error('Error: specify preset file path to inspect');
    process.exit(1);
  }

  const bytes = new Uint8Array(fs.readFileSync(filePath));
  const doc = readPresetArchive(bytes, { fileName: path.basename(filePath) });

  console.log('--- Preset Info ---');
  console.log(JSON.stringify(doc.info, null, 2));

  console.log('\n--- Structure ---');
  function printTree(node: any, indent = 0) {
    const pad = '  '.repeat(indent);
    const propCount = Object.keys(node.props).length;
    console.log(`${pad}- [${node.type}] "${node.title}" (${propCount} props)`);
    if (node.children) {
      for (const c of node.children) {
        printTree(c, indent + 1);
      }
    }
  }
  printTree(doc.root);

  console.log('\n--- Globals ---');
  console.log(`Total: ${Object.keys(doc.globals).length}`);
  for (const [k, v] of Object.entries(doc.globals)) {
    console.log(`  ${k} (${v.type}): ${v.value ?? v.global_formula}`);
  }

  console.log('\n--- Assets ---');
  console.log(`Total: ${doc.assets.size}`);
  for (const [k, v] of doc.assets.entries()) {
    console.log(`  ${k} (${v.length} bytes)`);
  }

  console.log('\n--- Thumbnails ---');
  if (doc.thumbs.portrait) console.log(`  portrait: ${doc.thumbs.portrait.length} bytes`);
  if (doc.thumbs.landscape) console.log(`  landscape: ${doc.thumbs.landscape.length} bytes`);
  if (doc.thumbs.komp) console.log(`  komp: ${doc.thumbs.komp.length} bytes`);
} else if (command === 'roundtrip') {
  const filePath = args[1];
  if (!filePath) {
    console.error('Error: specify preset file path to roundtrip');
    process.exit(1);
  }

  const outIndex = args.indexOf('-o');
  const outPath = outIndex !== -1 ? args[outIndex + 1] : null;

  const originalBytes = new Uint8Array(fs.readFileSync(filePath));
  const doc = readPresetArchive(originalBytes, { fileName: path.basename(filePath) });

  const reexportedBytes = writePresetArchive(doc, { preserveEntryOrder: true });

  if (outPath) {
    fs.writeFileSync(outPath, reexportedBytes);
    console.log(`Written roundtrip archive to ${outPath}`);
  }

  // Re-read exported bytes
  const reReadDoc = readPresetArchive(reexportedBytes, { fileName: path.basename(filePath) });

  const origJson = serializePresetJson(doc);
  const roundtripJson = serializePresetJson(reReadDoc);

  const equal = areCanonicallyEqual(origJson, roundtripJson);
  if (equal) {
    console.log(`✓ L1 Round-trip SUCCESS: Canonical JSON matches 100%`);
    console.log(`  Original size: ${originalBytes.length} bytes, Re-exported: ${reexportedBytes.length} bytes`);
  } else {
    console.error(`✗ L1 Round-trip FAILURE: Canonical JSON differs`);
    process.exit(1);
  }
} else if (command === 'validate') {
  const filePath = args[1];
  if (!filePath) {
    console.error('Error: specify preset file path to validate');
    process.exit(1);
  }

  const bytes = new Uint8Array(fs.readFileSync(filePath));
  try {
    const doc = readPresetArchive(bytes, { fileName: path.basename(filePath) });
    console.log(`✓ Parse OK: [${doc.kind}] with ${Object.keys(doc.info).length} info fields`);
    console.log(`✓ Structure OK: Root [${doc.root.type}]`);
    console.log(`✓ Assets OK: ${doc.assets.size} referenced assets`);
  } catch (err: any) {
    console.error(`✗ Validation failed: ${err.message}`);
    process.exit(1);
  }
} else {
  usage();
}
