import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import pixelmatch from 'pixelmatch';
import { unzipSync } from 'fflate';
import { readPresetArchive } from '../../src/core/archive/reader.ts';
import { renderPreset } from '../../src/core/render/renderer.ts';
import { createSimState } from '../../src/core/formula/sim/sim-state.ts';
import { validateDoc } from '../../src/core/validate/validator.ts';
import { writePresetArchive } from '../../src/core/archive/writer.ts';
import { areCanonicallyEqual } from '../../src/core/model/canonical.ts';
import { serializePresetJson } from '../../src/core/model/serializer.ts';

globalThis.__kustom_create_canvas = createCanvas;

const args = process.argv.slice(2);
const isStructOnly = args.includes('--struct');
const isVisualOnly = args.includes('--visual');
const isExportOnly = args.includes('--export');
const runAll = !isStructOnly && !isVisualOnly && !isExportOnly;

function computeAlphaIoU(img1Data, img2Data) {
  let intersection = 0;
  let union = 0;
  const len = img1Data.data.length;

  for (let i = 3; i < len; i += 4) {
    const a1 = img1Data.data[i] > 10;
    const a2 = img2Data.data[i] > 10;
    if (a1 && a2) intersection++;
    if (a1 || a2) union++;
  }

  return union === 0 ? 1 : intersection / union;
}

async function verifyStruct() {
  console.log('\n--- Running V1 Lossless & L3 Schema Verification ---');
  const manifestPath = path.resolve('samples/manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('manifest.json not found');
    return { v1Passed: 0, v1Failed: 0, l3Passed: 0, l3Failed: 0 };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let v1Passed = 0;
  let v1Failed = 0;
  let l3Passed = 0;
  let l3Failed = 0;

  for (const sample of manifest.samples) {
    const presetPath = path.resolve(sample.preset);
    if (!fs.existsSync(presetPath)) continue;

    try {
      const bytes = fs.readFileSync(presetPath);
      const unzipped = unzipSync(bytes);
      const rootJsonName = sample.preset.endsWith('.komp') || unzipped['komponent.json'] ? 'komponent.json' : 'preset.json';
      const rawOriginalJson = JSON.parse(new TextDecoder('utf-8').decode(unzipped[rootJsonName]));

      const doc = readPresetArchive(bytes, { fileName: path.basename(presetPath) });

      // V1: Untouched export canonical equality against raw original preset.json
      const exportedBytes = writePresetArchive(doc, { preserveEntryOrder: true });
      const reloadedDoc = readPresetArchive(exportedBytes, { fileName: path.basename(presetPath) });
      const reReadJson = serializePresetJson(reloadedDoc);

      if (areCanonicallyEqual(rawOriginalJson, reReadJson)) {
        v1Passed++;
      } else {
        v1Failed++;
        console.error(`  V1 Failed for ${sample.id}`);
      }

      // L3: Schema validation
      const report = validateDoc(doc);
      const errors = report.issues.filter((i) => i.severity === 'error');
      if (errors.length === 0) {
        l3Passed++;
      } else {
        l3Failed++;
        console.error(`  L3 Schema error for ${sample.id}: ${errors[0].message}`);
      }
    } catch (err) {
      v1Failed++;
      l3Failed++;
      console.error(`  Error processing ${sample.id}:`, err.message);
    }
  }

  console.log(`Structural Verification complete: V1: ${v1Passed} passed, ${v1Failed} failed. L3: ${l3Passed} passed, ${l3Failed} failed.`);
  return { v1Passed, v1Failed, l3Passed, l3Failed };
}

async function verifyVisual() {
  console.log('\n--- Running V3 Visual Ratchet Verification ---');
  const manifestPath = path.resolve('samples/manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('manifest.json not found');
    return { totalChecked: 0, regressions: [], passedCount: 0 };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const reportsDir = path.resolve('reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const baselinePath = path.join(reportsDir, 'visual-baselines.json');
  const existingBaselines = fs.existsSync(baselinePath)
    ? JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
    : {};

  const baselines = { ...existingBaselines };
  const regressions = [];
  let totalChecked = 0;
  let passedCount = 0;

  for (const sample of manifest.samples) {
    if (!sample.previews || sample.previews.length === 0) continue;

    const presetPath = path.resolve(sample.preset);
    if (!fs.existsSync(presetPath)) continue;

    const bytes = fs.readFileSync(presetPath);
    const doc = readPresetArchive(bytes);

    for (const prev of sample.previews) {
      const prevPath = path.resolve(prev.path);
      if (!fs.existsSync(prevPath)) continue;

      try {
        const previewImg = await loadImage(fs.readFileSync(prevPath));
        const w = previewImg.width;
        const h = previewImg.height;

        const sim = createSimState({
          darkmode: prev.sim?.darkmode ?? 0,
        });

        const canvas = await renderPreset(doc, { kind: 'widget', w, h }, { sim });
        const ctx = canvas.getContext('2d');
        const renderedData = ctx.getImageData(0, 0, w, h);

        const prevCanvas = createCanvas(w, h);
        const prevCtx = prevCanvas.getContext('2d');
        prevCtx.drawImage(previewImg, 0, 0);
        const prevData = prevCtx.getImageData(0, 0, w, h);

        const alphaIoU = computeAlphaIoU(renderedData, prevData);
        const currentAlphaIoU = parseFloat(alphaIoU.toFixed(4));
        totalChecked++;

        const key = `${sample.id}_${prev.variant}`;
        const prevBaseline = existingBaselines[key]?.alphaIoU;

        if (prevBaseline !== undefined) {
          if (currentAlphaIoU < prevBaseline - 0.02) {
            regressions.push({
              key,
              prevBaseline,
              currentAlphaIoU,
              delta: parseFloat((currentAlphaIoU - prevBaseline).toFixed(4)),
            });
            console.error(`  [V3 REGRESSION] ${key}: dropped from ${(prevBaseline * 100).toFixed(1)}% to ${(currentAlphaIoU * 100).toFixed(1)}%`);
          }
        }

        // Ratchet: baselines may only go up
        const ratchetedIoU = prevBaseline !== undefined ? Math.max(prevBaseline, currentAlphaIoU) : currentAlphaIoU;
        baselines[key] = {
          alphaIoU: ratchetedIoU,
          size: [w, h],
          variant: prev.variant,
        };

        if (currentAlphaIoU >= 0.7) {
          passedCount++;
        }

        console.log(`  ${sample.id} (${prev.variant}): alpha IoU = ${(currentAlphaIoU * 100).toFixed(1)}% (ratchet: ${(ratchetedIoU * 100).toFixed(1)}%)`);
      } catch (err) {
        console.error(`  ${sample.id} error:`, err.message);
      }
    }
  }

  fs.writeFileSync(baselinePath, JSON.stringify(baselines, null, 2));
  console.log(`\nVisual Verification complete: ${totalChecked} previews compared. Regressions: ${regressions.length}.`);
  return { totalChecked, regressions, passedCount, baselinesCount: Object.keys(baselines).length };
}

async function main() {
  const reportsDir = path.resolve('reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  let structRes = null;
  let visualRes = null;
  let hasFailure = false;

  if (isStructOnly || runAll) {
    structRes = await verifyStruct();
    if (structRes.v1Failed > 0 || structRes.l3Failed > 0) {
      hasFailure = true;
    }
  }

  if (isVisualOnly || runAll) {
    visualRes = await verifyVisual();
    if (visualRes.regressions && visualRes.regressions.length > 0) {
      hasFailure = true;
    }
  }

  // Write summary report
  const summaryPath = path.join(reportsDir, 'summary.json');
  const existingSummary = fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, 'utf8')) : {};

  const updatedSummary = {
    ...existingSummary,
    timestamp: new Date().toISOString(),
    overall: hasFailure ? 'FAILED' : 'PASSED',
  };

  if (structRes) {
    updatedSummary.v1_lossless_original = {
      total: structRes.v1Passed + structRes.v1Failed,
      passed: structRes.v1Passed,
      failed: structRes.v1Failed,
    };
    updatedSummary.l3_schema = {
      total: structRes.l3Passed + structRes.l3Failed,
      passed: structRes.l3Passed,
      failed: structRes.l3Failed,
    };
  }
  if (visualRes) {
    updatedSummary.v3_visual_ratchet = {
      totalChecked: visualRes.totalChecked,
      regressionsCount: visualRes.regressions.length,
      regressions: visualRes.regressions,
      passedCount: visualRes.passedCount,
    };
  }

  fs.writeFileSync(summaryPath, JSON.stringify(updatedSummary, null, 2));
  console.log(`\nVerification summary written to reports/summary.json`);

  if (hasFailure) {
    console.error('\n❌ Verification gate failed.');
    process.exit(1);
  } else {
    console.log('\n✓ Verification gate passed.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
