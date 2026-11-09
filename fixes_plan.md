# KustomWeb — Fixes & UI Plan (for Antigravity)

Repo audited: `0-BlackSpectrum-0/Kustom_Maker-Website` @ `960ae9d` (single commit, ~7,000 source lines).
Companion docs: `plan.md` (architecture, verification layers L1–L8, fixers). This file does **not** repeat it. It says what is broken, why, how to fix it, how to prove the fix, and how the UI should change so it feels like the official Kustom editor.

---

## 0. Read this first

### 0.1 How this audit was done (and its limits)

The audit was a **static code review plus checks of the code's assumptions against real Kustom files** (4 presets extracted from the sample corpus: 2 KWGT, 2 KLWP). Installing and building the repo was not possible in the audit environment, so **nothing below was observed running**. Every finding carries one of these tags:

| Tag | Meaning |
|---|---|
| **[CODE]** | Visible in the source; the failing line is quoted. Behaviour follows directly from JS/Canvas semantics. |
| **[DATA]** | The code's assumption was compared against real preset data and found wrong. Counts come from the 4 presets sampled; re-run them on the full corpus in F0. |
| **[UNVERIFIED]** | Plausible, but needs a runtime check or an on-device check before anyone relies on it. |

**You (Antigravity) must run Phase F0 before changing anything.** It turns the [CODE]/[DATA] findings into reproduced failures and records a baseline. If F0 contradicts a finding here, trust F0 and note it in `docs/fix-log.md`.

### 0.2 Working rules

1. One defect ID = one commit = one regression test that fails before and passes after. No "fixed" without that test.
2. Never write an enum literal, property key, or default by hand. Generate them from `spec/*.json` (see F2). Most rendering bugs below are hand-typed values that disagree with the spec the project already extracted.
3. `docs/verification-log.md` may only record results that can be reproduced by a committed command and whose output is committed (see F9). The current log cannot be reproduced (see §2).
4. Do not delete or weaken an existing test to make it pass. Tests that are too weak are *replaced* by stricter ones (F9), and the old ones stay until the new ones are green.
5. Keep the size budget (JS ≤ 120 KB gzip). New dependencies need a one-line justification in `docs/MAINTENANCE.md`.

### 0.3 Input needed from the user (optional, but it changes the UI work)

For the UI to match the official app rather than approximate it, put **6–10 screenshots of the official Kustom editor** in `samples/ui-ref/` (module list, a module's property page, colour picker, formula editor, add-module menu, globals tab, KWGT size/preview screen). Phase F6 samples the palette and measures spacings from them. **If the folder is empty, F6 proceeds with the provisional tokens in §5.2**, and those values are marked `/* PROVISIONAL */` in `tokens.css` so they are easy to find and replace.

---

## 1. Diagnosis in one page

The app "doesn't work" for three independent reasons. Fixing any one of them alone will still look broken.

**A. The edit → export pipeline corrupts the document (P0).** Every edit deep-copies the document with `JSON.parse(JSON.stringify(doc))`. That turns the `assets` Map into `{}`, the `thumbs` Uint8Arrays into plain objects, and drops the non-enumerable `originalKeyOrder`. After the first edit, Export calls `doc.assets.has(...)` / `.entries()` on a plain object and throws, so you cannot export an edited preset. (D01)

**B. The renderer disagrees with the real file format (P0/P1).** The layout/painter code uses values that don't exist in real files:
- Anchors written as `TOP_LEFT`; real files use `TOPLEFT`. 38% of anchor values in the sample fall back to CENTER. (D02)
- Fonts and icon sets are `kfile://…` URIs in 100% of sampled cases (65/65 fonts, 156/156 icon sets). The painter pastes the URI straight into `ctx.font`, which Canvas rejects, so text falls back to default 10px sans-serif and every font icon is blank. No `FontFace` is ever created in the browser. (D03)
- Nothing ever decodes an image (`setImage` is never called), so bitmaps and image backgrounds never draw. (D03)
- Text width is guessed as `0.55 × fontSize` per character, so every Stack/Overlap that contains text is the wrong size. (D04)
- `ProgressModule` and `CurvedTextModule` are never painted; Progress is sized from a key (`progress_size`) that real files don't have. (D06)
- `paint_mode: CLEAR/XOR/SRC` and masks act on the shared canvas, not on the group's own layer, so they erase or clip the wrong things. (D07)

**C. The editor is a static picture with forms around it (P1).** The canvas is a CSS-scaled bitmap: no click-to-select, no handles, no drag, no pan, no rulers, no keyboard shortcuts (Toolbox shows "V/H/U/T" hints but nothing listens). The Inspector covers ~25 properties by hand; the official app exposes every property of every module. The look is a generic dark IDE with emoji buttons, not the Kustom editor. (D20–D26, §5)

### Why the project believed it was working

`docs/verification-log.md` reports "151 tests passed", "L1/L2 verified across 46 presets", "L5/L6 visual verification", "Desktop-class Figma/Photopea UI", "hotkeys", "Offline PWA". Checked against the code:

| Claim | Reality | Evidence |
|---|---|---|
| L1 lossless round-trip on 46 presets | The test compares `serialize(doc)` with `serialize(read(write(doc)))`. **Both sides use the same serializer**, so anything the serializer drops or rewrites is invisible. It never compares against the original `preset.json` from the zip. | `tests/integration/roundtrip.test.ts` lines 66–77 |
| L2 "byte fidelity" | Asset check compares **lengths only**, not bytes or hashes. | same file, lines 79–85 |
| Round-trip covers edits | Tests only read→write untouched docs. The editor's edit path (the JSON clone) is never exercised. | `editor-state.ts` `updateNodeProp`; no test imports it |
| L5/L6 visual verification | Metric is alpha-mask IoU only (colour ignored), threshold 0.7, and the script **never fails**: it counts passes and writes a baseline. Renders in Node with `@napi-rs/canvas`, not the browser users will run. | `tools/verify/verify.mjs` ~lines 135–160 |
| Evidence in `reports/*.json` | `reports/` is in `.gitignore`, so the evidence is not in the repo. | `.gitignore` |
| Hotkeys | No `keydown` listener exists anywhere in `src/`. | grep |
| Offline PWA | `sw.js` is never registered; `index.html` **unregisters all service workers and deletes all caches on every load**. `manifest.json` link is absolute (`/manifest.json`) while Vite `base` is `./`. | `index.html`, `vite.config.ts` |
| Layout/Fidelity on "69 previews" | Because fonts, icons and bitmaps never draw, any IoU above 0.7 comes from big opaque shapes only. | D03/D06 |

---

## 2. Defect register

Severity: **P0** blocks the core flow (open → edit → export → import in app). **P1** visibly wrong render or unusable editor. **P2** quality/robustness.

### P0 — core flow

#### D01 — Deep-copy via JSON destroys the document [CODE]
- **Where:** `src/ui/state/editor-state.ts` — `pushHistory`, `undo`, `redo`, `updateNodeProp`, `addNode`, `deleteNode`; same pattern in `ExportModal.handleFixAll` and `BottomDrawer` (`cloned.assets = doc.assets` patches only one case).
- **Why it breaks:** `JSON.stringify` turns `Map` into `{}` and `Uint8Array` into `{"0":…}`; non-enumerable `originalKeyOrder` is dropped. After any edit: `doc.assets.has is not a function` in `writePresetArchive`, `Assets` tab crashes (`doc.assets.entries`), `resolveKfile` throws inside `validateCurrent`, thumbnails vanish, JSON key order changes.
- **Reproduce (F0):** open any sample with bitmaps → change one number → Export. Expected today: "Export failed: …is not a function".
- **Fix:** replace cloning with **path-copying immutable updates** (structural sharing). `assets` and `thumbs` are never cloned (they're immutable byte blobs). Make key order an ordinary enumerable field so spreads keep it.

```ts
// src/core/model/edit.ts  (new)
import type { Doc, Node } from './types.ts';

export function mapNode(n: Node, id: string, fn: (n: Node) => Node): Node {
  if (n.id === id) return fn(n);
  if (!n.children) return n;
  let changed = false;
  const kids = n.children.map(c => { const r = mapNode(c, id, fn); if (r !== c) changed = true; return r; });
  return changed ? { ...n, children: kids } : n;
}
export const editNode = (d: Doc, id: string, fn: (n: Node) => Node): Doc =>
  ({ ...d, root: mapNode(d.root, id, fn) });
export const setProp = (d: Doc, id: string, key: string, patch: Partial<Prop>): Doc =>
  editNode(d, id, n => ({ ...n, props: { ...n.props, [key]: { ...n.props[key], ...patch } } }));
// addChild / removeNode / moveNode / wrapInGroup follow the same pattern.
```
```ts
// history: store Doc references, not copies. Cap at 200 entries.
const undoStack: Doc[] = [], redoStack: Doc[] = [];
export function commit(next: Doc, label: string) { undoStack.push(currentDoc.value!); redoStack.length = 0; currentDoc.value = next; scheduleValidate(); }
```
- In `types.ts`: `Node.originalKeyOrder` → `Node.keyOrder?: string[]` (plain field); `PresetInfo` likewise (`infoKeyOrder`). Parser sets them with normal assignment.
- Coalesce rapid edits (typing, dragging) into one history entry (`commit(next, label, {coalesceKey})`, 400 ms window).
- **Acceptance (vitest + Playwright):** for every preset in the corpus: read → `setProp` on one property → `writePresetArchive` → read. Assert (1) `assets` SHA-256 maps are identical to the original, (2) thumbnails byte-identical, (3) the `preset.json` text differs **only** in the edited property (use a JSON-patch diff of the *original* parsed JSON vs the re-read one), (4) undo ×1 then export equals the original export byte-for-byte.

#### D02 — Anchor names wrong → positions wrong and exports contain invalid values [DATA][CODE]
- **Where:** `layout/position.ts` `ANCHORS` (`TOP_LEFT`, …), `layout/types.ts` union, `Inspector.tsx` anchor dropdown, `device-pack/generator.ts:65` (`position_anchor: 'TOP_LEFT'`).
- **Real values** (and `spec/enums.json → AnchorMode`, which the project already extracted correctly): `TOPLEFT TOP TOPRIGHT CENTERLEFT CENTER CENTERRIGHT BOTTOMLEFT BOTTOM BOTTOMRIGHT`.
- **Impact:** `ANCHORS.indexOf('CENTERLEFT') === -1` → treated as CENTER. In the 4 sampled presets, **112 of 296** anchors (38%) are such values. The Inspector writes `TOP_LEFT`-style values into exported files, which the real app does not recognise (what it does with them is [UNVERIFIED]; assume it falls back to a default and the module jumps). The **Device Test Pack also uses `TOP_LEFT`**, so its on-device results would be misleading.
- **Fix:** see F2 (generated enum module). Replace `anchorToGravity` with a lookup table keyed by the generated `AnchorMode`; unknown values must `console.warn` once per value and render as CENTER, never silently.
- **Acceptance:** unit test that every anchor in the corpus resolves to a non-fallback gravity; test that no source file under `src/` contains a quoted string that looks like an enum member but isn't in `spec/enums.json` (F2 lint).

#### D03 — Fonts, icon fonts and images never load [CODE][DATA]
- **Where:** `render/painter.ts` (`paintText`, `paintFontIcon`, `paintBitmap`, `paintBackground`), `render/resources.ts`, `render/renderer.ts`.
- **Findings:**
  1. `text_family` is `kfile://org.kustom.provider/fonts/ProductSans.ttf` in 65/65 sampled cases. `paintText` does `ctx.font = \`${n}px ${family}, sans-serif\`` → invalid CSS → per the Canvas spec the assignment is **ignored** and the context keeps its previous font (default 10px sans-serif).
  2. `icon_set` is a `kfile://` URI in 156/156 cases, many in alias form (`…/wallpapers/<Name>.klwp/icons/<Set>.ttf`). `getIconSet` strips `.ttf` and uses the **entire URI** as family name and JSON lookup key; the `endsWith(cleanName + '.json')` search can never match, so it falls through to "first `icons/*.json` in the archive", which is the wrong set whenever a preset has more than one.
  3. In the browser **no `FontFace` is ever created** (`registerFontIfPossible` only runs in Node with `GlobalFonts`).
  4. `ResourceManager.setImage` is never called anywhere; `getImage` is a sync cache read of an always-empty map. Bitmaps, `background_bitmap`, and `fx_gradient: BITMAP` therefore never draw, in browser or Node.
- **Fix (new `render/resources.ts`):**
```ts
export class ResourceManager {
  images = new Map<string, ImageBitmap>();       // key = resolved archive path
  fontFamily = new Map<string, string>();        // resolved path -> CSS family (e.g. "kw_7f3a1c")
  iconCodes = new Map<string, Map<string, number>>(); // resolved .ttf path -> name->codepoint
  async prepare(doc: Doc): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (const [path, bytes] of doc.assets) {
      if (/^bitmaps\//.test(path))
        jobs.push(createImageBitmap(new Blob([bytes])).then(b => void this.images.set(path, b)).catch(warn));
      else if (/\.(ttf|otf)$/i.test(path)) {
        const fam = 'kw_' + hash32(path);
        jobs.push(new FontFace(fam, bytes.slice().buffer).load()
          .then(f => { document.fonts.add(f); this.fontFamily.set(path, fam); }).catch(warn));
      } else if (/^icons\/.+\.json$/i.test(path)) jobs.push(this.indexIconJson(path, bytes));
    }
    await Promise.all(jobs);
  }
  /** One resolver for every kfile use: exact → alias tail → case-insensitive. Returns the archive path. */
  resolve(uri: string): string | undefined { return resolveKfile(uri, this.assetsView).resolvedPath; }
  family(uri: string): string { const p = this.resolve(uri); return (p && this.fontFamily.get(p)) ?? 'Roboto, sans-serif'; }
}
```
  - The painter must always use `res.family(text_family)`, quote it (`"kw_7f3a1c"`), and **assert** the assignment took effect in dev builds (`if (ctx.font === prev && prev !== wanted) warn`).
  - Icon glyph lookup: key by the resolved `.ttf` path; pair `<Set>.ttf` with `<Set>.json` by basename, never "any json".
  - `renderer.ts`: `await resources.prepare(doc)` once per document load (cache on the doc identity, not per frame). Painter stays synchronous after that.
  - Node path (`@napi-rs/canvas`): use `loadImage` + `GlobalFonts.register` **with the same family names** so Node and browser render the same.
- **Acceptance:** fixture presets with (a) a custom font, (b) an alias-form icon set, (c) a bitmap, each render ≥ N non-transparent pixels in the module's box in Chromium (Playwright) — N from the reference preview bbox. Unit test: `resolve()` for all `kfile://` strings in the corpus returns a path present in the archive (or is reported as `missing` exactly where the validator already says so).

#### D11 — Serializer and writer lose or invent data [CODE]
- **Nested `globals_list` dropped.** `parseModule` skips `globals_list` on every non-root node and stores it nowhere; the serializer only emits it for the root. Any `KomponentModule` inside a widget loses its own globals on export (1 of 1 nested Komponents in the sample had a `globals_list`). Komponent-bound `internal_globals` then point at nothing. Fix: store as `Node.globals` (ordered record) and emit it wherever present; also root of `.komp` (currently handled via `doc.globals`) must go through the same path.
- **Number lexemes lost.** Real files write `22.0`; `JSON.stringify` writes `22`. The real app probably accepts both ([UNVERIFIED]), but you cannot get byte-identical untouched exports, and your canonical test hides it (it normalises numbers). Fix: tiny custom JSON parser (~80 lines) that returns a `Lex` instance `{v:number, raw:string}` **only** when `String(v) !== raw`; serializer prints `raw`; arithmetic code uses `+x`/`valueOf`. Edits write plain numbers via an app formatter (`fmtNum`: integers as `N`, non-integers via shortest round-trip, matching the app's `.0` rule where the previous value had one).
- **Thumbnails never regenerated.** `writePresetArchive` only copies `doc.thumbs`. New documents (`createDefaultDoc`, `handleNewKWGT`) ship **no thumbnails**; edited ones ship the *old* preview. Fix: on export render the preview in the browser, encode **WebP** via `canvas.toBlob('image/webp', 0.9)` (KLWP 460×1024 + 1024×460; KWGT long edge 1024; names stay `.jpg`), and write both. Make the export gate fail if any required thumb is missing or not RIFF/WEBP.
- **Non-deterministic zip.** `fixedTimestamp` is accepted but never passed to `zipSync` (`mtime`). Fix: pass `mtime: opts.fixedTimestamp ?? doc.info.ts-derived-or-fixed-date`, and write entries in a fixed order (preset/komponent json, thumbs, then sorted assets) unless `preserveEntryOrder` and the original order is known.
- **`preset_info` completeness.** New docs have `info` without `features/pflags/xscreens/yscreens/archive` (and `hash/id/ts` for KLWP). Generate them from a template taken from a corpus file of the same kind; compute `features` with the fixer; set `xscreens` from the canvas. [UNVERIFIED: whether the app rejects a missing field. Include it in the device pack.]
- **Acceptance:** the **true round-trip test** in F9 (original bytes of `preset.json` == exported bytes for untouched presets, after lexeme preservation).

#### D12 — Renderer precedence bug and render races [CODE]
- `renderer.ts` ~l.26: `screens: options?.screens ?? doc.info.xscreens ? (doc.info.xscreens ?? 0) + 1 : 1` parses as `(a ?? b) ? c : 1`. An explicit `screens: 1` is truthy so it's ignored in favour of `xscreens + 1`; and a missing `xscreens` yields `1`. Parenthesise: `options?.screens ?? ((doc.info.xscreens ?? 0) + 1)`.
- `CanvasArea.tsx` sets `canvas.width/height` on every render (clears the canvas → flicker), has an unused `active` flag (so out-of-order async renders can paint stale frames), no HiDPI scaling (blurry at zoom>1 or devicePixelRatio>1), and "Fit" uses `window.innerHeight - 150` instead of the real container. Fix in F7 (stage rewrite).

### P1 — fidelity

#### D04 — Text measurement is a guess [CODE]
`measure.ts` TextModule: `textW = len * fontSize * 0.55`, `textH = lines * fontSize * 1.25`. Stack/Overlap parents size from children, so **every layout that contains text** drifts. Fix: measure with the real font via an offscreen 2D context (`measureText` → `actualBoundingBox*`, `fontBoundingBox*`), using the same `ctx.font` the painter will use, caching by `(font, text)`. Match Kustom's box rules by calibration, not assumption: write `tools/calibrate/text-box.mjs` that, for corpus text modules with a known preview, solves the vertical offset / line-height factor that maximises alpha-IoU, and commit the constants + the data they came from to `spec/render-semantics.md`. Also support `text_*` features present in the corpus that the painter ignores (multi-line wrap by `text_width`, max lines, `text_ellipsize`, letter spacing, BB-code `[b][c=…][size=…]` runs — see spec for what exists; `stripBBCode` currently throws the styling away).

#### D05 — Positioning rules incomplete/unverified [CODE][UNVERIFIED]
`position.ts` applies `position_offset_x/y` **only** when the parent is the Root (`isRoot ? … : 0`), and subtracts the offset for right/bottom anchors. Both are assumptions. Only 2 non-root offsets exist in the sampled presets, which is why this isn't the first bug you'd see, but Overlap children do accept offsets in the app. Fix: resolve by calibration — implement the variants behind a flag, run the reference-preview comparison (F9) over the corpus, and keep the variant with the best score; record the decision in `spec/render-semantics.md`. Also verify scroll handling (`screens`/`offset`) for KLWP against DarkWave screenshots; `positionLayoutTree` receives `screenOffset/screens` but never uses them.

#### D06 — Progress and CurvedText not implemented [CODE][DATA]
`painter.paintNode` handles Shape/Text/FontIcon/Bitmap only. `measure.ts` sizes Progress/CurvedText from `progress_size` (not a real key). Real Progress keys in the corpus: `style_size`, `style_width`, `style_height`, `style_shape`, `style_style`, `color_color`, `color_bgcolor`, `color_tcolor`, `progress_mode`, `progress_progress`, `progress_max`, `progress_count`, `progress_level`. CurvedText: `text_expression`, `text_size`, `text_width`, `text_family`, `text_rotate_mode`. Implement both from `spec/modules.json` (it already lists the properties). Progress: linear and circular bar/arc, `progress_mode` variants present in the corpus, `progress_count` segments. CurvedText: text along an arc of radius derived from `text_width`. Acceptance: previews that contain them improve IoU; unit tests for geometry.

#### D07 — Blend modes and masks act on the wrong surface [CODE]
`paintNode` paints children straight onto the shared canvas with `globalCompositeOperation = destination-out` for `CLEAR` (also `xor`, `copy` for `SRC`). Your own `docs/device-findings.md §7` says CLEAR executes "inside the group's offscreen buffer"; the code does not do that: a `CLEAR` shape inside a group **erases everything painted before it on the whole canvas**, including the background and unrelated groups. `SRC` (`copy`) wipes the entire canvas. Masks: `getShapePath(kid)` returns a path in the kid's *local* box space and is applied to the next sibling without the kid's transform, padding or rotation, so clips land in the wrong place.
- **Fix:** each group that contains any child with `paint_mode ≠ NORMAL` or `fx_mask ≠ NONE` renders into its own `OffscreenCanvas` (size = group box), then composites onto the parent with the group's alpha. For `CLIP_NEXT/CLIP_ALL`: render the mask shape **with its full transform** into an alpha layer, then use `destination-in` on the clipped sibling's layer (or `ctx.clip` with a path built from the transformed mask). Also implement `DST`, `BACKGROUND`/`BLURRED`/`LIQUID_GLASS` masks as "approximate + flagged" (render nearest equivalent and add a `Problems` entry "approximated in preview" so the user knows the preview isn't exact).
- Skip the offscreen path for groups with only NORMAL children (perf: DarkWave ~700 modules).
- **Acceptance:** unit renders for CLEAR (cut-out ring), XOR, SRC, CLIP_NEXT, CLIP_ALL fixtures with pixel assertions; corpus previews with these modes (374 CLEAR, 22 XOR, 5 SRC, 30 CLIP_NEXT, 17 CLIP_ALL in the KWGT corpus) must not drop in score.

#### D08 — Effects partly ignored or mis-scaled [CODE][DATA]
- `fx_shadow_blur` and the shadow offset are used in px; only distance is multiplied by `unit` (blur isn't). Shadows also apply to strokes and fills identically; Canvas `shadowBlur` ≠ Android blur radius (use `blur/2` as a starting point and calibrate).
- `fx_gradient: BITMAP` (40 uses in the sample) unhandled; `SWEEP` start angle is a guess; gradient geometry uses the module box, not the shape box.
- Not implemented but present in the corpus: group-level `config_fx` (`DROP_SHADOW`), `config_fx_fcolor/bcolor`, `config_filter` (`CONTRAST`, `DESATURATE`, …), `config_rotate_*` on groups, `bitmap_blur` is applied only through `ctx.filter` (unsupported in Safari and napi-canvas — fall back to a manual box blur on an offscreen).
- Rotation modes `DEG90/180/270`, `FLIP_X/Y` exist in the spec — confirm `calculateRotation` covers all 13 values of `Rotate`.

#### D09 — Visibility and sim flags incomplete [CODE][DATA]
`measure.ts` accepts only `ALWAYS REMOVE IF_NOT_LOCKED IF_PORTRAIT NEVER`; real files also use `IF_LOCKED` and `IF_LANDSCAPE` (spec: `VisibleMode`). Unknown values silently become `ALWAYS`. Also `IF_NOT_LOCKED` (41 in the sample) is evaluated as visible: decide the preview's lock state explicitly (default "unlocked") and expose a Lock toggle in the top bar so users can preview both. Add `orientation` to the sim state.

#### D10 — Property defaults never applied [CODE]
`PropertyResolver.resolveAll` iterates only `Object.keys(node.props)`; the `spec.defaults` lookup keys by property name only (ignores module type) and callers hard-code their own defaults anyway. Result: two sources of truth for defaults. Fix: resolve per module type from `spec/modules.json` (`default` per property), `resolveAll` fills the full set, painter/measure read resolved values without their own fallbacks.

### P1 — editor behaviour

#### D20 — No canvas interaction [CODE]
No hit-testing, selection outline, resize handles, drag-to-move, pan, rulers, snapping, or keyboard shortcuts. `Toolbox` tools (`hand/shape/text/icon/image`) set a signal that nothing reads. Details in §5.5.

#### D21 — Inspector is hand-built and incomplete [CODE]
~25 properties across Shape/Text/Paint/FX/Position. Missing: Stack/Overlap/Komponent settings, FontIcon, Bitmap, Progress, CurvedText, Rotation/Scale/Alpha/Visibility (the `config_*` set), Animations, Touch events, `shape_type` values `PATH`/`SQUIRCLE`, `paint_mode` `DST`, `fx_gradient: BITMAP`, mask values beyond three. Also: number inputs commit on `change` only; empty field silently becomes `0` (`parseFloat(raw) || 0`); toggling to `fx`/`gv` without a formula/global leaves an orphan toggle (validator flags it, nothing prevents it). Fix: generate the Inspector from `spec/modules.json` (§5.4).

#### D22 — Layer panel lacks core operations [CODE]
Delete only. No add-into-selected-group (`+ Shape`/`+ Text` add to **root** regardless of selection), reorder, drag-and-drop, rename, duplicate, copy/paste (the `##KUSTOMCLIP##` serializer exists in `core/model/clipboard.ts` but isn't wired), group/ungroup, visibility toggle, lock. Text/emoji icons for module types.

#### D23 — Formula editing is a plain text box [CODE]
`fx` opens a drawer, but there is no function list/autocomplete, no live value, no error location, and no global/flow/`$…$` helpers. Build the formula editor described in §5.4.

#### D24 — Globals tab is read-only list [CODE]
`+ Add` creates a COLOR global named by `prompt()`; no editing of value/type/title/min/max/entries, no folders, no per-Komponent globals, and it mutates `doc.globals` in place before `pushHistory`. `prompt()` cancel leaves a spurious history entry.

#### D25 — Target/frame handling is cosmetic [CODE]
`device-profiles.json` + CSS divs draw a hard-coded status bar (`10:10`) and punch-hole; widget sizes work but the canvas doesn't use the launcher cell geometry as a snap grid. The Grid overlay is fixed 4×6.

#### D26 — Misc [CODE]
- `ExportModal` calls `useState` after an early `return null` (conditional hooks); works by accident in Preact, will break on any refactor.
- `index.html` imports the stylesheet by `<link>` **and** `main.tsx` imports it (double inclusion in dev).
- IDs are `${type}_${Date.now()}_${n}` — fine but not stable for diffing; `Math.random` ids elsewhere.
- No error boundary: a thrown render error blanks the app.
- `samples/` (≈130 MB) is committed; `reports/` (the evidence) is ignored. Reverse both (F10).

### Not audited (do in F0)
`BottomDrawer.tsx`, `MultiSizeModal.tsx`, `device-pack/generator.ts` (known to use `TOP_LEFT`), `formula/*` (evaluator and function tiers), `sim/sim-state.ts`, `layout/rotation.ts`, `core/model/clipboard.ts`, `editor.css` after line 140, and all tests other than `roundtrip.test.ts`/`render.test.ts`. Add findings to this register as `D3x`.

---

## 3. Fix phases (execute in order)

Each phase ends with its **Definition of Done (DoD)**; do not start the next phase until it's green. After each phase append a dated entry to `docs/fix-log.md`: command run, raw result, what changed.

### F0 — Reproduce and baseline (½ day)
1. `npm ci && npm run build && npm test`. Record exact errors (the audit could not run these).
2. Add `tools/smoke/smoke.mjs` (Playwright Chromium, already available in most dev setups; otherwise `npm i -D playwright`) that: loads `vite preview`, opens a corpus KWGT and a KLWP via the file input, screenshots, edits one number via the Inspector, clicks Export, captures the download or the error text. Save `reports/baseline/*.png` + `reports/baseline/smoke.json`.
3. Reproduce D01, D02, D03 with the smoke script and write them as **failing** vitest/Playwright tests (`tests/regress/d01-*.test.ts` …), marked `it.fails` until fixed.
4. Run the not-audited list above; add findings.
5. **DoD:** `docs/fix-baseline.md` committed with real outputs; failing regression tests exist for D01–D03, D07.

### F1 — State and archive integrity (D01, D11, D12 partial) (1–2 days)
Implement `core/model/edit.ts`, history, `keyOrder` fields, nested `globals`, `Lex` numbers, thumbnail generation, deterministic zip, `preset_info` templates. Migrate all UI call sites (`updateNodeProp`, `addNode`, `deleteNode`, `handleFixAll`, BottomDrawer, clipboard) to `commit()`.
**DoD:** D01 regression flips to pass; true round-trip (F9-V1) passes for all corpus presets; Export after edit works in Playwright.

### F2 — Generated spec types; kill hand-typed enums (D02, D09, D10) (½–1 day)
- `tools/gen-spec.mjs` reads `spec/enums.json`, `spec/modules.json`, `spec/defaults.json` → writes `src/core/spec/generated.ts` (committed) with `as const` arrays, union types and `isEnum(name, v)`.
- Delete every enum string literal from `layout/`, `render/`, `ui/`, `device-pack/`. Add `tests/unit/no-handwritten-enums.test.ts`: scan `src/**/*.ts(x)` for `'[A-Z][A-Z_]{3,}'` literals and require each to be a member of some generated enum or on a tiny allow-list (`'RootLayerModule'`, module type names, etc.).
- Anchor table, stacking table, visibility, gradients, paint modes all come from generated types.
- Fix the Device Test Pack presets to use real values.
**DoD:** D02 regression passes; no handwritten enum literals; corpus run prints zero "unknown enum" warnings.

### F3 — Resources: images, fonts, icons (D03) (1 day)
Implement `ResourceManager.prepare`, single `resolve`, family naming, icon JSON pairing, Node parity. Add a **Resources panel** (Assets tab) showing every `kfile://` reference with status (ok/alias/missing) and a thumbnail/glyph sample, so users can see why something is blank.
**DoD:** fixtures (font, alias icon set, bitmap) render in Chromium; corpus: 0 `invalid font` assignments (assert in dev); missing resources are listed, not silent.

### F4 — Layout correctness (D04, D05, D10) (2–3 days)
Real text measurement, spec-driven defaults, calibrated positioning rules, Stack/Overlap sizing rules from `spec/render-semantics.md` (update that file with each calibration result and the corpus data that justified it). Remove `Math.round` on intermediate box sizes if calibration shows sub-pixel layout in the app (verify, don't assume).
**DoD:** on the KWGT corpus, median bbox error (rendered vs preview, in px at preview size) ≤ 3 px for ≥ 80% of presets that contain text; recorded in `reports/`.

### F5 — Painter semantics (D06, D07, D08) (2–3 days)
Group layers, masks, blend modes, Progress, CurvedText, gradients (incl. BITMAP), shadows with unit scaling, group effects, rotation completeness, approximated-feature flags (`render.warnings[]` surfaced in the Problems tab).
**DoD:** fixture tests pass; corpus visual score (F9-V3) ≥ baseline on every preset and improves on the median; no preset regresses by more than 0.02.

### F6 — UI shell like the official app (§5) (3–4 days)
Design tokens, layout, panels, icon set, dialogs. Details in §5.

### F7 — Canvas stage with real interaction (D12, D20, D25) (2–3 days)
Details in §5.5.

### F8 — Spec-driven Inspector, formula editor, globals (D21, D23, D24) (3 days)
Details in §5.4, §5.6.

### F9 — Verification that can actually fail (see §4) (1–2 days, start in F0, finish here)

### F10 — Repo hygiene (½ day)
- `.gitignore` add `samples/_src/`, `samples/extra/`, `samples/iconpacks/`; **remove `reports/` from `.gitignore`** and commit small JSON summaries (`reports/summary.json`, `visual-baselines.json`, ≤ 200 KB total; screenshots stay ignored). Keep `npm run fetch` as the way to get samples; make `pretest` call it when `samples/` is empty, and make tests **skip with a loud message** (not fail, not silently pass) when the network is unavailable.
- Optional: `git filter-repo --path samples --invert-paths` on a fresh clone to drop the 130 MB from history; ask the user first.
- Register the service worker **or** delete `sw.js` and the manifest claim. Recommended: register with `vite-plugin-pwa`-free minimal code: cache-first for hashed assets, network-first for `index.html`; version from build hash; never unregister on load. Fix manifest link to be relative (`./manifest.json`).
- Error boundary around `<App/>`; global `window.onerror` → toast.
- README: one paragraph on what is verified on-device vs only in-browser.

---

## 4. Verification that proves it (replace/extend L1–L8)

The current checks passed while the app was broken. These can fail.

**V1 — True round-trip (L1/L2).** For every corpus archive `A`: `read(A)` → `write()` with no edits → compare to `A`:
- `preset.json` text equal **byte-for-byte** (needs `Lex` + key-order preservation); if not equal, print the first differing JSON path and the two raw lexemes.
- every other entry: SHA-256 equal; entry set equal; thumbs equal.
Skip nothing: an unequal file is a failure, not a warning. (Exempt only `fixedTimestamp`-dependent zip headers; compare entries, not archive bytes.)

**V2 — Edit round-trip (the missing test).** Script the *same actions the UI uses* (`setProp`, `addChild`, `removeNode`, `moveNode`, undo/redo, paste) on each corpus preset; export; re-read; assert the diff vs the original is exactly the intended patch, assets/thumbs intact. Run once in vitest (Node) and once in Playwright against the real UI controls, so the clone bug class can't come back through the UI layer.

**V3 — Visual comparison against reference previews (L5/L6).**
- Render in **Chromium via Playwright** (what users run), not napi-canvas. Keep the Node path only for CI smoke.
- For each preview PNG (`…Dark` variants use `darkmode=1`): compare at preview size with
  1. alpha IoU,
  2. mean absolute RGB error over the union of non-transparent pixels (premultiplied),
  3. bbox deviation of the 5 largest alpha components.
  Report all three per preset in `reports/visual.json`.
- **Gate:** per-preset thresholds ratchet from `reports/visual-baselines.json` (committed): a run fails if any preset's score drops by > 0.02 from its baseline; baselines can only be raised by an explicit `--update-baseline` commit. Presets with known preview/size mismatches (Interstellar_*, Clean_Time_Date_Info) are listed in an allow-list file with the reason.
- KLWP: compare against the DarkWave screenshots **only for structure** (they include launcher UI/wallpaper); use embedded `preset_thumb_*.jpg` (WebP) as the stricter reference at 460×1024.

**V4 — Import-readiness gate (static).** Before enabling Download: (a) JSON schema from the corpus (generated, `spec/`) with unknown enum/property = error, (b) every `internal_toggles` entry has the matching formula/global (or is a preserved stale entry from the original), (c) every `kfile://` resolves, (d) thumbs present and WebP, (e) `preset_info` has the full key set for its kind, (f) zip has no directory entries and normalised names. The gate lists failures with a one-click fix where the fixer is deterministic (as the current modal does) but **a failed gate blocks Download**; there's an explicit "Download anyway" for advanced users that is visibly labelled.

**V5 — On-device loop (L8).** Keep the device test pack but regenerate it from F2 enums and include: anchors (all 9), stack modes (6), nested globals (Komponent), a font icon from an embedded set, a bitmap, CLEAR/XOR/CLIP masks, a progress bar, a curved text, a thumbnail-less file vs a thumbnailed file, a preset with the minimal vs full `preset_info`. The user imports it on the phone, screenshots, and drops the screenshots into the app's Compare tab; results are appended to `docs/device-findings.md` (resolving the "Queued" item #9 there). Until a result exists, the UI must label export as "structurally valid, not yet device-tested for features X".

**V6 — Mutation/fuzz of fixers.** Keep `fixers.test.ts`; add "break one thing per fixer in a real corpus preset → validator flags → fixer repairs → V1-style diff shows only that repair".

**CI command set** (all must be green, outputs committed per F10):
`npm run build && npm test && npm run verify:struct && npm run verify:visual && npm run smoke`

---

## 5. UI redesign: make it feel like the official Kustom editor

The official apps (KLWP/KWGT) are mobile-first: a **preview on top**, a **module list below**, property pages in **bottom sheets/tabs**, and a **three-way value / formula / global** switch on every property. Desktop should keep that mental model and logic (so muscle memory transfers) while using the extra space for simultaneous panels. Don't invent a Figma/Photopea layout; invent nothing the official app doesn't have unless it is pure desktop convenience (rulers, shortcuts).

### 5.1 Layout (desktop ≥ 1100 px; below that, stack as the phone does)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ☰  Preset name ▾        [Widget 4×2 ▾][⟳][frame]   ⟲ ⟳   ▶ Preview  [Export]│  48 px app bar
├───────────────┬───────────────────────────────────────────┬────────────────┤
│ LAYERS | GLOBALS | ASSETS │            PREVIEW STAGE            │ PROPERTIES     │
│ ▸ ▢ Background  👁 │   rulers · artboard · selection handles │ [Text][Paint]  │
│ ▾ ▤ Stack     👁 │                                           │ [Fx][Position] │
│   T Clock     👁 │                                           │ [Layer][Anim]  │
│   ⬭ Dot       👁 │                                           │ [Touch]        │
│                  │                                           │ rows…          │
│             (＋) │   zoom bar · units readout · sim toggles  │                │
├───────────────┴───────────────────────────────────────────┴────────────────┤
│ status: validation chip · render warnings · "approximated: LIQUID_GLASS"    │  24 px
└────────────────────────────────────────────────────────────────────────────┘
```
- **Left = the official "module list":** tree rows with type icon, title, eye (visibility), chevron for groups; selection highlight; long-press/right-click context menu (Copy, Cut, Paste, Clone, Rename, Group, Ungroup, Move up/down, Delete). A round **＋ button** (FAB, bottom-right of the panel) opens the **Add module** menu: Shape, Text, Font Icon, Bitmap, Progress, Curved Text, Stack, Overlap, Komponent, Paste (that exact list, in that order — verify against screenshots).
- **Center = preview** with the frame/size selector in the app bar (KLWP: device frame + orientation + screen count/scroll; KWGT: widget size 1×1…5×5 and "preset native").
- **Right = the property page** for the selected module: **tab strip** whose tabs depend on module type (module-specific tab first — "Shape", "Text", "Icon", "Bitmap", "Progress", "Stack"… — then **Paint**, **Fx**, **Position**, **Layer**, **Animation**, **Touch**; hide tabs the module doesn't have). Each row = `label` / `current value summary` / source chip.
- Remove the separate `Toolbox` column and the emoji toolbar. Tools that are not part of Kustom (hand/shape/text/icon/image modes) go away; adding a module uses the ＋ menu and then the module is created at the center and selected. Keep **Hand (Space-drag)** as a modifier, not a tool.
- Bottom drawer → fold "Problems / Compare / Formula" into: status bar chip (opens a Problems popover), Compare as a toggle in the app bar (opens a side-by-side reference overlay), Formula as a modal dialog (§5.4).

### 5.2 Visual language (tokens; replace `editor.css`)
Material-3-style dark, calm, low-contrast surfaces, one accent, 8-px grid, no gradients, no emoji. **Provisional** values — replace from `samples/ui-ref/` in this phase (`tools/ui/sample-palette.mjs` prints dominant surface/accent/text colours and row heights from the screenshots):

```css
:root{ /* PROVISIONAL – sample from official screenshots */
  --surface-0:#121212; --surface-1:#1b1b1d; --surface-2:#232326; --surface-3:#2c2c30;
  --outline:#3a3a40; --on-surface:#e6e6ea; --on-surface-2:#a9a9b2; --on-surface-3:#74747d;
  --accent:#26c6da; --accent-container:#0f3d44; --on-accent:#00252a;
  --fx:#7aa2ff;   /* formula chip & text */
  --gv:#5fd39a;   /* global chip & text */
  --error:#ff6b6b; --warn:#ffb74d; --ok:#5fd39a;
  --r-sm:8px; --r-md:12px; --r-lg:16px; --r-pill:999px;
  --row-h:48px; --appbar-h:48px; --panel-w-left:280px; --panel-w-right:340px;
  --font: Roboto, system-ui, -apple-system, "Segoe UI", sans-serif;
  --e1: 0 1px 2px rgb(0 0 0 / .4);  --e2: 0 4px 12px rgb(0 0 0 / .45);
}
```
- Type scale: 12 / 14 / 16 / 20; weights 400/500. Titles in sentence case. Icons: **inline SVG sprite** of ~30 Material-Symbols-style glyphs (module types, eye, chevron, plus, undo, redo, fx, link/global, paste, copy, trash, grid, frame, rotate, zoom). No icon fonts, no emoji.
- States: hover = +4% white overlay, selected = `--accent-container` with 2-px accent left bar, focus ring 2-px accent, disabled 38% opacity. Transitions ≤ 120 ms.
- Respect `prefers-color-scheme`; ship dark by default, a light token set optional.

### 5.3 Property rows — the three-way value / formula / global
This is the heart of the official UX. Each property row:
```
[ label                         ] [ value summary…        ] [ ◉ ]
```
- Tapping the row opens an **inline editor** below the row (desktop) with the right control for the type: slider+number for numbers/percent/angle, segmented control for ≤4-value enums and a menu for longer ones, colour swatch → picker, text field for strings, font/bitmap/icon pickers for resources.
- The trailing chip shows the **current source**: plain (value), **fx** (formula, `--fx` colour), **gv** (global, `--gv` colour). Click it to switch source; the previous formula/global is **kept** (stale entries are preserved on export per `plan.md`), shown dimmed.
- When source = fx: the row shows the formula text in `--fx` mono, with an **fx** button opening the formula editor; when gv: shows the global's title with its current value swatch and a "go to global" link.
- A number property's inline editor always shows the **unit** (`u` = min(w,h)/720 px) and a computed px readout.
- Never commit an empty number to 0; revert to previous on blur and show the field error. Support scrubbing: drag horizontally on the label to change the value, hold Shift for ×10, Alt for ×0.1.

### 5.4 Spec-driven Inspector, colour picker, formula editor
- `Inspector` renders from `spec/modules.json` `sections` (`key`, `type`, `enum`, `default`, plus labels). Add `label`, `group` (tab) and `visibleWhen` (e.g. `shape_height` hidden when `shape_type ∈ {CIRCLE, SQUARE, EXAGON, SLICE}`; `paint_stroke` only when `paint_style = STROKE`; gradient colour only when gradient ≠ NONE) to the spec via a hand-maintained overlay file `spec/ui-meta.json`, validated by test against `modules.json` (every property has a label; no unknown keys).
- **Colour picker:** swatch → popover with hue/sat square, hue bar, **alpha bar**, hex `#AARRGGBB` field (the file format, not CSS order!), recent colours, and the document's colour globals as chips (picking one switches the row to `gv`). Eyedropper on the canvas via `EyeDropper` API when available.
- **Formula editor (modal, 70% width):** CodeMirror-6-free, ~250-line custom editor: monospace textarea with token colouring (functions `--fx`, strings, numbers, `gv()` refs `--gv`), **autocomplete** from `spec/functions.json` (name, signature, one-line help), bracket/`$` matching, **live result** line computed by the project's evaluator with the sim state, **error with column** from the Pratt parser, and a right-hand function browser grouped by tier (T1 exact / T2 simulated) with an "approximate in preview" badge for T2/T3 so users know the preview may differ from the phone. Buttons: OK / Cancel / Clear (clearing keeps toggle=fx with empty formula *only if* the original had it; otherwise reverts to value).
- **Globals tab:** list grouped by folder (`folder/name`), row = type icon + title + current value; edit panel for type (COLOR, NUMBER, SWITCH, LIST, FONT, TEXT, BITMAP…), title, value, min/max/step, list entries, and "formula" source; creating via dialog (no `prompt()`); delete warns with the list of properties that reference it. Komponent-scoped globals appear under the Komponent node.

### 5.5 Preview stage (replace `CanvasArea.tsx`)
- Two stacked canvases inside one pan/zoom container: **render canvas** (HiDPI: `canvas.width = css × devicePixelRatio × zoom`, re-render at zoom end) and **overlay canvas/SVG** (selection, handles, guides, rulers) — the overlay never re-runs layout.
- **Render scheduling:** one `requestAnimationFrame` loop with a dirty flag and a generation counter; a render that finishes after a newer request started is discarded. Render to an offscreen buffer then `drawImage` to the visible canvas (no flicker). Clock-driven content (`sim.now`) ticks at 1 Hz only when the toggle "Live" is on.
- **Hit-testing:** reuse `LayoutNode` boxes + transforms (already computed) to build a z-ordered list; click selects the top-most node whose transformed rect contains the point (shape-accurate for circles via `isPointInPath`); Alt-click selects through; double-click enters a group; Esc selects parent.
- **Handles and drag:** 8 handles + rotate handle for modules with size properties (`shape_width/height`, `icon_size`, `text_size`, `bitmap_width/height`); dragging writes `position_offset_x/y` **in units** (convert px → units by `unit`) and respects the module's anchor (sign rules from the calibrated D05 decision); Shift = axis lock, Alt = from centre, Ctrl = snap-off. Show live `x, y, w, h` in units next to the cursor. One history entry per drag.
- **Snapping:** to parent edges/centre, sibling edges/centres, and (KWGT) launcher cell boundaries; guides drawn on the overlay.
- **Keyboard:** V/H dropped; `Delete` remove, `Ctrl+C/X/V` (via `##KUSTOMCLIP##`), `Ctrl+D` clone, `Ctrl+Z/Y`, arrows nudge 1 u (Shift 10 u), `[ ]` reorder, `Ctrl+G` group, `F` fit, `0` 100 %, `+/-` zoom, `Space` pan, `Ctrl+S` export dialog. Show them in a `?` cheat-sheet popover.
- **Zoom/pan:** wheel = zoom to cursor, middle-drag/Space-drag = pan, "Fit" uses the stage's real `ResizeObserver` size. Zoom range 10–800 %. Rulers in **units** and px.
- **Targets:** KLWP — device frame from a profile (draw status/nav bars with the real current time, remove the hard-coded "10:10"), orientation, screen count with a **scroll scrubber** along the bottom of the stage (the Kustom "scroll" preview), home-grid overlay with configurable columns×rows. KWGT — widget size dropdown "2×2 … 5×5 + native + custom", background switch (checker / wallpaper colour / light / dark) because previews are transparent; multi-size comparison as a side-by-side popover.
- **Sim panel (popover):** darkmode, locked, orientation, time, battery, weather/music stubs — all the things formulas read — so users can reproduce the reference previews.

### 5.6 Dialogs and system feedback
- Open: drag-and-drop anywhere + file picker; accept `.klwp .kwgt .komp`; show a summary card (kind, size, modules count, fonts/bitmaps/icons found, missing resources). Locked (`internal_readonly`) files show a clear "this file is locked by its author" message instead of the current `alert()`.
- Export dialog = V4 gate (list, one-click fixes, thumbnail preview, "not yet device-tested" note), filename field, `.kwgt/.klwp/.komp` extension locked to kind, and a **Copy for phone** hint listing how to import in the paid app.
- Toasts replace `alert()`/`prompt()`; errors from rendering are shown in the status bar with a "copy details" button.
- First-run empty state: big drop zone + "New KWGT / New KLWP / New Komponent" cards (new docs created from corpus-derived templates so `preset_info` is complete).

### 5.7 Component and file plan
```
src/ui/
  shell/{AppBar,StatusBar,Layout}.tsx
  panels/{LayersPanel,GlobalsPanel,AssetsPanel}.tsx
  stage/{Stage,renderLoop,hitTest,handles,snap,rulers,frames}.ts(x)
  inspector/{Inspector,PropertyRow,editors/*,ColorPicker,FormulaDialog,FontPicker,BitmapPicker,IconPicker}.tsx
  dialogs/{OpenDialog,ExportDialog,SimPopover,ShortcutsPopover,AddModuleMenu,ContextMenu}.tsx
  icons/sprite.svg + Icon.tsx
  styles/{tokens.css,base.css,components.css}
  state/{doc.ts,selection.ts,view.ts,history.ts}   // doc.ts uses core/model/edit.ts only
```
Keep Preact + signals; no UI framework. Total CSS ≤ 15 KB gzip, JS stays ≤ 120 KB gzip (formula editor and picker are lazy-loaded chunks).

### 5.8 UI acceptance (Playwright, `tests/ui/*.spec.ts`)
1. Open a corpus KWGT: layers tree matches module count; clicking a module on the canvas selects the same node in the tree and shows its tabs.
2. Drag a module 40 px: `position_offset_*` changes by the unit-converted amount (± rounding), exactly one undo entry, export contains the new value.
3. Switch a property to fx, type `$df(hh)$`, OK: preview shows the hour, chip is fx, export has `toggle 10` + formula.
4. Switch back to value: formula kept in `internal_formulas`, toggle 0.
5. Add module via ＋ → appears under the selected group, selected, undoable.
6. Keyboard: Delete, Ctrl+C/V, Ctrl+Z, arrows, Space-pan, `F` fit — each asserted.
7. Screenshot tests at 1440×900 and 1100×700 compared to committed baselines (threshold 0.1 % pixels) for: empty state, KWGT editing, KLWP editing, formula dialog, colour picker.
8. Accessibility smoke: tab order reaches every panel, rows have `role` + labels, contrast of text tokens ≥ 4.5:1 (script computes from tokens).

---

## 6. Order of work and rough sizing

| Phase | Focus | Days | Unblocks |
|---|---|---|---|
| F0 | Reproduce, baseline | 0.5 | everything |
| F1 | State/archive integrity | 1–2 | usable export |
| F2 | Generated enums | 0.5–1 | correct positions |
| F3 | Resources | 1 | text/icons/images visible |
| F4 | Layout calibration | 2–3 | pixel-close previews |
| F5 | Painter semantics | 2–3 | masks, blend, progress |
| F9 | Verification (alongside F1–F5) | 1–2 | trustworthy "done" |
| F6–F8 | UI shell, stage, inspector | 8–10 | "feels like Kustom" |
| F10 | Hygiene | 0.5 | maintainability |

A usable app (open → edit → export that imports) exists after **F1 + F2 + F3**. Fidelity improvements and the UI redesign can then proceed in parallel branches (F4/F5 vs F6–F8) because they touch different folders (`core/layout|render` vs `ui/`), with `core/model/edit.ts` as the only shared contract.

## 7. Stop-and-ask conditions

Stop and tell the user (don't guess) when: (1) F0 shows a failure mode not in this register and not explained by it, (2) a calibration result is ambiguous (two variants within 0.01 score) — keep both behind a flag and record it, (3) export validity depends on an app behaviour only a phone can show (V5) — ship the device test and wait for results, (4) a fix needs deleting data from the user's `samples/` or rewriting git history.

## 8. Appendix — quick reference

**Verified real values (from corpus and `spec/enums.json`)**
- Anchors: `TOPLEFT TOP TOPRIGHT CENTERLEFT CENTER CENTERRIGHT BOTTOMLEFT BOTTOM BOTTOMRIGHT`
- Stacking: `VERTICAL_LEFT VERTICAL_CENTER VERTICAL_RIGHT HORIZONTAL_TOP HORIZONTAL_CENTER HORIZONTAL_BOTTOM`
- Visibility: `ALWAYS IF_NOT_LOCKED IF_LOCKED IF_LANDSCAPE IF_PORTRAIT NEVER REMOVE`
- Paint mode: `NORMAL CLEAR SRC DST XOR DARKEN LIGHTEN SCREEN ADD OVERLAY MULTIPLY`
- Gradient: `NONE HORIZONTAL VERTICAL RADIAL SWEEP BITMAP` · Mask: `NONE BACKGROUND BLURRED CLIP_NEXT CLIP_ALL LIQUID_GLASS`
- Shapes: `SQUARE CIRCLE RECT OVAL TRIANGLE RTRIANGLE EXAGON SLICE ARC SQUIRCLE PATH`
- Rotate: `NONE FLIP_X FLIP_Y DEG90 DEG180 DEG270 MANUAL CLOCK_{HOUR,MINUTE,SECOND}[_SMOOTH]`
- Progress keys: `style_{size,width,height,shape,style}`, `color_{color,bgcolor,tcolor}`, `progress_{mode,progress,max,count,level}`
- Units: 1 u = `min(w,h)/720` px × ancestor `config_scale_value`%.
- Resources: every `text_family` / `icon_set` in the sample is `kfile://org.kustom.provider/…`, sometimes in alias form `…/{widgets|wallpapers|komponents}/<Name>.<ext>/…`.

**Defect index**
P0: D01 clone · D02 anchors · D03 resources · D11 serializer/writer · D12 renderer/races
P1: D04 text metrics · D05 positioning · D06 Progress/CurvedText · D07 blend/mask layers · D08 effects · D09 visibility · D10 defaults · D20 canvas interaction · D21 inspector · D22 layers · D23 formula editor · D24 globals · D25 targets
P2: D26 misc/hygiene
