// tools/fetch-samples.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const SAMPLES_SRC = path.join(ROOT, 'samples', '_src');
const SAMPLES_EXTRA = path.join(ROOT, 'samples', 'extra');
const SAMPLES_ICONPACKS = path.join(ROOT, 'samples', 'iconpacks');
const REFERENCE = path.join(ROOT, 'reference');
const SOURCES_FILE = path.join(ROOT, 'samples', 'sources.json');

fs.mkdirSync(SAMPLES_SRC, { recursive: true });
fs.mkdirSync(SAMPLES_EXTRA, { recursive: true });
fs.mkdirSync(SAMPLES_ICONPACKS, { recursive: true });
fs.mkdirSync(REFERENCE, { recursive: true });

const REPOS = [
  {
    id: 'kwgt-widgets',
    url: 'https://github.com/AumGupta/KWGT-Widgets.git',
    dir: path.join(SAMPLES_SRC, 'kwgt-widgets'),
  },
  {
    id: 'darkwave',
    url: 'https://github.com/walleewoo/DarkWave_KLWP_THEME.git',
    dir: path.join(SAMPLES_SRC, 'darkwave'),
  },
  {
    id: 'klwp-viewer',
    url: 'https://github.com/damiante/klwp-viewer.git',
    dir: path.join(REFERENCE, 'klwp-viewer'),
  },
];

const sourcesState = {
  fetchedAt: new Date().toISOString(),
  repos: {},
  screenshots: {},
  extras: [],
  iconpacks: [],
};

// 1. Clone repos if not already cloned
for (const repo of REPOS) {
  console.log(`Checking repo: ${repo.id}...`);
  if (!fs.existsSync(path.join(repo.dir, '.git'))) {
    console.log(`Cloning ${repo.url} into ${repo.dir}...`);
    try {
      execSync(`git clone --depth 1 "${repo.url}" "${repo.dir}"`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`Failed to clone ${repo.id}: ${err.message}`);
    }
  } else {
    console.log(`Repo ${repo.id} already present.`);
  }

  try {
    const headSha = execSync('git rev-parse HEAD', { cwd: repo.dir, encoding: 'utf8' }).trim();
    sourcesState.repos[repo.id] = {
      url: repo.url,
      dir: path.relative(ROOT, repo.dir).replace(/\\/g, '/'),
      head: headSha,
    };
    console.log(`Repo ${repo.id} HEAD: ${headSha}`);
  } catch (err) {
    sourcesState.repos[repo.id] = { url: repo.url, dir: path.relative(ROOT, repo.dir), error: err.message };
  }
}

// 2. KLWP screenshots from DarkWave README
const darkwaveDir = path.join(SAMPLES_SRC, 'darkwave');
const darkwaveReadme = path.join(darkwaveDir, 'README.md');
const darkwaveShotsDir = path.join(SAMPLES_SRC, 'darkwave-shots');
fs.mkdirSync(darkwaveShotsDir, { recursive: true });

if (fs.existsSync(darkwaveReadme)) {
  const content = fs.readFileSync(darkwaveReadme, 'utf8');
  const matches = [...content.matchAll(/https:\/\/github\.com\/user-attachments\/assets\/([0-9a-f-]{36})/gi)];
  const uuids = [...new Set(matches.map((m) => m[1]))];
  console.log(`Found ${uuids.length} screenshot attachment UUIDs in DarkWave README.`);

  function sniffExt(buf) {
    if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
    if (
      buf.length >= 12 &&
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    )
      return 'webp';
    if (buf.length >= 8 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return 'mp4';
    return 'bin';
  }

  for (const uuid of uuids) {
    const existing = fs.readdirSync(darkwaveShotsDir).find((f) => f.startsWith(uuid));
    if (existing) {
      console.log(`Screenshot ${uuid} already present as ${existing}`);
      sourcesState.screenshots[uuid] = { status: 'present', file: existing };
      continue;
    }

    const url = `https://github.com/user-attachments/assets/${uuid}`;
    console.log(`Downloading screenshot: ${url}...`);
    try {
      // Use curl with redirect
      const tmpFile = path.join(darkwaveShotsDir, `${uuid}.tmp`);
      execSync(`curl.exe -s -L -f "${url}" -o "${tmpFile}"`, { stdio: 'pipe' });
      const bytes = fs.readFileSync(tmpFile);
      if (bytes.length > 0) {
        const ext = sniffExt(bytes);
        const finalFile = path.join(darkwaveShotsDir, `${uuid}.${ext}`);
        fs.renameSync(tmpFile, finalFile);
        console.log(`Downloaded ${uuid} -> ${uuid}.${ext} (${bytes.length} bytes)`);
        sourcesState.screenshots[uuid] = { status: 'downloaded', file: `${uuid}.${ext}`, size: bytes.length };
      } else {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
        sourcesState.screenshots[uuid] = { status: 'empty' };
      }
    } catch (err) {
      console.warn(`Could not download ${uuid}: ${err.message}. Marked as missing.`);
      sourcesState.screenshots[uuid] = { status: 'missing', error: err.message };
    }
  }
}

// 3. Extract extra samples from darkwave.apk
const darkwaveApk = path.join(darkwaveDir, 'darkwave.apk');
if (fs.existsSync(darkwaveApk)) {
  console.log(`Extracting samples from darkwave.apk...`);
  const pyCode = `
import zipfile, os
apk = r'''${darkwaveApk}'''
out_extra = r'''${SAMPLES_EXTRA}'''
with zipfile.ZipFile(apk, 'r') as zf:
    for name in zf.namelist():
        if (name.startswith('assets/widgets/') and name.endswith('.kwgt')) or \
           (name.startswith('assets/komponents/') and name.endswith('.komp')) or \
           (name.startswith('assets/wallpapers/') and name.endswith('.klwp')):
            dest = os.path.join(out_extra, os.path.basename(name))
            with open(dest, 'wb') as f:
                f.write(zf.read(name))
            print(f"Extracted extra: {dest}")
`;
  const tmpPy = path.join(SAMPLES_EXTRA, '_extract.py');
  try {
    fs.writeFileSync(tmpPy, pyCode, 'utf8');
    execSync(`python "${tmpPy}"`, { stdio: 'inherit' });
    fs.unlinkSync(tmpPy);
    const extraFiles = fs.readdirSync(SAMPLES_EXTRA);
    sourcesState.extras = extraFiles;
  } catch (err) {
    if (fs.existsSync(tmpPy)) fs.unlinkSync(tmpPy);
    console.error(`Error extracting darkwave.apk: ${err.message}`);
  }
}

// 4. Unzip icon packs
if (fs.existsSync(darkwaveDir)) {
  const iconZips = fs.readdirSync(darkwaveDir).filter((f) => f.endsWith('.zip'));
  for (const zipName of iconZips) {
    const setName = path.basename(zipName, '.zip');
    const targetDir = path.join(SAMPLES_ICONPACKS, setName);
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`Unzipping icon pack ${zipName} into ${targetDir}...`);
    try {
      execSync(`tar -xf "${path.join(darkwaveDir, zipName)}" -C "${targetDir}"`, { stdio: 'pipe' });
      sourcesState.iconpacks.push({ set: setName, files: fs.readdirSync(targetDir) });
    } catch (err) {
      console.warn(`Failed tar extraction for ${zipName}, trying python zipfile...`);
      try {
        const pyZip = `import zipfile; zipfile.ZipFile(r'''${path.join(darkwaveDir, zipName)}''').extractall(r'''${targetDir}''')`;
        execSync(`python -c "${pyZip}"`, { stdio: 'pipe' });
        sourcesState.iconpacks.push({ set: setName, files: fs.readdirSync(targetDir) });
      } catch (err2) {
        console.error(`Failed to extract icon pack ${zipName}: ${err2.message}`);
      }
    }
  }
}

// Write sources.json
fs.writeFileSync(SOURCES_FILE, JSON.stringify(sourcesState, null, 2), 'utf8');
console.log(`Finished fetch-samples. Written state to ${SOURCES_FILE}`);
