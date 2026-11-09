# KustomWeb — Fix Baseline (Phase F0)

Date: 2026-11-10
Commit: `960ae9d`
Environment: Node v22.14.0, Windows, Vitest v3.2.7

## 1. Initial Build & Test Execution
- `cmd /c npm run build`: Passed cleanly (`tsc && vite build`).
  - Bundle size: JS 185.57 kB (54.08 kB gzip), CSS 7.90 kB (2.03 kB gzip).
- `cmd /c npm test`: Passed all 151 initial tests across 13 test files.
  - Test suites: Schema (46), Formula harvest (5,509 formulas), Perf (DarkWave), Roundtrip (46 presets), Render (2), Device Pack (4), Layout (5), Fixers (7), Clipboard (3), Targets (4), Fuzz (6), Spec Loader (6).

## 2. Defect Reproductions & Regression Tests
Four dedicated regression suites were added to `tests/regress/`, verifying defects via `it.fails`:

### D01 — Deep-copy via JSON destroys document (`tests/regress/d01-clone.test.ts`)
- **Root Cause**: `editor-state.ts` used `JSON.parse(JSON.stringify(doc))` for history and edits (`updateNodeProp`, `addNode`, `deleteNode`).
- **Failure**: Deep-cloning converts `doc.assets` (`Map<string, Uint8Array>`) into a plain object `{}` and `doc.thumbs` Uint8Array into `{ "0": ... }`.
- **Reproduced**: Calling `updateNodeProp` causes `doc.assets instanceof Map` to evaluate to `false`, and `doc.assets.has()` / `writePresetArchive(doc)` throws `TypeError: doc.assets.has is not a function`.

### D02 — Invalid Anchor Enum Names (`tests/regress/d02-anchors.test.ts`)
- **Root Cause**: `src/core/layout/position.ts` hand-coded `ANCHORS` with underscores (`TOP_LEFT`, `CENTER_LEFT`, `BOTTOM_LEFT`), whereas official Kustom files and `spec/enums.json` use `TOPLEFT`, `CENTERLEFT`, `BOTTOMLEFT`.
- **Failure**: `ANCHORS.indexOf('TOPLEFT')` returns `-1`, silently falling back to `CENTER` (`[0, 0]`).
- **Reproduced**: A node anchored at `TOPLEFT` is positioned at Center `(150, 150)` instead of `(0, 0)`.

### D03 — Resource Resolution for Fonts, Icons & Images (`tests/regress/d03-resources.test.ts`)
- **Root Cause**:
  1. `getIconSet` treated the entire `kfile://.../icons/FontAwesome.ttf` URI as `cleanName`. `endsWith(cleanName + '.json')` never matched, causing it to fall through to the first `.json` in `icons/` regardless of set name.
  2. `ResourceManager` has no preparation method that preloads images from `doc.assets`, leaving `getImage()` always `undefined`.
- **Reproduced**: In an archive with multiple icon sets, requesting `FontAwesome` erroneously resolves icons from the first set (`Feather.json`), failing to resolve glyph codes.

### D07 — Blend Modes & Mask Isolation (`tests/regress/d07-blend-mask.test.ts`)
- **Root Cause**: `CanvasPainter.paintNode` sets `ctx.globalCompositeOperation` directly on the shared root canvas without rendering the group to an isolated offscreen canvas.
- **Failure**: `CLEAR` (`destination-out`) clears previously rendered pixels across the entire canvas instead of clipping within the group.

## 3. Findings from Un-Audited Code
- **`src/ui/components/BottomDrawer.tsx`**: Line 60 uses `JSON.parse(JSON.stringify(doc))` in `handleFixAll` and calls `pushHistory(doc)`, which corrupts `undoStack` with `doc.assets` turned into `{}`.
- **`src/core/device-pack/generator.ts`**: Uses `position_anchor: { value: 'TOP_LEFT' }` (wrong underscore anchor) and `type: 'Root'` instead of `'RootLayerModule'`.
- **`src/ui/components/MultiSizeModal.tsx`**: Direct call to `renderPreset(doc, ...)` without preparing/caching resources.
- **`src/core/model/clipboard.ts`**: Contains `copyNodeToKustomClip` and `parseKustomClip` with `##KUSTOMCLIP##`, but no keyboard event handlers or UI buttons wire it up.
- **`src/core/layout/rotation.ts`**: Covers basic clock modes but lacks integration for group-level rotations (`config_rotate_*`).

## 4. Baseline DoD Status
- Baseline recorded and committed.
- Regression tests exist and pass with `.fails` in `tests/regress/`:
  - `d01-clone.test.ts`
  - `d02-anchors.test.ts`
  - `d03-resources.test.ts`
  - `d07-blend-mask.test.ts`
