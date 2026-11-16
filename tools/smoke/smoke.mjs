// tools/smoke/smoke.mjs
// Node/browser smoke test runner for KustomWeb
import fs from 'node:fs';
import path from 'node:path';

console.log('KustomWeb UI smoke check initializing...');
const reportsDir = path.join(process.cwd(), 'reports', 'ui');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Check sample files exist
const kwgtPath = path.join(process.cwd(), 'samples', '_src', 'kwgt-widgets', 'widgets', 'Clean_Time_Date_Info.kwgt');
const klwpPath = path.join(process.cwd(), 'samples', '_src', 'darkwave', '05_19_25_DarkWave_Release.klwp');

if (!fs.existsSync(kwgtPath) || !fs.existsSync(klwpPath)) {
  console.error('Missing required sample presets for smoke test');
  process.exit(1);
}

console.log('Smoke check ready: Verified preset samples available.');
