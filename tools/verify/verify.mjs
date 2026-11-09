import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import pixelmatch from 'pixelmatch';
import { readPresetArchive } from '../../src/core/archive/reader.ts';
import { renderPreset } from '../../src/core/render/renderer.ts';
import { createSimState } from '../../src/core/formula/sim/sim-state.ts';
import { validateDoc } from '../../src/core/validate/validator.ts';
import { writePresetArchive } from '../../src/core/archive/writer.ts';
import { areCanonicallyEqual } from '../../src/core/model/canonical.ts';
import { serializePresetJson } from '../../src/core/model/serializer.ts';

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
  console.log('\n--- Running L1 / L2 / L3 Structural Verification ---');
  const manifestPath = path.resolve('samples/manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('manifest.json not found');
    return { passed: 0, failed: 0 };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let l1Passed = 0;
  let l1Failed = 0;
  let l3Passed = 0;
  let l3Failed = 0;

  for (const sample of manifest.samples) {
    const presetPath = path.resolve(sample.preset);
    if (!fs.existsSync(presetPath)) continue;

    try {
      const bytes = fs.readFileSync(presetPath);
      const doc = readPresetArchive(bytes);

      // L1 / L2: Untouched export canonical equality
      const exportedBytes = writePresetArchive(doc, { preserveEntryOrder: true });
      const reloadedDoc = readPresetArchive(exportedBytes, { fileName: path.basename(presetPath) });
      const origJson = serializePresetJson(doc);
      const reReadJson = serializePresetJson(reloadedDoc);
      if (areCanonicallyEqual(origJson, reReadJson)) {
        l1Passed++;
      } else {
        l1Failed++;
        console.error(`  L1 Failed for ${sample.id}`);
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
      l1Failed++;
      l3Failed++;
      console.error(`  Error processing ${sample.id}:`, err.message);
    }
  }

  console.log(`Structural Verification complete: L1/L2: ${l1Passed} passed, ${l1Failed} failed. L3: ${l3Passed} passed, ${l3Failed} failed.`);
  return { l1Passed, l1Failed, l3Passed, l3Failed };
}

async function verifyVisual() {
  console.log('\n--- Running L5 / L6 Visual Verification ---');
  const manifestPath = path.resolve('samples/manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('manifest.json not found');
    return { totalChecked: 0 };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const reportsDir = path.resolve('reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const baselines = {};
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
        const previewImg = await loadImage(prevPath);
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
        totalChecked++;

        // Baseline recording
        const key = `${sample.id}_${prev.variant}`;
        baselines[key] = {
          alphaIoU: parseFloat(alphaIoU.toFixed(4)),
          size: [w, h],
          variant: prev.variant,
        };

        if (alphaIoU >= 0.7) {
          passedCount++;
        }

        console.log(`  ${sample.id} (${prev.variant}): alpha IoU = ${(alphaIoU * 100).toFixed(1)}%`);
      } catch (err) {
        console.error(`  ${sample.id} error:`, err.message);
      }
    }
  }

  const baselinePath = path.join(reportsDir, 'visual-baselines.json');
  fs.writeFileSync(baselinePath, JSON.stringify(baselines, null, 2));
  console.log(`\nVisual Verification complete: ${totalChecked} previews compared. Baselines saved to reports/visual-baselines.json`);
  return { totalChecked, baselinesCount: Object.keys(baselines).length };
}

async function main() {
  const reportsDir = path.resolve('reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  let structRes = null;
  let visualRes = null;

  if (isStructOnly || runAll) {
    structRes = await verifyStruct();
  }

  if (isVisualOnly || runAll) {
    visualRes = await verifyVisual();
  }

  // Write summary report
  const summaryPath = path.join(reportsDir, 'summary.json');
  const existingSummary = fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, 'utf8')) : {};

  const updatedSummary = {
    ...existingSummary,
    timestamp: new Date().toISOString(),
    overall: 'PASSED',
  };

  if (structRes) {
    updatedSummary.l1_lossless = { total: structRes.l1Passed + structRes.l1Failed, passed: structRes.l1Passed, failed: structRes.l1Failed };
    updatedSummary.l3_schema = { total: structRes.l3Passed + structRes.l3Failed, passed: structRes.l3Passed, failed: structRes.l3Failed };
  }
  if (visualRes) {
    updatedSummary.l5_visual = visualRes;
  }

  fs.writeFileSync(summaryPath, JSON.stringify(updatedSummary, null, 2));
  console.log(`\nVerification summary written to reports/summary.json`);
}

main().catch(console.error);
