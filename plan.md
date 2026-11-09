# KustomWeb — Browser-Based KLWP / KWGT Editor

**Implementation plan for the Antigravity agent (revision 2: grounded in the real sample repos)**

Target: a lightweight, static, offline-capable web app ("Photopea for Kustom") that imports, edits, previews, validates and exports `.klwp` (Kustom Live Wallpaper), `.kwgt` (Kustom Widget) and `.komp` (Komponent) files, so they can be designed on a PC and then imported into the user's own licensed Kustom / Kustom Pro apps on the phone.

> **What changed in revision 2.** The sample corpus is now concrete: three public GitHub repos (section 3). I cloned them while writing this revision and inspected the archives, so many former `[HYPOTHESIS]` items are now **verified facts with provenance** (section 3.4 and 9). Several early assumptions were wrong and are corrected: thumbnails are WebP data inside `.jpg` names; KWGT screenshots are transparent widget-only renders (no phone frame) with light/dark pairs; property binding uses three side-maps plus a toggle; widget sizes in the corpus do not follow the `70n−30` dp rule; `fx_mask`/`paint_mode: CLEAR` are central to the KWGT corpus. Anything not re-verified is still tagged `[HYPOTHESIS]`.

---

## 0. How the agent should work with this document

1. Read this whole file once, then execute phases in order (section 22). **Do not skip Phase 0**: it fetches the samples and regenerates the spec from them.
2. Evidence beats this document. Anything marked `[HYPOTHESIS]` or `[INFERRED]` must be confirmed against (a) the sample files, (b) the decompiled app if the user supplied one (section 3.1), (c) the official docs. Where evidence disagrees with this plan, evidence wins; record the correction in `docs/spec-corrections.md`.
3. Every fact in the generated spec carries a **provenance tag**: `sample:<file>`, `decompiled:<class/path>`, `viewer:<file>` (klwp-viewer notes), `docs:<url>`, or `hypothesis`. Hypotheses must reach zero before Phase 7 sign-off.
4. Treat `samples/_src/` and `reference/` as **read-only**. Work on copies.
5. Keep a running log in `docs/verification-log.md` (template in Appendix D). Each phase ends with `npm run verify` passing and a git commit.
6. Ask the user only when genuinely blocked. Open questions with pre-chosen defaults are in section 4; proceed with the defaults and flag them in the final report.
7. If Antigravity's browser tool is available, use it for end-to-end UI checks and keep screenshots as artifacts. Otherwise use Playwright (dev dependency only).

---

## 1. Goals and non-goals

### 1.1 Goals
- **G1. Import** existing `.klwp` / `.kwgt` / `.komp` files (and drag-dropped assets) losslessly.
- **G2. Edit** with a desktop-grade UI: layer tree, inspector, formula editor, globals, assets, undo/redo, snapping, zoom/pan, shortcuts.
- **G3. Preview** accurately: text, shapes (incl. blend modes and clip masks), images, font icons, progress, curved text, groups, komponents, animations and formulas, driven by a **simulated data environment** (time, battery, weather, music, dark mode, widget size …).
- **G4. Pick the canvas.** KLWP: **phone frames** (device profiles, status/nav bars, multi-screen scroll). KWGT: **widget grid sizes** (1x1, 2x2, 2x4, 4x2, 4x4, custom, plus each preset's native size). No phone frame for KWGT.
- **G5. Export** files that the Kustom apps import without errors, structurally indistinguishable from files the real apps write.
- **G6. Self-verify automatically**: lossless round-trip, schema checks, formula health, embedded-thumbnail and README-screenshot comparison, and deterministic auto-fixing of export problems. Verification is a first-class feature.
- **G7. Lightweight**: static site, no backend, tiny dependency set, fast on an old laptop (budgets in section 20).

### 1.2 Non-goals
- Not a replacement for Kustom on the phone. Live data (notifications, calendar, sensors, real weather) is **simulated**.
- No cracking or licence bypassing. The user owns the paid Kustom apps; the tool only produces standard preset archives that are imported **through the app's own import feature**.
- **No decryption of locked presets** (`internal_readonly`). Locked files are detected and refused with a clear message.
- No cloud accounts or hosting of other people's presets.
- No Kustom Lockscreen (KLCK), Watch (KWCH), Wear in v1. Architecture must not prevent them later.

---

## 2. Ground rules: legal, ethical, hygiene

- **Personal-use project**, unofficial, not affiliated with Kustom Industries (say so in the footer and README).
- **Sample licences (checked on GitHub while planning):**
  - `AumGupta/KWGT-Widgets`: MIT. Fixtures may be kept in the repo with a `NOTICE` crediting the author.
  - `walleewoo/DarkWave_KLWP_THEME`: MIT. Same handling.
  - `damiante/klwp-viewer`: **no LICENSE file in the repo tree at clone time** → treat as *reference only*. Read it for facts and approach; **do not copy its code**. Re-check for a LICENSE before any reuse.
  - `luxbe/klwe`: MIT (SvelteKit, thin); reference only.
- **Fonts inside the sample repos/archives are not ours to ship** (Product Sans, N-Type 82, Ndot, Roboto, etc.). Use them locally for rendering tests; never bundle them in `dist/`. The app loads fonts from the opened preset's own archive or the user's files.
- **Decompiled Kustom app (if supplied) = private reference only.** Lives in `reference/decompiled/` (gitignored), never shipped or pasted into source. Record facts (key names, defaults, enums, semantics) with provenance and write original code.
- `darkwave.apk` in the DarkWave repo is a third-party **theme skin APK**, not the Kustom app. Read only its `assets/` entries (a zip) for extra sample files; do not execute or redistribute it.
- **No telemetry**; no runtime network calls except user-initiated ones (optional Google Fonts / Iconify fetch, off by default).
- **Locked presets are never decrypted.**

---

## 3. Inputs and reference materials

### 3.1 Sample sources (what the user told us to use)

| Role | Repo | Verified contents (cloned & inspected during planning) |
|---|---|---|
| **KWGT samples + screenshots** | https://github.com/AumGupta/KWGT-Widgets | `widgets/*.kwgt` (**40** presets), `komponents/Wave_Progress_Bar.komp` (1), `fonts/*.ttf` (20 files: ProductSans, NType82, Ndot, Lettera Mono …), `docs/previews/*.png` (**69** screenshots), `docs/index.html` (gallery site), `README.md` (gallery with preview links), `update_readme.py`, `widget_listing.py`, `LICENSE` (MIT) |
| **KLWP samples** | https://github.com/walleewoo/DarkWave_KLWP_THEME | `05_19_25_DarkWave_Release.klwp` (12.0 MB), `08_31_25_DarkWave_PreRelease.klwp` (8.7 MB), four icon-pack zips (`OS-ICONS_v1-9.zip`, `OVERSIZED_v4-5.zip`, `WALLSTARS_MAIN_v18-1.zip`, `WALLSTARS_OVERSIZED_v5-0.zip`: each a `<set>.ttf` + `<set>.json` pair), `darkwave.apk` (13.5 MB skin APK whose `assets/` holds `wallpapers/05_19_25_DarkWave_Release.klwp`, `widgets/Clock_01.kwgt`, `komponents/Clock_01.komp`), `README.md`, `LICENSE` (MIT) |
| **Reference implementation** | https://github.com/damiante/klwp-viewer | TypeScript/Vite editor + CLI. `src/klwp/{schema,document,ops,formula,functions,render,resources,archive}.ts` (≈2,900 lines), `src/ui/{inspector,tree}.ts`, `tests/*`, `public/samples/art_deco.klwp`, and `.claude/skills/klwp/{SKILL.md,reference.md,examples/*.json}` (op format, formula language, animation/loop semantics). Facts were recovered from `klwp_google_release_382.apk` (its README maps each area to APK classes: `ye.*` module specs, `org.kustom.lib.options`, `org.kustom.lib.parser`, `RenderModule`, `LayerModule`, `PresetExporter`, `AnimationModule`). Self-declared limits: Progress / Series / CurvedText / Movie / Komponent not editable or previewed; exports "not yet loaded on a phone". |
| Optional | https://github.com/luxbe/klwe | SvelteKit KLWP editor (2021, minimal). |
| Optional, if the user has it | a decompiled Kustom app (jadx/apktool output) | Phase 0 looks for it (globs for `AndroidManifest.xml`, `smali*/`, `sources/`) under the project root. **Absent → proceed with samples + klwp-viewer notes + docs and mark unresolved facts as `hypothesis` to be settled by the device loop (section 19).** |

If the project folder also contains user-supplied samples/screenshots, the inventory step merges them with the cloned ones (user files win on name clashes; record both).

### 3.2 Sample acquisition (`tools/fetch-samples.mjs`, run in Phase 0)
1. `git clone --depth 1` the two sample repos into `samples/_src/kwgt-widgets/` and `samples/_src/darkwave/`, and the reference repo into `reference/klwp-viewer/` (gitignored). Record each `HEAD` SHA in `samples/sources.json`.
2. **KWGT screenshots are in the repo** (`docs/previews/`), nothing to download.
3. **KLWP screenshots are not in the DarkWave repo.** Its README embeds them as `https://github.com/user-attachments/assets/<uuid>` links:
   - `ae111594-e31a-46ef-9997-6adb68249dc9` ("16296", PNG), `6601f876-6256-4e9d-b7ad-2e80e983c566` ("16289", PNG): "SCREENS"
   - `f36f1ba7-a2a7-46e4-91f4-f42c417758be` ("16352", JPG): new colour changer UI
   - `8313732a-d980-40f4-9e64-1f83bf23c8ab` ("30578"), `fc03d10c-5202-4a48-a25d-d8c824f9ef95` ("30579"): widget
   - `637b0168-3dfc-4233-b9f7-b3459c7a8a94` ("34321"), `d065beb4-5dc4-4a82-9aad-a56f3a290f0c` ("30581"): hero images
   - `11845180-86a9-4ef5-9687-cf97e81c77e0` ("16299.mp4"): video (use for nothing but a human glance)
   Parse the README (regex `https://github.com/user-attachments/assets/[0-9a-f-]{36}`) and download with `curl -L` into `samples/_src/darkwave-shots/<uuid>.<ext>` (sniff extension from magic bytes). **The planning sandbox got HTTP 403 on these URLs** (its network policy), so the fetch step must handle failure gracefully: mark each as `missing`, continue, and tell the user to drop the screenshots into `samples/_src/darkwave-shots/` by hand. Nothing downstream may hard-depend on them (see 18.2, L6-klwp).
4. Extract extra samples from the APK **in memory/to a scratch dir** with a zip reader: `assets/widgets/Clock_01.kwgt`, `assets/komponents/Clock_01.komp`, `assets/wallpapers/*.klwp` (the wallpaper there is byte-identical in size to the repo file; dedupe by hash). These extras have no screenshots → L1–L4 only.
5. Unzip each icon-pack zip into `samples/iconpacks/<set>/` (asset-import test fixtures).

### 3.3 Online references (fetch, summarise into `docs/refs/`)
Official docs (Kustom HQ), https://docs.kustom.rocks/ :
- Functions index and **every** per-function page (`/docs/reference/functions/<xx>/`): AI, AQ, BI, BP, BR, CD, CE, CI, CM, DF, DP, FD, FL, GH, GV, IF, LI, LV, MI, MQ, MU, NC, NI, RM, SH, SI, TC, TF, TS, TU, UC, WF, WG, WI. Formula syntax: `$…$`; operators `= > >= < <= & |`; parentheses.
- Math operators `/docs/more/math_operators/`; Resources `kfile://provider/path` `/docs/reference/resources/`; Groups `/docs/general_information/groups_explained/`; Globals `/docs/reference/globals/`; Animations `/docs/reference/animations/…`; Masks `/docs/reference/masks/`; Shaders `/docs/reference/shaders/`; SVG paths `/docs/reference/svgpaths/`; Dynamic colours `/docs/reference/dynamic_colors/`; Flows `/docs/reference/flows/`; Font icons `/docs/tutorials/font_icon_pack/`; Sharing modules as text (`##KUSTOMCLIP##`) `/docs/tutorials/sharing_moduels/`; Developer pages `/docs/developers/`; KAPK walls format `/docs/more/kapk_walls_format/`; Recipes/tutorials (arc progress via Sweep Gradient + offset, pattern tiling, scrollable themes).
- Release notes by version: `/docs/downloads/download-kwgt/` and `/download-klwp/` (KWGT 3.77b435216 on 2025-03-04, 3.80b522706 on 2025-08-15, 3.81b528708 on 2025-10-14 at the time of planning). These give the `release` numbers real meaning (see 3.4).
- Community: forum thread confirming "`.klwp` is a ZIP with `preset.json` + bitmaps/fonts" (`forum.kustom.rocks/t/dot-klwp-file-contents-map/5482`); `tored.kodeine` VS Code extension (formula evaluator: float quirks, `lv()`/`gv()` scoping).

### 3.4 Verified facts about the files (provenance: the cloned samples)

| # | Fact | Evidence |
|---|---|---|
| F1 | A `.kwgt`/`.klwp` is a ZIP (deflate). Entries: `preset.json`, `preset_thumb_portrait.jpg`, `preset_thumb_landscape.jpg`, then optional `bitmaps/IMG<32 hex>`, `fonts/<file>`, `icons/<set>.ttf` + `icons/<set>.json`. No directory entries. Entry order observed: preset.json, thumb_portrait, thumb_landscape, then assets (order varies; KWGT lists `icons/` before `fonts/` in the media-player sample). | `unzip -v` on Nothing_Analog_5, Material3_Expanded_Media_Player, DarkWave Release |
| F2 | A `.komp` is a ZIP: `komponent.json`, `komponent_thumb.jpg`, plus `icons/…` assets. Root `internal_type` is `KomponentModule` with `internal_title/description/author_name/author_email` and `globals_list`; `preset_info` is still present. | Wave_Progress_Bar.komp |
| F3 | **The "`.jpg`" thumbnails are WebP data** (RIFF/WEBP magic). KLWP: portrait **460×1024**, landscape **1024×460** (aspect = `preset_info` width:height, here 540×1200). KWGT: long edge **1024**; portrait has the widget's aspect (e.g. 784×1024 for 415×542), landscape is the same dimensions transposed (1024×784). Komponent thumb is small (~4 KB). | PIL on all 40 KWGT + 2 KLWP + 1 KOMP |
| F4 | `preset.json` is UTF-8, pretty-printed with 2-space indent. Floats keep `.0` (`"text_size": 22.0`). Colours are 9-char `#AARRGGBB` (131/131 `paint_color` values in DarkWave, 7/7 in the media player). | raw files |
| F5 | `preset_info` has two writer generations. Old (release `376422110`): `version, title, description, author, email, width, height, features, release, locked, pflags`. New (≥ 3.77): `archive, author, description, email, features, pflags, height, locked, release, title, version, width, xscreens, yscreens`; KLWP adds `hash, id (uuid), ts (epoch ms)`. Key order is **the app's serializer order, not alphabetical** (`pflags` sits between `features` and `height`). `version` = 13 in all samples. | 40 KWGT + 2 KLWP |
| F6 | **`release` = app version + build, concatenated**: `376422110` (3.76 b422110), `377435216` (**KWGT 3.77b435216**, published in the docs), `377432414`, `378512015`, `380522706` (**3.80b522706**, published in the docs). 8 samples are 3.76, 31 are 3.77. Never write a `release` higher than the newest app the user runs. | corpus + docs |
| F7 | `features` is a space-separated token list: `ANALOG_CLOCK, MUSIC, NOTIFICATIONS, BLUETOOTH, WEATHER, AIR_QUALITY, FORECAST` (KWGT) and also `CALENDAR, SIGNAL, NETWORK_INFO` (DarkWave). It tracks which function families the preset uses (wi→WEATHER, wf→FORECAST, mi→MUSIC, ni→NOTIFICATIONS, br(bluetooth…)→BLUETOOTH …). `ANALOG_CLOCK` probably tracks `*_rotate_mode: CLOCK_*` `[INFERRED]`. Derive the exact rule statistically in Phase 0 (fixer F-features). | corpus statistics |
| F8 | **Property binding model.** A module may carry three side-maps keyed by property name: `internal_toggles` (int), `internal_formulas` (string), `internal_globals` (global name, may be folder-qualified like `pall_1/c5`). The toggle says which source is active: **`0` = literal value, `10` = formula, `100` = global**. Across 5,324 toggle entries: every `100` has a global entry (1308/1308); `10` has a formula entry in 3216/3251 (35 anomalies kept as-is); `0` often retains a **stale formula/global** that is inactive. The literal sits in the property key itself (absent when the default). Stale maps must be **preserved** on round-trip. | `toggles.py` cross-tab |
| F9 | Globals live in `globals_list` on `RootLayerModule` (KWGT/KLWP) or `KomponentModule`: `{ name: { index, type, title, value | global_formula, min, max, toggles, description, entries } }`. Types seen: `NUMBER`, `COLOR`, `BITMAP`, `LIST` (`entries: "0,2,4,…"`, `value`). klwp-viewer lists also `SWITCH`, `FONT`, `TEXT`. A global's own formula is `global_formula`. `NUMBER` sliders are capped at **720**, matching the unit system (13.1). | samples + viewer |
| F10 | Module types in the 40 KWGT presets: Shape **1150**, Stack **476**, Overlap **321**, Text **98**, Progress **58**, FontIcon **25**, CurvedText **14**, Bitmap **10**, Komponent **8**, Root 40. DarkWave Release: Shape 267, Overlap 157, Text 95, FontIcon 76, Stack 75, CurvedText 4, Progress 3. Root of DarkWave also has `internal_flows`, `background_bitmap/scroll`, `config_visible`. Per-module optional maps: `internal_events`, `internal_animations`. | corpus |
| F11 | Enum usage that dictates renderer priority (KWGT corpus): `paint_mode`: **CLEAR 374**, XOR 22, SRC 5, DARKEN 3, LIGHTEN 2, MULTIPLY 1. `fx_mask`: **CLIP_NEXT 30, CLIP_ALL 17**. `shape_type`: RECT 749, CIRCLE 400, RTRIANGLE 54, TRIANGLE 33, ARC 24, OVAL 12, PATH 7, SLICE 6, EXAGON 4. `*_rotate_mode`: MANUAL, DEG90/180/270, FLIP_X/Y, **CLOCK_SECOND/MINUTE/HOUR(_SMOOTH)**. `fx_gradient`: VERTICAL 51, BITMAP 33, RADIAL 6, HORIZONTAL 5, SWEEP 4. `progress_mode`: SHAPES (all 58). `text_size_type`: FIXED_WIDTH 47, SINGLE_FIXED_WIDTH 9, FIT_TO_BOX 1. `config_visible` is frequently a formula. | corpus |
| F12 | **Resource references** are `kfile://org.kustom.provider/<path>`; the provider is always the relative one. Paths: `bitmaps/IMG<32 hex>`, `fonts/<name with spaces allowed>`, `icons/<set>.ttf`. **Icon sets also appear in an aliased form** `kfile://org.kustom.provider/{widgets|wallpapers}/<AnyName>.{kwgt|klwp}/icons/<set>.ttf`, where `<AnyName>` is **not** the archive's own file name (e.g. archive `Material3_Expanded_Media_Player.kwgt` references `widgets/Material3_Media_Player.kwgt/icons/material.ttf`; DarkWave references 10 other preset names). The real app clearly resolves these to the archive's own `icons/<set>.ttf`. The resolver must implement tail-matching (section 11.3). | grep over preset.json |
| F13 | `IMG<32 hex>` is **not** md5 or sha1 of the file bytes. The naming rule is unknown. Any stable unique name is assumed acceptable since references resolve by path; confirm on device. | hashes computed |
| F14 | `si()` keys the corpus depends on: `rwidth` (198 uses), `rheight` (102), `mindex` (137, notification index), `darkmode` (70), `darkwp` (13), `syscn1`/`sysca1` (Monet), `pkgname`. `rwidth/rheight` = root size: a global `side = if(si(rwidth)>si(rheight), si(rheight), si(rwidth))` has `max: 720`, which suggests **`rwidth/rheight` are in units where the shorter side is 720** `[INFERRED; verify by rendering]`. | Nothing_Analog_5 |
| F15 | Function frequency over the 41 files (use for implementation order): `gv` 3705, `ce` 573, `si` 538, `tc` 538, `if` 406, `mi` 189, `df` 108, `mu` 85, `ni` 61, `nc` 42, `bi` 38, `bp` 36, `wi` 32, `lv` 30, `ci` 24, `wf` 19, `rm` 14, `ai` 14, `tf` 12, `mq` 10, `br` 9, `tu` 8. Formulas nest heavily, e.g. `$ce(tc(split,gv(pal_+gv(pallist)),"#",4),lum,a0)$` (DarkWave root background) and `br(niagara-launcher, media-player)`. | regex survey |
| F16 | **KWGT README previews are widget-only renders** (no phone frame, no launcher), **RGBA with transparent backgrounds** for most (corner alpha 0; 36–51 % transparent pixels on clocks/master widget; a few are opaque, e.g. `Interstellar_Analog`). Naming: `<Stem>.kwgt.png` (light/default), `<Stem>Dark.kwgt.png` (dark mode: pair of the same preset under `si(darkmode)=1`), `<Stem>_Empty.kwgt.png` (empty state). Case differs for one preset (`material_notification_widget.kwgt` ↔ `Material_Notification_Widget*.kwgt.png`). After case-insensitive matching every preset has ≥1 preview. | `docs/previews` listing |
| F17 | Preview pixel size usually equals `preset_info.width×height` exactly (415×542, 916×542, 918×542, 916×226, 415×226, 667×542, 918×228, 916×1169). **Exceptions** (aspect differs, treat as `sizeMismatch`): `Interstellar_Analog` (png 1080×1333 vs info 916×1169), `Interstellar_Endurance` and `_Analog` (light png 916×1169, dark png 415×529, info 415×542), `Interstellar_Endurance_Analog_2` (895×1169 vs 415×542), `Clean_Time_Date_Info` (829×372 vs 918×542). Render at the **image's** size and report the mismatch. | PNG headers vs `preset_info` |
| F18 | **Embedded thumbnails are a weak visual reference.** The embedded thumb of `Nothing_Analog_5` is a dark-theme render at 784×1024 whose layout differs visibly from its README preview (overlapping rounded shapes, different state). They are produced by the app in an arbitrary state. Use them for sanity only (KWGT) and as the primary pair for KLWP (460×1024 shows the main page of DarkWave convincingly). | viewed images |
| F19 | Observed KWGT `preset_info` sizes cluster into a launcher grid: widths **415 / 667 / 916–918**, heights **226–228 / 542 / 1169** (≈ `w ≈ 250·cols − 85`, `h ≈ 316·rows − 90` for cols 2–4, rows 1–4) `[INFERRED]`. This is the author's launcher, **not** the `70n−30 dp` rule from revision 1. | corpus |
| F20 | DarkWave is a 2-screen KLWP: `width 540, height 1200` (20:9), `xscreens: 1, yscreens: 0`. Root has `background_scroll`, `internal_flows` (Kustom Flows: triggers such as `T_FORMULA`, actions such as `A_DELAY` and formula actions; preserve and edit as structured JSON) and heavy use of globals (`globals_list` with BITMAP/LIST/COLOR entries). 556 KB `preset.json`, 24.6 MB unpacked, 38 zip entries incl. several multi-MB IcoMoon `.json` files. | DarkWave Release |

### 3.5 Remaining unknowns (Phase 0 must resolve or mark as device-loop items)
1. Exact derivation of `features` tokens (F7) and whether the app recomputes them on import.
2. Meaning of `xscreens/yscreens`, `archive`, `hash`, `id`, `ts`, `pflags`; whether the app requires them on import.
3. Whether the app accepts non-WebP thumbs and what sizes it needs (F3). Default: always emit WebP at the sizes in F3.
4. Whether alias `kfile` paths (F12) are resolved by tail match or by scanning all sources; whether new exports should write plain `icons/…` (default) or the alias.
5. `IMG<hash>` derivation (F13), and how the app dedupes bitmaps.
6. Units of `si(rwidth|rheight)` (F14) and how KWGT chooses the unit scale (is it `min(w,h)/720` like KLWP per klwp-viewer, or something else?). Test by rendering Nothing_Analog_5 against its preview.
7. Semantics of `paint_mode: CLEAR/XOR/SRC` and `fx_mask: CLIP_NEXT/CLIP_ALL` (clip to the next sibling / all following siblings?) and in which offscreen buffer CLEAR erases (group vs whole widget). Highest-impact rendering unknown (F11).
8. The 35 anomalous `toggle 10 without formula` entries (F8).
9. What the app does on import failure (message text), to target validator criteria.
10. Komponent import/export details (`komponent.json` root fields, how globals map to exposed settings).

---

## 4. Decisions and assumptions (proceed with defaults, flag in the final report)

| # | Question | Default chosen |
|---|---|---|
| Q1 | Which phone? | Profiles for several phones + **Custom (w×h px, dpi)** + **"From screenshot"** (drop a phone screenshot; read its size). Default 1080×2400 @ 420 dpi (20:9, same ratio as DarkWave's 540×1200). |
| Q2 | Widget grid | Default calibration **"Sample-calibrated"** from F19 (cols 2/3/4 → 415/667/916 px, rows 1/2/4 → 226/542/1169 px, linear interpolation for others). Alternative metric `70·n−30 dp`. Both editable; plus "Use preset's native size" and "Match preview image". User calibrates to their own launcher from a screenshot of one placed widget. |
| Q3 | Framework | **Preact + @preact/signals** + plain CSS. Vanilla TS acceptable if cleanly structured. |
| Q4 | Language | TypeScript (strict). |
| Q5 | Hosting | Static `dist/`; `npm run preview`; PWA/offline. |
| Q6 | KLWP screenshots | Unknown composition (README images may be phone captures, crops or mockups). Classify (18.2) and only use full-screen ones for scoring. |
| Q7 | Komponents | Read/preserve inside presets in v1; standalone `.komp` import/export in Phase 8 (the 1 sample + Clock_01.komp are the test set). |
| Q8 | Browser testing | Antigravity browser if present; else Playwright. |
| Q9 | Thumbnail encoder | `canvas.toBlob('image/webp')` where it really returns WebP; otherwise lazy-load a small WASM WebP encoder (e.g. `@jsquash/webp`, justify in `docs/deps.md`). Node side: `@napi-rs/canvas` / sharp. |

---

## 5. Tech stack and weight budget

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + TypeScript (strict) | Fast, tree-shaking |
| UI | Preact + @preact/signals | Small, reactive |
| Rendering | **Canvas 2D** (OffscreenCanvas where available) | No WebGL/Pixi/Konva; blend modes map to `globalCompositeOperation` |
| ZIP | `fflate` (~8 KB gz) | Small, worker-friendly |
| WebP | native encode, WASM fallback (lazy) | F3 |
| Image diff (dev only) | `pixelmatch` + custom SSIM/edge-F1 | Verification |
| Headless canvas (dev only) | `@napi-rs/canvas` (Skia) | Same renderer in Node |
| Tests | Vitest, Playwright (dev only), fast-check | |
| Size guard | `size-limit` | Budget |
| State | Immutable document + patch history | Cheap undo |
| Persistence | IndexedDB | Offline autosave/assets |
| Fonts | `FontFace` from archive/user files; system fallback; Google Fonts toggle | No bundled proprietary fonts |
| Icons | IcoMoon `.json` + `.ttf` from archive; optional Iconify; UI icons inline SVG | Light |

Runtime deps allowed: `preact`, `@preact/signals`, `fflate` (+ lazy WebP encoder). Anything else needs a written justification with bytes-gz in `docs/deps.md`.

---

## 6. Architecture

```
┌──────────────────────────── browser ────────────────────────────┐
│  UI (Preact): menus · toolbox · layer tree · inspector ·        │
│   formula editor · globals · assets · target picker · Sim panel │
│          │ commands                         ▲ signals           │
│          ▼                                  │                   │
│  Editor core (pure TS, no DOM)  ────────────┘                   │
│   Document model ── History (patches) ── Selection             │
│   Spec registry (module/property/enum/default tables)           │
│   Formula engine (parse → eval, sim providers)                  │
│   Layout engine (units, anchors, padding, stacks)               │
│   Renderer (Canvas2D painter, blend/clip, caches, dirty rects)  │
│   Archive IO (zip ⇄ document, kfile resolver, thumbs, komp)     │
│   Validator + Fixers · Verifier (round-trip, thumb/preview diff)│
└─────────────────────────────────────────────────────────────────┘
        same core runs in Node for tests and the `kweb` CLI
```
Rules:
- **Core has no DOM dependency**; rendering takes a canvas-like interface so Node and browser share it.
- **Lossless model.** Unknown keys/types/enum values and inactive (`toggle 0`) formula/global entries are preserved verbatim and re-emitted.
- **Spec-driven.** Module types, property keys, types, enums, defaults and UI grouping come from generated `spec/*.json`.
- **Deterministic export.** Same document → byte-identical ZIP (stable order, fixed timestamps unless matching the original).

---

## 7. Repository layout

```
/ (project root, contains plan.md)
├─ plan.md
├─ samples/
│  ├─ _src/                  # READ-ONLY clones + downloads (kwgt-widgets/, darkwave/, darkwave-shots/)
│  ├─ extra/                 # files extracted from darkwave.apk (Clock_01.kwgt/.komp)
│  ├─ iconpacks/             # unzipped icon packs
│  ├─ sources.json           # repo URLs + pinned SHAs + download status per screenshot
│  └─ manifest.json          # generated pairing (8.2)
├─ reference/
│  ├─ klwp-viewer/           # READ-ONLY clone, gitignored, reference only
│  └─ decompiled/            # optional, gitignored, never shipped
├─ spec/                     # GENERATED, committed: modules.json, enums.json, defaults.json, functions.json, archive-layout.json, provenance.json
├─ docs/  (refs/, spec-corrections.md, verification-log.md, render-notes.md, deps.md, device-findings.md)
├─ tools/ (fetch-samples.mjs, inventory.mjs, spec-extract/, verify/)
├─ src/
│  ├─ core/ { model, spec, archive, formula (functions/, sim/), layout, render, validate, verify }
│  ├─ ui/   targets/ (device-profiles.json, widget-sizes.ts)   main.tsx
├─ tests/ { unit, integration, e2e, baselines }
├─ reports/                  # generated HTML/JSON + diff heatmaps (gitignored)
└─ vite.config.ts  tsconfig.json  package.json  NOTICE
```
Scripts: `fetch`, `inventory`, `spec:extract`, `dev`, `build`, `preview`, `test`, `test:e2e`, `verify`, `verify:struct`, `verify:visual`, `verify:export`, `size`, `kweb`.

---

## 8. Phase 0: fetch, recon, spec extraction (do this first, in depth)

### 8.1 Fetch and inventory
1. Run `tools/fetch-samples.mjs` (3.2). Report which screenshots downloaded.
2. `tools/inventory.mjs`: glob project root + `samples/` for `*.klwp *.kwgt *.komp`, images, and decompiled-app directories. For each preset: unzip to `.work/extracted/<name>/`, print every zip entry (name, size, method, CRC, date, order), print `preset_info` verbatim, module counts per `internal_type`, distinct property keys per type, toggle/formula/global statistics, kfile references (and which resolve), globals, thumbnail format + size, `release`, `features`.
3. For each image: pixel size, aspect, alpha coverage (transparent fraction, corner alpha), dominant layout guess → `kind` ∈ {`widget-only`, `phone-fullscreen`, `phone-mockup`, `crop`, `unknown`}.
4. **Cross-check the baseline numbers in section 3.4** (40 KWGT, 69 previews, counts F10/F11, toggles F8). Any difference means the repo changed; update the plan facts in `docs/spec-corrections.md`.

### 8.2 `samples/manifest.json` (generated; user-editable)
```json
{
  "version": 2,
  "samples": [{
    "id": "Nothing_Analog_5",
    "preset": "samples/_src/kwgt-widgets/widgets/Nothing_Analog_5.kwgt",
    "type": "kwgt",
    "info": { "width": 415, "height": 542, "release": 377435216 },
    "previews": [
      { "path": ".../docs/previews/Nothing_Analog_5.kwgt.png",     "variant": "light", "size": [415,542], "alpha": true,  "kind": "widget-only", "sim": { "darkmode": 0 } },
      { "path": ".../docs/previews/Nothing_Analog_5Dark.kwgt.png", "variant": "dark",  "size": [415,542], "alpha": true,  "kind": "widget-only", "sim": { "darkmode": 1 } }
    ],
    "sizeMismatch": false,
    "timeDependent": true,
    "expect": { "canvas": { "kind": "widget", "w": 415, "h": 542 } }
  }],
  "unpaired": { "presets": [], "images": [] }
}
```
Pairing rules (App. F): case-insensitive; `<stem>.kwgt.png` = light, `<stem>Dark.kwgt.png` = dark, `<stem>_Empty.kwgt.png` = empty state; list any preview matching no preset under `unpaired.images` (expect none after case-folding). KLWP samples pair to their own embedded thumbs and (when downloaded) to the README images with `kind` classification; **README images are not tied to a specific DarkWave file**, so attach them to the "DarkWave family" and score against both files, keeping the better (record which).

### 8.3 Corpus report (`docs/corpus-report.md`)
Reproduce and extend F1–F20 with full tables: per-sample zip layout, `preset_info`, root keys, module counts, property key frequency per type, value formats (colours, floats, enums, bools), formula/global/toggle statistics, kfile resolution rate (exact / alias-tail / missing), globals by type, function and `si()` key frequency, thumbnails (format, size), `release`/`features` per file.

### 8.4 Decompiled-app / viewer mining (`tools/spec-extract/`)
If a decompiled app is present, mine it using **string constants as anchors** (names are obfuscated and change per build; klwp-viewer lists classes for build 382 as hints only): `preset.json`, `preset_thumb`, `preset_info`, `preset_root`, `internal_type/toggles/formulas/globals/events/animations/flows`, `globals_list`, `global_formula`, `viewgroup_items`, `config_`, `kfile://`, `org.kustom.provider`, `bitmaps/`, `fonts/`, `icons/`, `.klwp/.kwgt/.komp`, `ZipEntry`, `ZipOutputStream`, enum classes (names + serialized names), module spec classes (defaults near declarations), the formula parser and function registry, and especially the **render semantics for the F11 items** (blend modes, clip masks, rotation, unit scale, text sizing, stacking). Also the export/import code paths (key order, release/features computation, thumbnails: size, WebP quality), and the `KUSTOMCLIP` codec.
Without a decompile, build `spec/*.json` from: (a) samples (authoritative for keys, value formats and what the real app writes), (b) klwp-viewer's `schema.ts`/`reference.md` as a **hint source for enums/defaults** (cross-check every entry on a sample or mark `viewer-only`), (c) docs. Mark everything not seen in a sample or decompile as `hypothesis`.
Outputs: `spec/archive-layout.json, modules.json, enums.json, defaults.json, functions.json, render-semantics.md, provenance.json`.
Cross-check each fact on ≥1 sample; if both disagree, the sample wins.

### 8.5 Phase 0 exit criteria
- `samples/manifest.json` generated and reviewed; ambiguities listed.
- `docs/corpus-report.md` reproduces section 3.4 numbers.
- Every item in 3.5 is answered with provenance **or** explicitly queued for the device loop.
- `spec/*.json` loads through a typed loader with unit tests.

---

## 9. File format specification (verified on samples)

### 9.1 Archive
See F1–F3, F12. Writer rules for export:
```
<name>.kwgt | .klwp           (ZIP, deflate, no directory entries)
 1 preset.json
 2 preset_thumb_portrait.jpg  (WebP bytes)
 3 preset_thumb_landscape.jpg (WebP bytes)
 4.. icons/<set>.ttf, icons/<set>.json, fonts/<file>, bitmaps/IMG<32hex>   (only referenced assets)
<name>.komp: komponent.json, komponent_thumb.jpg (WebP), assets
```

### 9.2 `preset.json` shape (real excerpt from `Nothing_Analog_5.kwgt`, trimmed)
```jsonc
{
  "preset_info": { "archive": null, "author": "…", "description": "", "email": "…",
    "features": "ANALOG_CLOCK", "pflags": 0, "height": 542, "locked": false,
    "release": 377435216, "title": "NothingAnalog5", "version": 13,
    "width": 415, "xscreens": 0, "yscreens": 0 },
  "preset_root": {
    "internal_type": "RootLayerModule",
    "globals_list": {
      "side": { "index": 5, "type": "NUMBER", "title": "side", "min": 0, "max": 720, "toggles": 10,
                "global_formula": "$if(si(rwidth)>si(rheight), si(rheight), si(rwidth))$" },
      "bg":   { "index": 6, "type": "COLOR", "title": "bg", "toggles": 10,
                "global_formula": "$if(si(darkmode)=0, #FFFFFFFF, #FF1B1B1D)$" },
      "primary": { "index": 8, "type": "COLOR", "title": "primary", "value": "#FFD71921" }
    },
    "viewgroup_items": [
      { "internal_type": "ShapeModule", "internal_title": "Bg",
        "internal_toggles": { "shape_width": 100, "shape_height": 100, "paint_color": 100, "shape_corners": 10 },
        "internal_globals": { "shape_width": "side", "shape_height": "side", "paint_color": "bg" },
        "internal_formulas": { "shape_corners": "$gv(side)/4$" },
        "shape_type": "RECT" }
    ]
  }
}
```
(Excerpt shape is exact; values abbreviated. Regenerate with the inventory.)

### 9.3 Writer rules
- Per-module/per-info **key order = the app's serializer order**, learned from the newest-release samples by merging observed orders; ordering is a **soft** check because the app parses by key (verify on device; do not make it a hard gate).
- Omit default-valued properties exactly as the app does (needs `defaults.json`; presets omit every default per klwp-viewer and the samples).
- Numbers: floats with `.0` where the app writes them; integers elsewhere (per property type in the spec).
- Colours: `#AARRGGBB` uppercase.
- `preset_info`: write the **newest-generation** field set (F5) with `release` = the user's app build (setting, default 377435216 = 3.77b435216, never above the user's installed app), `version` 13, `features` recomputed (F7), `width/height` from the target (KWGT: widget px; KLWP: preset reference size, default 540×(540·h/w)), `xscreens/yscreens` from the scroll setup.

---

## 10. Document model

```ts
type Doc = {
  kind: 'klwp' | 'kwgt' | 'komp';
  info: PresetInfo;                 // preset_info (typed + extras)
  root: GroupNode;                  // preset_root
  globals: GlobalDef[];             // globals_list (ordered by `index`)
  assets: AssetStore;               // by logical archive path
  thumbs?: { portrait?: Blob; landscape?: Blob };
  extras: Record<string, unknown>;  // unknown top-level keys
  target: CanvasTarget;             // editor state (frame / widget size)
};

type Node = {
  id: string; type: string; title: string;        // internal_type open set
  props: Record<string, Prop>;                    // spec-known
  extras: Record<string, unknown>;                // unknown keys, preserved
  children?: Node[];                              // viewgroup_items
  events?: unknown[]; animations?: unknown[]; flows?: unknown[];  // preserved, edited by dedicated UIs
};

// Mirrors F8 exactly so stale entries survive round-trip:
type Prop = {
  value?: unknown;          // literal (absent = default)
  formula?: string;         // internal_formulas[key]
  global?: string;          // internal_globals[key] (may be "folder/name")
  toggle?: number;          // internal_toggles[key]: 0 value, 10 formula, 100 global; preserve unknown ints
};
```
- Active source = `toggle` (0/10/100); default `0` when missing. Switching mode in the UI changes `toggle` only; it never deletes the other stored sources (the app keeps them).
- Patches `{path, before, after}`, coalesced; structural sharing. Selection: multi, group-select, marquee, click-through cycling; editor-only lock/hide kept in a sidecar.

---

## 11. Archive I/O

### 11.1 Import
1. Open ZIP with `fflate`; locate `preset.json` (or `komponent.json`); detect `kind` by extension and root type; an APK is accepted as a **pack** (list `assets/{wallpapers,widgets,komponents}/*` and let the user pick one).
2. Parse JSON preserving number lexemes where needed (`22.0`), key order and unknown keys.
3. Locked (`internal_readonly`): refuse with a clear message (thumbnail view only).
4. Load assets lazily; **do not eagerly parse multi-MB IcoMoon `.json` files** (DarkWave has several up to 3.4 MB): parse in a worker, and build only a `glyphName → codepoint` map on first use.
5. Resolve every `kfile://` via the resolver (11.3); report exact / alias / missing counts.
6. Run `validate()` + **Import Health** (18.5) and show a status chip.

### 11.2 Export
1. `sanitize(doc)` (fixers, 18.3) and write `preset.json` per 9.3.
2. Render thumbnails at the F3 sizes with the shared renderer; encode **WebP**, name `*.jpg`.
3. Prune unreferenced assets; write references as `kfile://org.kustom.provider/<folder>/<file>` (plain form), never an absolute provider.
4. Write the ZIP in the entry order of 9.1, deflate, fixed timestamps.
5. **Re-open the bytes we just wrote** and run L1–L4 on them, not on the in-memory model.
6. Offer `<title>.klwp|.kwgt|.komp` for download plus an optional export report.

### 11.3 `kfile` resolver (verified need, F12)
```
resolve(url, archive):
  provider must be org.kustom.provider (otherwise warn "absolute provider")
  path = url.path
  strip leading  (wallpapers|widgets|komponents)/<anything>.(klwp|kwgt|komp)/   ← alias form
  candidates in order: exact path in archive → case-insensitive → same folder + basename
  fonts/icons/bitmaps only; return the archive entry or MISSING
```
- MISSING → placeholder + warning (fonts: system fallback and flag "fallback font used"). Phase 0 reports the real missing rate in DarkWave (stale alias names exist there).
- On **untouched imports keep the original string** (lossless). Only rewrite when the user adds/replaces an asset or runs "Normalize resource paths".

### 11.4 Assets
- Bitmaps PNG/JPG/WebP (keep original bytes unless "optimise"); SVG for KWGT (`bitmap_mode: VECTOR`, docs state SVG support) — confirm KLWP support before allowing there.
- Fonts TTF/OTF via `FontFace`; names may contain spaces (`fonts/Golden Girdle.otf`).
- Icon sets: `icons/<set>.ttf` **paired** with `icons/<set>.json` (IcoMoon); the icon pack zips in `samples/iconpacks/` are the test fixtures; optional Iconify.
- New bitmaps get `IMG` + 32 hex of a content hash (naming unknown, F13); dedupe by hash.

---

## 12. Formula engine

Goal: evaluate `$…$` for preview and lint formulas before export.

### 12.1 Grammar (docs + viewer notes + corpus; confirm in decompiled parser if present)
- Literal text outside `$…$`; `$$` is a dollar sign `[viewer]`.
- Inside: numbers, bare words (no quotes needed; quote text with commas/brackets), `#name` locals, function calls `xx(a, b, …)`.
- Operators (low→high precedence per viewer): `& |` ; `= != < <= > >= ~=` (regex match); `+ -` ; `* / %` ; `^` ; unary `-`. Comparisons give 1/0; `=` compares case-insensitively; operators on non-numbers join text (`$a + b$` → `ab`); numbers print without trailing zeros (floored to 5 decimals) `[viewer; verify]`.
- `if(c1, v1, c2, v2, …, else)`: condition true unless empty or `0`.
- Local variables: `lv(name, value)` / `#name`; globals evaluate with the parent's locals visible (kodeine notes). `gv()` can take computed names (`gv(pal_+gv(pallist))`).
- BBCode in text modules.

### 12.2 Implementation
Tokenizer → Pratt parser → AST with source positions; evaluator with an environment (`now`, locale, tz, globals, locals stack, sim providers); registry from `spec/functions.json` with lazy per-family modules; result typing/coercion to the property type with the app's error text; deterministic mode for tests.

### 12.3 Coverage tiers (ordered by corpus frequency, F15)
| Tier | Functions | Preview behaviour |
|---|---|---|
| T1 exact | `gv`, `ce`, `si`, `tc`, `if`, `df`, `mu`, `lv`, `tf`, `cm`, `fl`, `dp` | Full implementation. `ce` (colour editor: `lum`, `a0` …) and `tc` (split/cut/…) are heavy in DarkWave and the Material/Nothing palettes. |
| T2 simulated | `mi` (music), `bi`, `wi`, `wf`, `ai`, `ci`, `rm`, `mq`, `nc`, `ni`, `bp` (bitmap palette: derive from the sim cover image with a small median-cut), `aq`, `li`, `uc`, `fd`, `ts`, `tu`, `gh` | Sim panel supplies values; unknown subfunctions return the app's "unavailable" value |
| T3 placeholder | `sh`, `wg`, `br` (e.g. `br(niagara-launcher, media-player)`), `cd` | User-supplied mock per call site; lint only |

`si()` keys to provide: `rwidth`, `rheight`, `darkmode`, `darkwp`, `mindex`, `pkgname`, `sysca1–3` and `syscn1–2` (Monet accent/neutral; the corpus uses `sysca1` and `syscn1`, confirm the full key list in the docs' dynamic-colours page), `visible`, `screen`, `land`, `locked` (+ the docs' list).
Each function gets table-driven tests from its docs page and from **formulas harvested from the 41 samples**.

### 12.4 Editor affordances
Highlighting, bracket matching, autocomplete with signatures, live result line, error squiggles, "insert global", dependency graph for incremental re-evaluation.

---

## 13. Layout and rendering

### 13.1 Units `[viewer; verify on KWGT]`
KLWP: one unit = `min(screen w, h) / 720` px, multiplied by each ancestor layer's `config_scale_value`%. Test on KWGT by rendering Nothing_Analog_5 (F14); if `si(rwidth|rheight)` are in units, the shorter side is 720 there too, and KWGT root also has `config_scale_value`.

### 13.2 Layout pass (when dirty)
Resolve props (toggle → formula/global/value) → measure (text incl. `text_size_type` modes FIXED_WIDTH / SINGLE_FIXED_WIDTH / FIT_TO_BOX, shapes, bitmaps, font icons, progress, curved text; Overlap = wrap; Stack = sequential with `config_margin` and the six `config_stacking` modes; Komponent = overlap) → position (anchor relative to the group, 4-side padding, offsets only for root children, rotation incl. CLOCK_* modes, scale, tiling for wallpaper-root overlap groups) → flat **display list** with transforms, clips, alpha, blend, masks, effects.

### 13.3 Painter (Canvas 2D), in order of corpus impact
1. **Shapes** (F11): RECT, CIRCLE, RTRIANGLE, TRIANGLE, ARC, OVAL, PATH (SVG path data), SLICE, EXAGON; fill/stroke; corners.
2. **Blend modes** as `globalCompositeOperation`: `CLEAR`→`destination-out`, `XOR`→`xor`, `SRC`→`copy`, DARKEN/LIGHTEN/MULTIPLY/OVERLAY/SCREEN/ADD. **Where CLEAR erases** (group buffer vs whole widget) is unknown (3.5 #7): each group that contains a non-NORMAL `paint_mode` or an `fx_mask` renders into its own offscreen buffer; calibrate against the Nothing_* previews and record the rule in `docs/render-notes.md`.
3. **Masks**: `fx_mask` CLIP_NEXT / CLIP_ALL first; then BACKGROUND, BLURRED, LIQUID_GLASS if samples need them.
4. **Gradients** (VERTICAL, HORIZONTAL, RADIAL, SWEEP via conic gradient, BITMAP with FIT_CENTER/REPEAT/MIRROR) on shapes, text and icons.
5. **Text**: fonts from the archive; BBCode; shadows; alignment; letter spacing; line limits; fallback fonts flagged. **Font Icon**: glyph via codepoint from the IcoMoon json.
6. **Progress** (`progress_mode: SHAPES`, `style_shape` RECT/SQUARE, `style_style` CIRCLE) and **Curved text**.
7. **Bitmap**: fit modes, tint/filter (CONTRAST, DESATURATE …), alpha, blur, rounded masks, `$mi(cover)$` / `$ni(mi(package), icon)$` sources (sim placeholder images).
8. **Effects**: shadow/glow, long shadow, filters. **Animations**: rule-based, loops (`LOOP_FW/2W` with duration in tenths of a second, epoch-aligned), scroll animation tied to the multi-screen slider (klwp-viewer reference.md documents the math; verify). Flows/touch/events are stored and shown, never executed.
- Caches: group offscreen bitmaps with dirty flags, text-measure cache, resolved-prop cache; one rAF loop; worker/OffscreenCanvas only if frame time exceeds budget.

### 13.4 Interaction overlays (not exported)
Selection boxes, anchors/padding guides, hit-test over the display list with click-through cycling, snapping, rulers, guides, grid, outlines, touch-area overlay.

---

## 14. Module catalogue and property mapping

Generate the module/property tables from the spec (never hand-write): per module type, properties grouped as Kustom groups them (Position, Paint, FX, Layer, Animation, Touch …) with key, type, default, enum values, formula-capable flag, UI control, provenance.
**MVP modules (Phase 5):** Overlap, Stack, Shape, Text, Font Icon, Progress (SHAPES), Bitmap. **Phase 4b/8:** CurvedText, Komponent (editable + opaque), Series, Movie (static) as found. Order driven by F10: Shape › Stack › Overlap › Text › Progress › FontIcon › CurvedText › Bitmap › Komponent.
Inspector controls: number (slider + numeric + formula toggle), enum, bool, colour (swatch + hex + alpha + eyedropper + `ce/cm` helper), formula (multi-line editor), font/bitmap/icon pickers, anchor 3×3, padding ×4, offset. **Every property has the real three-way source switch (value / formula / global) = `toggle` 0/10/100**; switching converts sensibly and never discards stored alternates.
Globals panel: create/edit/reorder by `index`, types per F9, folders (`folder/name`), "used by" back-references, unused-global lint, global formula editor, KLWP `LIST` entries.
Touch/events/animations/flows: stored and editable as structured JSON in dedicated panels (never executed).

---

## 15. Canvas targets

### 15.1 KLWP: phone frames
```jsonc
[
  { "id": "pixel-8",     "name": "Pixel 8",        "w": 1080, "h": 2400, "dpi": 420, "statusDp": 24, "navMode": "gesture", "navDp": 24, "cornerDp": 40, "cutout": "punch-center" },
  { "id": "pixel-8-pro", "name": "Pixel 8 Pro",    "w": 1344, "h": 2992, "dpi": 489, "statusDp": 24, "navMode": "gesture", "navDp": 24, "cornerDp": 40, "cutout": "punch-center" },
  { "id": "galaxy-s24",  "name": "Galaxy S24",     "w": 1080, "h": 2340, "dpi": 480, "statusDp": 24, "navMode": "gesture", "navDp": 24, "cornerDp": 40, "cutout": "punch-center" },
  { "id": "small-1080p", "name": "Small 1080×1920","w": 1080, "h": 1920, "dpi": 440, "statusDp": 24, "navMode": "3button", "navDp": 48, "cornerDp": 0,  "cutout": "none" },
  { "id": "tablet-10",   "name": "Tablet 10\"",    "w": 1600, "h": 2560, "dpi": 320, "statusDp": 24, "navMode": "gesture", "navDp": 24, "cornerDp": 16, "cutout": "none" },
  { "id": "darkwave-ref","name": "Preset reference 540×1200 (20:9)", "w": 540, "h": 1200, "dpi": 240 },
  { "id": "custom",      "name": "Custom", "w": 1080, "h": 2400, "dpi": 420 }
]
```
Values are editable defaults; confirm against the user's phone. Frame chrome (rounded corners, cutout, status/nav bars, safe area, **home-grid overlay**), portrait/landscape toggle, **multi-screen scroll**: `xscreens` (+1 = number of screens; DarkWave `xscreens: 1` → 2 screens) with a scroll slider that drives scroll animations and shows the viewport over the wider canvas; preview-only wallpaper backdrop; "From screenshot" size detection with optional semi-transparent underlay.

### 15.2 KWGT: widget sizes (no phone frame)
Presets: **1x1, 2x1, 2x2, 3x1, 3x2, 3x3, 4x1, 4x2, 4x3, 4x4, 5x1, 5x2, 5x5, Custom, "Preset native (w×h from `preset_info`)", "Match preview image"**. Default metric = sample-calibrated (Q2, F19); alternates `70n−30 dp` (Appendix B). Writes `preset_info.width/height`.
- Cell-grid overlay; transparent checker, light, dark, wallpaper backdrops (preview-only) and a **dark-mode toggle that drives `si(darkmode)`** (the corpus ships light/dark pairs, F16).
- Resizable preview (drag handles) to test reflow: widgets like Interstellar_Analog_Khaki… advertise "resizable, no scaling". Multi-size side-by-side preview.
- Calibration from a screenshot of one placed widget.

---

## 16. Editor UI (Photopea-like, lightweight)

### 16.1 Layout
Top bar (File: New KLWP/KWGT/Komponent, Open, Recent, Save project, Export, Export report, Copy modules to phone · Edit · Add · View · Target · Help). Left toolbox (V select, H hand, Z zoom, T text, U shape, I image, G icon). Left tabs: Layers, Globals, Assets. Centre canvas with rulers, zoom 10–800 %, pan, fit, frame/widget chrome, floating bar (zoom, target, time/dark toggles). Right: Inspector tabs mirroring Kustom + collapsible **Simulation** panel. Bottom drawer: formula editor + **Problems** panel (validation/lint, click-to-select) + **Compare** (blink/slider/diff against the matched preview or thumbnail).

### 16.2 Interactions
Drag/resize/rotate; arrows nudge (Shift ×10); Alt-drag duplicate; Ctrl+D/G/Shift+G; layer-tree drag reorder/reparent; Delete; F2 rename; H hide; L lock; undo/redo with history panel; autosave to IndexedDB with crash recovery; drag-and-drop presets/assets; in-app copy/paste of modules; `KUSTOMCLIP` import/export (Phase 8, limits per docs: no bitmaps/fonts/globals).

### 16.3 UX bars
First paint < 1 s; layer tree virtualised > ~300 rows (DarkWave has ~700 modules); keyboard accessible; dark theme default; destructive actions undoable; originals never mutated.

---

## 17. Simulated environment ("Sim")

`SimState`: `now` (live/frozen/scrub), tz, locale, **`darkmode`, `darkwp`**, root size (`rwidth/rheight` derived from the target, F14), battery %/charging, network, RAM/storage, weather (cond/temp/hi-lo/forecast arrays), astronomy (computed from lat/long), music (title/artist/album/cover placeholder/state/position, package), calendar events, unread counts, **notifications list incl. `mindex` semantics** (DarkWave/material_notification widgets), steps, Monet seeds (`sysca*`, `syscn*`), screen on, `pkgname`. Named profiles (Morning, Night, Low battery, Rainy, Empty-notifications) saved in IndexedDB. Each sample's manifest `sim` (e.g. `darkmode: 1` for `…Dark.kwgt.png`) becomes a profile used by verification. Unsupported providers return the app's empty/fallback value and are listed in Problems as "simulated".

---

## 18. Verification, import checking and auto-fix (core requirement)

Since the agent cannot run Android, "imports correctly" is proven by a **layered proxy** and finally confirmed on the phone (section 19).

### 18.1 Layers
| Layer | What it proves | Pass condition |
|---|---|---|
| L1 **Lossless round-trip** | parse → model → serialise reproduces the original | For all 41+ presets: canonical-JSON equality of `preset.json` (key-order-insensitive) **and** identical strict key order when untouched; unknown keys, inactive formulas/globals, toggles, asset bytes preserved |
| L2 **Archive layout** | our ZIP looks like the app's | Entry names/order/method/no dir entries; thumbnails are **WebP at the F3 sizes**; referenced assets only; plain `kfile` provider |
| L3 **Schema** | `preset.json` satisfies the spec | Zero errors; warnings only if in `allowlist.json` with reasons (e.g. the 35 anomalous toggles) |
| L4 **Formula health** | every formula parses/evaluates under Sim | Zero parse errors; evaluation errors only where the sample itself has them |
| L5 **Thumbnail check** | renderer ≈ embedded thumb | **KLWP:** SSIM + colour-histogram vs 460×1024 thumb (single page). **KWGT: informational only** (F18: thumbs are weak); report score, do not gate |
| L6 **Screenshot parity** | renderer ≈ real screenshots | **KWGT:** vs README previews (18.2). **KLWP:** vs downloaded README images that classify as full-screen captures (18.2) |
| L7 **Export-from-editor parity** | files we create look like app-created ones | Property key sets ⊆ known; value formats/types per F4; defaults omitted; `preset_info` plausible (F5–F7); passes L2/L3 |
| L8 **Device loop** | the real app imports it | Section 19 |

### 18.2 L6 in detail
**KWGT (primary visual ground truth: 69 previews).** For each preview, using the manifest `sim`:
1. Render the preset at the **preview's pixel size** with transparency preserved. If aspect ≠ `preset_info` (F17), still render at the image size and log `sizeMismatch`.
2. **Time solver** for `timeDependent` presets (uses `df`, `tf`, `ai`, or any `CLOCK_*` rotate mode): search the time of day (coarse 1-minute grid over 12 h on a downscaled render, then refine seconds if `CLOCK_SECOND*`) minimising error; record the solved time in `sim`. Light/dark pairs may share the time but not necessarily.
3. **Volatile-pixel mask** by differential rendering: re-render with perturbed sim (time ±, battery, music metadata/cover, weather, notifications); pixels that change are volatile and excluded from scoring; report masked %. If masked > 35 % flag **low confidence**.
4. **Alpha-aware metrics:** alpha IoU; mean RGB error on mutually-opaque pixels; luma SSIM; edge-map F1 (robust to font differences); also composite both over black and white to expose edge-fringe/alpha mistakes.
5. **Ratchet, don't guess thresholds:** first run records per-sample baselines in `tests/baselines/*.json` and reports distribution; thereafter a sample fails on regression (> 2 % worse than baseline) or on a **hard floor** (alpha IoU < 0.80 on non-volatile pixels). Raise floors as the renderer improves; every change is logged.
6. Output: side-by-side, blink GIF, signed diff heat-map, per-module bbox suspects (`reports/`).
7. Order work by corpus impact: start with the pure-shape clocks (`Nothing_Analog*`, `Nothing_Digital*`), then Battery/CPU/Date widgets, then media players (need `mi`, `bp`, bitmap sources), then Master widget, Interstellar (bitmap-heavy, size mismatch).

**KLWP.** DarkWave has no screenshots in the repo. After the optional download (3.2): classify each image by size/aspect → `phone-fullscreen` (aspect within ±3 % of 9:20), `crop`, `mockup`, `ui`. Only `phone-fullscreen` is scored (looser floors; time/weather/music masked via the volatile mask; compare against both Release and PreRelease, keep the better). Others appear in the Compare panel for human review. **If none downloaded, KLWP visual verification reduces to L5 (thumbs) + the device loop** — say so in the report; do not fake a pass.

### 18.3 Auto-fix ("fixers")
Deterministic, idempotent, ordered, id'd, tested; run in `sanitize()` before export and as "Fix all" in Problems. Every applied fix is listed in the export report; untouched imports are never silently changed.
| Fixer | Trigger | Action |
|---|---|---|
| F-info-missing | `preset_info` lacks fields | Fill newest-generation set (F5) from title/target |
| F-info-dims | size ≠ target | Recompute width/height/xscreens/yscreens |
| F-release | `release` newer than the user's app (setting) or missing | Set to the user's app build |
| F-features | `features` ≠ derived tokens | Recompute (rule from Phase 0, F7) |
| F-color-format | not `#AARRGGBB` | Normalise (`#RGB`, `#RRGGBB`, lowercase) |
| F-number-format | int/float mismatch per spec | Coerce (`22` → `22.0` where the app writes floats) |
| F-enum-invalid | unknown enum for a known property | Map known aliases; else default + warn |
| F-default-omit | default-valued property present | Remove (mirrors app) |
| F-toggle-orphan | toggle 10/100 without formula/global | Warn; set toggle 0 only if the user opts in (35 anomalies exist in the corpus, keep on import) |
| F-key-order | order differs (soft) | Reorder to the learned canonical order |
| F-kfile-provider | absolute provider | Rewrite to `kfile://org.kustom.provider/…` |
| F-kfile-alias | alias path to a non-existent preset name | Report; rewrite to plain `icons/…` only on "Normalize resource paths" |
| F-asset-missing | reference to non-existent asset | Warn; optional drop-to-default |
| F-asset-unused | unreferenced asset | Prune |
| F-asset-name | illegal/duplicate name | Sanitise/dedupe, rewrite references |
| F-icon-pair | `icons/x.ttf` without `icons/x.json` (or vice versa) | Warn (cannot invent glyph names) |
| F-thumb-format | thumbs missing, wrong format or size | Regenerate as WebP at F3 sizes |
| F-zip-layout | order/method/dir entries differ | Rewrite archive |
| F-global-dup | duplicate global names | Rename + rewrite `gv()` refs and `internal_globals` |
| F-global-orphan-ref | `gv(x)` / `internal_globals` → missing global | Warn / offer create |
| F-global-index | duplicate/gapped `index` | Renumber |
| F-id-dup | duplicate `internal_id`/`id` | Regenerate |
| F-formula-syntax | unbalanced `$`/parentheses | Report with location; auto-fix only unambiguous cases |

### 18.4 Agent-time fix loop
```
iteration = 0
while iteration < 25:
    run `npm run verify` → reports/summary.json
    if no hard failures: break
    classify failures → STRUCT_LOSS | SCHEMA | ZIP_LAYOUT | FORMULA | RENDER_DIFF | EXPORT_STYLE
    apply the smallest change that fixes the most failures (playbook below)
    append notes to docs/verification-log.md
    if no improvement in 3 consecutive iterations: stop, write a diagnosis, ask the user
    iteration += 1
```
| Class | Typical cause | Action |
|---|---|---|
| STRUCT_LOSS | dropped key, lost stale formula/global, number lexeme, order | Preserve in model/extras; fix serializer; regression test |
| SCHEMA | missing spec entry, wrong enum/default | Re-mine samples/decompile; update `spec/` + provenance |
| ZIP_LAYOUT | order/method/names/thumb format | Fix `archive-layout.json` + writer |
| FORMULA | unimplemented fn/operator, coercion, `gv` with computed names | Read docs page + parser; implement; doc-derived tests |
| RENDER_DIFF | unit scale, anchor/padding, text metrics, font fallback, **CLEAR/CLIP semantics**, gradients, z-order | Heat-map → isolate module → render alone vs preview crop → fix → re-run; keep per-module calibration notes in `docs/render-notes.md` |
| EXPORT_STYLE | editor output differs from corpus norms | Adjust serializer defaults; add scenario coverage |

Never "fix" by loosening a floor or special-casing a sample; floor changes need a written reason in the log.

### 18.5 In-app Import Health (runtime)
On import: L1 (in-memory), L3, L4, resolver stats, plus a comparison against the **matching reference** when available: the embedded thumb (KLWP) or, for the bundled-sample gallery, the README preview. Chip + panel:
✓ lossless parse (N unknown/stale entries preserved) · ✓/⚠ schema · ✓/⚠ formula errors · ✓/⚠ resource resolution (exact/alias/missing, fallback fonts) · similarity % with diff overlay toggle (when a reference exists). This tells the user how far to trust the preview for that file.

### 18.6 Pre-export gate
Block on hard errors (invalid JSON, unfixable missing required fields, unresolved asset refs the user hasn't decided on); allow with warnings. After writing the ZIP, re-open it and re-run L2/L3/L4 on the bytes; do not offer the download if any fails.

---

## 19. Device round-trip loop (closing the gap to real import)

1. **Device Test Pack** (Help → Generate): tiny presets, one per feature (each shape type, `CLEAR`/`XOR` blend, `CLIP_NEXT/ALL`, gradients, text size modes, font icon, progress, curved text, stack/overlap, komponent, globals (value/formula/global toggles), formula families, rotation CLOCK_* modes, animations, KWGT sizes incl. dark mode), each with an expected render and an instruction card.
2. User imports each in the real app (their paid import) and screenshots.
3. **Screenshot drop-zone** matches screenshots to expected renders, runs L6, shows per-feature pass/fail; failures append to `docs/device-findings.md` (answering the 3.5 unknowns, especially #3, #4, #7).
4. A form records **app import errors** (toast text) against the file hash.
5. Import instructions in the export dialog: transfer to the phone (cloud drive, USB, `adb push`, or LAN link/QR from `npm run preview`) then use the app's own preset load/import flow (the KWGT-Widgets README documents `Kwgt/Kustom/widgets` and `Kwgt/Kustom/fonts` as the folders and "Load Preset" as the entry; confirm menu names in app strings if a decompile exists).
6. Optional "Send to phone" helper: LAN URL + tiny QR.

---

## 20. Performance and weight budgets (`npm run size`, perf tests)

| Metric | Budget |
|---|---|
| Initial JS (gz) | ≤ 120 KB (shell + core + MVP modules); formula families, icon sets, WebP WASM, verification UI lazy |
| Initial CSS (gz) | ≤ 15 KB |
| First meaningful paint | < 1.5 s cold, < 0.5 s warm (service worker) |
| Interaction frame | ≤ 16 ms at 200 modules; usable at DarkWave scale (~700 modules, 267 shapes) |
| Memory | < 300 MB with the 12 MB / 24.6 MB-unpacked DarkWave archive open |
| Import | < 1.5 s for DarkWave Release (icon `.json` parsed lazily in a worker) |
| Export | < 2 s typical incl. thumbnails |
Techniques: dirty-region rendering, group caches, text-measure cache, debounced formula re-eval, `requestIdleCallback` validation, `createImageBitmap`, workers for zip/validation/diff, no CSS framework, inline SVG UI icons, code-splitting.
Perf test: DarkWave Release + a synthetic 1,500-module preset → `reports/perf.json`.

---

## 21. Testing strategy

- **Unit:** tokenizer/parser/evaluator (docs + harvested formulas), unit conversion, anchor/padding, colour utils, patch/history, spec loader, kfile resolver (exact/alias/missing), every fixer.
- **Property-based (fast-check):** model round-trip incl. stale toggles; formula parse→print→parse.
- **Golden renders:** every sample rendered headlessly vs previews/thumbs (L5/L6); baseline updates need a flag + log entry.
- **Integration:** import → scripted edit scenario → export → re-import → compare; second export byte-identical. Scenarios generated from the spec so every property is exercised; a coverage report lists unexercised properties.
- **E2E:** open sample by drag-drop, select by canvas click, change colour, undo/redo, switch phone frame, switch KWGT 2x2/4x2 and dark mode, export, re-import, Import Health green. Screenshots saved.
- **Fuzz (light):** mutate valid presets; importer never crashes, reports problems.
- **Determinism:** same input twice → identical bytes.
- Gate before each phase commit: `npm run test && npm run verify && npm run size`.

---

## 22. Phased roadmap with acceptance criteria

### Phase 0: Fetch, recon & spec extraction (section 8)
Deliver: sample fetch (+ screenshot download attempt), manifest, corpus report, `spec/*.json` with provenance, `docs/refs/`, `docs/spec-corrections.md`.
Accept: 3.4 numbers reproduced; 3.5 answered or queued; spec loader tests green.

### Phase 1: Skeleton + archive + lossless model
Deliver: Vite/TS/Preact scaffold, size-limit, tests; `core/archive` (zip, WebP thumbs, kfile resolver, komp, APK pack listing), `core/model` (Prop with toggles/stale maps, extras), JSON canonicalisation; CLI `kweb inspect|roundtrip|validate`.
Accept: **L1 + L2 pass for all 41 samples (40 KWGT + 2 KLWP + komp, plus extras)**; untouched re-export is canonically equal.

### Phase 2: Spec-driven validation + fixers
Deliver: `core/validate`, fixer framework + tests, Problems report format.
Accept: L3 on all samples; each fixer has a break-then-repair test.

### Phase 3: Formula engine
Deliver: parser/evaluator; T1 complete; T2 with Sim; `gv/lv/fl` semantics; lint.
Accept: all formulas harvested from the samples evaluate with no unexpected errors; ≥ 95 % of docs examples for T1 families; L4 passes.

### Phase 4: Layout + renderer
4a: units, anchors, padding, overlap/stack, shapes (all F11 types), text, font icons, bitmaps, rotation incl. CLOCK_*.
4b: blend modes (CLEAR/XOR/SRC…), CLIP_NEXT/CLIP_ALL, gradients, shadows, filters, progress, curved text.
4c: animations + multi-screen scroll.
Deliver: headless `render(doc, target, sim, opts)`; L5/L6 harness with time solver, volatile mask, ratchet baselines and heat-maps.
Accept: baselines recorded for all 69 KWGT previews; floors met; ≥ 80 % of previews at "good" tier (alpha IoU ≥ 0.9 on non-volatile pixels) with the rest explained in `docs/render-notes.md`; KLWP thumb comparison documented.

### Phase 5: Editor UI MVP
Deliver: shell, canvas interactions, layer tree, inspector for MVP modules with the 3-way source switch, globals, assets, formula drawer, undo/redo, autosave, KLWP frame + KWGT size pickers, Sim panel incl. dark-mode toggle, Compare panel, Import Health, export with pre-export gate.
Accept: E2E passes; recreate a simple Nothing-style clock from scratch and pass L7.

### Phase 6: Targets in depth
Deliver: full device-profile UI (custom, from-screenshot, orientation, home-grid, multi-screen scroll), widget sizes with grid overlay, native/preview-matched sizes, resizable and multi-size preview, launcher calibration.
Accept: each KWGT sample renders at its native size and at 2x2/4x2/4x4 without artefacts absent from real previews.

### Phase 7: Export fidelity & auto-fix hardening
Deliver: thumbnail generation (WebP), asset pruning/naming, `release/features` computation, report UI, Device Test Pack, screenshot drop-zone (L8), LAN helper.
Accept: L1–L7 green; hypotheses = 0; the user performs a first real on-device import with the pack and findings are recorded.

### Phase 8: Completeness & polish
Deliver: Series/Movie(static), editable Komponents, `KUSTOMCLIP`, `.komp` import/export, shortcut editor, themes, PWA/offline, perf tuning, accessibility, README.
Accept: budgets met; scenario coverage shows all spec properties exercised; E2E green.

### Phase 9: Hardening
Deliver: fuzz, error boundaries, crash recovery, large-preset tests, version-drift notes (re-run `fetch` + `spec:extract` when Kustom updates), `docs/MAINTENANCE.md`.
Accept: `npm run verify` reproducible from a clean clone + `npm run fetch`.

---

## 23. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Kustom updates change format/defaults | Spec generated + provenance-tagged; `spec:extract` re-runnable; version in `spec/meta.json`; unknown keys preserved; `release` never above the user's app |
| CLEAR/CLIP render semantics wrong (heavy in Nothing_* widgets) | Isolated offscreen groups; calibrate against previews; Device Test Pack cases for each combination |
| README KLWP screenshots unavailable offline | Graceful `missing` status; L5 thumbs + device loop; never fake a pass |
| Preview/size/theme mismatches (F17, F16) | Render at image size; dark = `darkmode`; time solver + volatile mask; ratchet baselines instead of arbitrary thresholds |
| Embedded thumbs unreliable (F18) | KWGT thumbs informational only |
| Pixel-exact text differs from Android | Edge-F1/SSIM with masks; font metrics calibration; flagged fallback fonts |
| Missing/stale resource references (F12) | Alias tail-matching resolver; report rates; never rewrite on untouched imports |
| Huge icon JSONs (3 MB+) | Lazy worker parse; glyph-map only |
| Live-data features | Sim + clear labels; T3 placeholders |
| Export accepted by our validator but rejected by the app | L8 loop; record rejection text; mimic app exports exactly (WebP thumbs, key order, `release`) |
| Samples don't cover everything | Mine decompile/docs; mark `decompiled-only`/`hypothesis`; Device Test Pack |
| Licensing of sample fonts/APK | Local use only; never shipped (section 2) |
| Locked presets | Detect + refuse |

---

## Appendix A: Formula quick reference (verify against docs while implementing)
- Delimiters `$…$`; comparisons `= != < > <= >= ~=`; logic `& |`; arithmetic `+ - * / ^ %`.
- Families: AI, AQ, BI, BP, BR, CD, CE, CI, CM, DF, DP, FD, FL, GH, GV, IF, LI, LV, MI, MQ, MU, NC, NI, RM, SH, SI, TC, TF, TS, TU, UC, WF, WG, WI.
- Corpus examples (use as tests): `$if(si(darkmode)=0, #FFFFFFFF, #FF1B1B1D)$`, `$if(si(rwidth)>si(rheight), si(rheight), si(rwidth))$`, `$ce(tc(split,gv(pal_+gv(pallist)),"#",4),lum,a0)$`, `$ni(mi(package), icon)$`, `$if(ni(count)<si(mindex,0)+1, REMOVE, ALWAYS)$`, `$mu(round, (rm(mused)*100)/rm(mtot))$`.
- Docs recipes the renderer must satisfy: arc progress = Arc/Slice shape + Sweep Gradient + offset; tiling in wallpaper-root overlap groups; scrollable multi-page themes.
- Loop animation facts from klwp-viewer reference (verify): `LOOP_FW` 0→100 restart, `LOOP_2W` 0→100→0; `duration`/`delay` in tenths of a second; cycles aligned to the Unix epoch; `ROTATE` degrees = p·amount·3.6/100.

## Appendix B: Widget size tables (all editable)
| Cols/rows | Sample-calibrated px (F19) | `70n−30` dp | px @2.625 |
|---|---|---|---|
| 1 | w ≈ 165 / h 226 | 40 | 105 |
| 2 | w 415 / h 542 | 110 | 289 |
| 3 | w 667 / h ≈ 858 | 180 | 473 |
| 4 | w 916 / h 1169 | 250 | 656 |
(Observed only: widths 415/667/916–918, heights 226–228/542/1169; others interpolated. Calibrate to the user's launcher.)

## Appendix C: Commands to create
```
npm run fetch                # clone samples + try screenshots → samples/_src, sources.json
npm run inventory            # pair samples → samples/manifest.json, docs/corpus-report.md
npm run spec:extract         # samples (+decompile) → spec/*.json
npm run verify               # L1–L7 + scenarios → reports/
npm run verify:struct        # L1–L4 (fast)
npm run verify:visual        # L5–L6
npm run kweb -- inspect <file>
npm run kweb -- roundtrip <file>
npm run kweb -- render <file> --target 415x542 --dark --time 10:09 -o out.png
npm run kweb -- validate <file>
npm run kweb -- fix <file> -o fixed.kwgt
npm run size
```

## Appendix D: `docs/verification-log.md` template
```
## Iteration N: YYYY-MM-DD HH:MM
Command: npm run verify
Summary: X hard failures, Y warnings (prev: …)
By class: STRUCT_LOSS a · SCHEMA b · ZIP_LAYOUT c · FORMULA d · RENDER_DIFF e · EXPORT_STYLE f
Root cause(s): …
Change(s): files + one-line rationale
Evidence: report paths / heat-map names
Next: …
```

## Appendix E: Definition of done
1. All sample presets (40 KWGT, 2 KLWP, komponent(s), APK extras) open with Import Health green, round-trip losslessly and export again.
2. Visual baselines recorded and floors met for all 69 KWGT previews; KLWP thumb comparison documented (and README-image scoring if downloaded), residuals explained.
3. A preset authored from scratch (KLWP and KWGT) passes L1–L7 and was imported on the user's phone via the Device Test Pack (recorded in `docs/device-findings.md`).
4. Size and performance budgets met.
5. Spec has zero `hypothesis` entries; every fact has provenance.
6. README covers: running locally, `npm run fetch`, loading samples, exporting, importing on the phone, regenerating the spec when Kustom updates, and the legal/personal-use notes.

## Appendix F: Preview ↔ preset matching rules (from the real repo)
1. Lower-case both sides, strip `.kwgt`.
2. Candidates for stem `S`: `S.kwgt.png` → `light`; `S + "dark".kwgt.png` → `dark` (note the **suffix is glued to the stem**: `Nothing_Analog_5Dark.kwgt.png`, `Nothing_Analog_Dark.kwgt.png`); `S_empty.kwgt.png` → `empty`.
3. Exceptions known: `material_notification_widget.kwgt` ↔ `Material_Notification_Widget{,Dark,_Empty}.kwgt.png` (case only).
4. Sizes: take from the PNG; compare to `preset_info`; set `sizeMismatch` when aspect differs > 1 % (Interstellar_* and Clean_Time_Date_Info today).
5. Variants without a matching preset are reported, never silently dropped.

## Appendix G: Planning-time evidence log (so the agent can re-verify quickly)
- KWGT repo: 40 `.kwgt`, 1 `.komp`, 20 font files, 69 preview PNGs; module totals Shape 1150 / Stack 476 / Overlap 321 / Text 98 / Progress 58 / FontIcon 25 / CurvedText 14 / Bitmap 10 / Komponent 8; `release` values 376422110 ×8, 377435216 ×31, 377432414 ×1; `version` 13 ×40.
- KLWP repo: `05_19_25_DarkWave_Release.klwp` (release 378512015, 38 zip entries, 24.6 MB unpacked, `preset.json` 556,223 B), `08_31_25_DarkWave_PreRelease.klwp` (release 380522706).
- Toggles cross-tab (5,324 entries): 10+formula 3,216 · 100+global 1,308 · 0 (stale/alt) rest.
- Thumbnails: WebP; KLWP 460×1024 / 1024×460; KWGT long edge 1024.
- README screenshot download from the planning sandbox: HTTP 403 (sandbox policy), so untested on a normal network.
