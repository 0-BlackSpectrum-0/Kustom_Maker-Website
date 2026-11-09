// tools/check-size.mjs
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

const distDir = path.resolve(process.cwd(), 'dist');
if (!fs.existsSync(distDir)) {
  console.error('Error: dist/ directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

const assetsDir = path.join(distDir, 'assets');
const files = fs.readdirSync(assetsDir);

let jsFile = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
let cssFile = files.find((f) => f.startsWith('index-') && f.endsWith('.css'));

if (!jsFile || !cssFile) {
  console.error('Error: could not locate index JS or CSS in dist/assets.');
  process.exit(1);
}

const jsBytes = fs.readFileSync(path.join(assetsDir, jsFile));
const jsGzip = zlib.gzipSync(jsBytes);

const cssBytes = fs.readFileSync(path.join(assetsDir, cssFile));
const cssGzip = zlib.gzipSync(cssBytes);

const jsRawKb = (jsBytes.length / 1024).toFixed(2);
const jsGzipKb = (jsGzip.length / 1024).toFixed(2);
const cssRawKb = (cssBytes.length / 1024).toFixed(2);
const cssGzipKb = (cssGzip.length / 1024).toFixed(2);

console.log('--- KustomWeb Bundle Size Check ---');
console.log(`JS:  ${jsRawKb} KB raw | ${jsGzipKb} KB gzip (Budget: <= 120 KB gzip)`);
console.log(`CSS: ${cssRawKb} KB raw | ${cssGzipKb} KB gzip (Budget: <= 15 KB gzip)`);

let failed = false;
if (jsGzip.length > 120 * 1024) {
  console.error(`FAILED: JS gzip size (${jsGzipKb} KB) exceeds 120 KB budget!`);
  failed = true;
}

if (cssGzip.length > 15 * 1024) {
  console.error(`FAILED: CSS gzip size (${cssGzipKb} KB) exceeds 15 KB budget!`);
  failed = true;
}

if (!failed) {
  console.log('✓ All bundle size budgets met cleanly!');
} else {
  process.exit(1);
}
