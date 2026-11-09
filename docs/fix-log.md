# KustomWeb — Fix Log

## [2026-11-10] Phase F0: Reproduce and Baseline
- **Commands Run**:
  - `cmd /c npm run build` -> Passed (JS 185.57 kB / 54.08 kB gzip, CSS 7.90 kB / 2.03 kB gzip).
  - `cmd /c npm test` -> 151 tests passed across 13 test suites.
  - `cmd /c npx vitest run tests/regress` -> 4 test suites passed with expected failures (`.fails`):
    - `tests/regress/d01-clone.test.ts`
    - `tests/regress/d02-anchors.test.ts`
    - `tests/regress/d03-resources.test.ts`
    - `tests/regress/d07-blend-mask.test.ts`
- **What Changed**:
  - Created `tests/regress/` containing regression tests for D01, D02, D03, D07.
  - Created `docs/fix-baseline.md` documenting reproduction evidence, un-audited analysis, and environment baselines.
- **DoD**: Green. Phase F0 complete.

## [2026-11-10] Phase F1: State and Archive Integrity (D01, D11, D12 partial)
- **Commands Run**:
  - `cmd /c npm test` -> 18 test suites passed, 160 tests passed.
  - `cmd /c npm run build` -> Passed (JS 190.06 kB / 55.55 kB gzip, CSS 7.90 kB / 2.03 kB gzip).
- **What Changed**:
  - Created `src/core/model/edit.ts`: Immutable tree updates (`mapNode`, `editNode`, `setProp`, `addChild`, `removeNode`, `moveNode`, `cloneNode`, `cloneDoc`, `findNodeById`).
  - Created `src/core/model/json-lex.ts`: Custom JSON parser (`parseJsonWithLex`) and stringifier (`stringifyWithLex`) preserving exact numeric lexemes via `LexNumber`.
  - Updated `src/core/model/types.ts`: Added `LexNumber`, enumerable `keyOrder`, `infoKeyOrder`, and nested `globals` on `Node`.
  - Updated `src/core/model/parser.ts`: Parses nested `globals_list` on modules and sets enumerable key order fields.
  - Updated `src/core/model/serializer.ts`: Serializes nested `globals_list` on modules and respects key orders.
  - Updated `src/core/archive/writer.ts`: Deterministic zip timestamps (MS-DOS range 1980-2099) and sorted asset entries.
  - Updated `src/ui/state/editor-state.ts`: Replaced `JSON.parse(JSON.stringify(doc))` with `commit(next, label)`, capped at 200 history states.
  - Updated `ExportModal.tsx`: Fixed conditional hook order (D26), migrated `handleFixAll` to `cloneDoc` + `commit`.
  - Updated `BottomDrawer.tsx`: Migrated `handleFixAll` to `cloneDoc` + `commit`.
  - Fixed operator precedence bug in `renderer.ts` (D12).
  - Flipped `tests/regress/d01-clone.test.ts` to standard passing assertion.
  - Added `tests/unit/edit-and-lex.test.ts`.
- **DoD**: Green. D01 regression flips to pass; lossless roundtrip passes across all corpus presets.

## [2026-11-10] Phase F2: Spec Types and No Handwritten Enums (D02, D09, D10)
- **Commands Run**:
  - `node tools/gen-spec.mjs` -> Generated `src/core/spec/generated.ts`.
  - `cmd /c npm test` -> 19 test suites passed, 161 tests passed.
  - `cmd /c npm run build` -> Passed (JS 218.33 kB / 59.01 kB gzip, CSS 7.90 kB / 2.03 kB gzip).
- **What Changed**:
  - Created `tools/gen-spec.mjs` to generate `src/core/spec/generated.ts` from `spec/enums.json`, `spec/modules.json`, `spec/defaults.json`.
  - Updated `src/core/layout/position.ts`: Replaced handwritten anchor strings with generated `AnchorMode` and `ANCHOR_GRAVITY` mapping.
  - Updated `src/core/layout/resolver.ts`: Module-aware property defaults populated from `spec/modules.json` in `resolveAll()`.
  - Updated `src/core/layout/measure.ts`: Integrated generated `VisibleModeValues`, `ShapeValues`, `PaintStyleValues`; implemented full `VisibleMode` evaluation.
  - Updated `src/core/layout/types.ts`: Switched to generated `AnchorMode`.
  - Updated `src/ui/components/Inspector.tsx`: Replaced handwritten string lists with generated `*Values` arrays.
  - Updated `src/core/device-pack/generator.ts`: Changed root module to `RootLayerModule` and anchor to `TOPLEFT`.
  - Added `tests/unit/no-handwritten-enums.test.ts` verifying no rogue handwritten enum literals.
  - Flipped `tests/regress/d02-anchors.test.ts` to standard passing assertion.
- **DoD**: Green. D02 regression passes; zero handwritten enums in layout and inspector.

## [2026-11-10] Phase F3: Resources - Images, Fonts, Icons, and Assets Panel (D03)
- **Commands Run**:
  - `cmd /c npx vitest run tests/regress/d03-resources.test.ts` -> 4 tests passed.
  - `cmd /c npm test` -> 19 test suites passed, 163 tests passed.
  - `cmd /c npm run build` -> Passed (JS 225.94 kB / 61.10 kB gzip, CSS 7.90 kB / 2.03 kB gzip).
  - `node tools/check-size.mjs` -> Passed (JS: 59.66 KB gzip <= 120 KB, CSS: 1.98 KB gzip <= 15 KB).
- **What Changed**:
  - Implemented `src/core/render/resources.ts`:
    - `ResourceManager.prepare(doc)`: decodes bitmaps (`createImageBitmap` in browser, `loadImage` in Node) and registers fonts (`FontFace` in browser, `GlobalFonts.register` in Node) using deterministic CSS families (`kw_<fnv1a-hash>`).
    - Strictly pairs `<Set>.ttf` with `<Set>.json` by basename, preventing fallback pollution across multi-icon-set archives.
    - Single universal `resolve(uri)` covering exact, alias tail (`.../wallpapers/<Name>.klwp/...`), and case-insensitive resolution.
    - `listReferences(doc)` inspects all document nodes for referenced resources and returns status (`exact`, `alias`, `case_insensitive`, `missing`, `invalid_provider`).
  - Updated `src/core/render/painter.ts`:
    - Quotes font family (`"${fam}", sans-serif`) to prevent invalid CSS syntax.
    - Added dev-mode assertion warning if canvas ignores font assignment.
    - Implemented `fx_gradient: BITMAP` pattern fill.
    - Connected `paintBitmap` and `paintBackground` to `resources.getImage()`.
  - Updated `src/core/render/renderer.ts`:
    - Added `getResourceManagerForDoc(doc)` cached on WeakMap by document identity.
  - Updated `src/ui/components/LeftPanel.tsx`:
    - Added comprehensive **Resources panel** under Assets tab surfacing all referenced `kfile://` URIs with status badges (`OK`, `ALIAS`, `MISSING`), resolved paths, and module tags.
  - Flipped `tests/regress/d03-resources.test.ts` to standard passing assertions.
- **DoD**: Green. D03 regression passes; custom fonts, alias icon sets, and bitmaps decode and resolve cleanly in both browser and Node.

## [2026-11-10] Phase F4: Layout Correctness, Text Measurement & Calibrated Positioning (D04, D05, D10)
- **Commands Run**:
  - `cmd /c npx vitest run tests/regress/d04-text-measure.test.ts tests/regress/d05-positioning.test.ts` -> 4 tests passed.
  - `cmd /c npm test` -> 21 test suites passed, 167 tests passed.
  - `cmd /c npm run build` -> Passed (JS 228.22 kB / 61.90 kB gzip, CSS 7.90 kB / 2.03 kB gzip).
  - `node tools/check-size.mjs` -> Passed (JS <= 120 KB gzip).
- **What Changed**:
  - Created `src/core/layout/text-measure.ts`:
    - Canvas 2D measurement context integration (`measureText`) with font metric cache `(font, fontSize, text)`.
    - Implemented word-wrapping for `FIXED_WIDTH` text sizing against `text_width` and `text_lines`.
    - Implemented proportional font downscaling for `SINGLE_FIXED_WIDTH`.
    - Fallback heuristic character weight calculations if running headless without canvas.
  - Updated `src/core/layout/measure.ts`:
    - Replaced hardcoded `0.55 * fontSize` guess with `layoutTextModule()`.
    - Attached `textLayout` (`lines`, `fontSize`, `lineHeight`, `maxLineWidth`, `totalHeight`) to `LayoutNode`.
  - Updated `src/core/render/painter.ts`:
    - `paintText` uses pre-calculated `node.textLayout` lines and font size, guaranteeing zero layout-to-paint drift.
  - Updated `src/core/layout/position.ts`:
    - Position offsets apply to children of `OverlapLayerModule` and `KomponentModule` as well as root.
    - Integrated multi-screen horizontal scroll offset calculation for KLWP (`screenScrollX`).
  - Updated `spec/render-semantics.md`:
    - Added calibrated text measurement, wrapping, scaling, and screen scroll semantics.
  - Added regression test suites:
    - `tests/regress/d04-text-measure.test.ts`
    - `tests/regress/d05-positioning.test.ts`
- **DoD**: Green. D04 and D05 regression tests pass; text measurement reflects real font metrics and wrapping modes.

## [2026-11-10] Phase F5: Painter Semantics - Blend Modes, Offscreen Isolation, Progress & Curved Text (D06, D07, D08)
- **Commands Run**:
  - `cmd /c npx vitest run tests/regress/d07-blend-mask.test.ts` -> Passed.
  - `cmd /c npx vitest run tests/unit/no-handwritten-enums.test.ts` -> Passed.
  - `cmd /c npm test` -> 21 test suites passed, 167 tests passed.
  - `cmd /c npm run build` -> Passed (JS 232.24 kB / 62.86 kB gzip, CSS 7.90 kB / 2.03 kB gzip).
  - `node tools/check-size.mjs` -> Passed (JS 61.38 KB gzip <= 120 KB gzip, CSS 1.98 KB gzip <= 15 KB gzip).
- **What Changed**:
  - Updated `src/core/render/painter.ts`:
    - Added offscreen canvas isolation buffer for groups (`OverlapLayerModule`, `StackLayerModule`, `KomponentModule`) containing children with non-NORMAL blend modes (`CLEAR`, `XOR`, `SRC`) or clipping masks (`CLIP_NEXT`, `CLIP_ALL`), preventing destructive blend modes from wiping the outer stage canvas.
    - Implemented `paintProgress`: linear bars and circular arc progress sweeps with background track and progress fill.
    - Implemented `paintCurvedText`: circular arc character placement and rotation along radius.
    - Exported `CanvasPainter` alias for testing and consumer flexibility.
  - Updated `src/core/layout/measure.ts`:
    - Added real dimension measurement for `ProgressModule` (linear width x height or circular diameter) and `CurvedTextModule` (diameter from radius).
    - Preserved zero handwritten enum rule by aligning progress style checking with spec enum `ProgressStyleValues` (`CIRCLE`, `LINEAR`).
  - Flipped `tests/regress/d07-blend-mask.test.ts` to standard passing assertions.
- **DoD**: Green. D06, D07, and D08 painter semantics implemented and isolated offscreen; all regression and unit test suites green.

## [2026-11-10] Phase F6–F8: Official Kustom UI Shell, Stage Interaction & Spec Inspector
- **Commands Run**:
  - `cmd /c npx vitest run tests/unit/ui-shell.test.ts` -> 3 tests passed.
  - `cmd /c npx vitest run tests/unit/no-handwritten-enums.test.ts` -> Passed (0 unknown enum literals).
  - `cmd /c npm test` -> 22 test suites passed, 170 tests passed.
  - `cmd /c npm run build` -> Passed (JS 248.47 kB / 66.70 kB gzip, CSS 18.32 kB / 3.64 kB gzip).
  - `node tools/check-size.mjs` -> Passed (JS 65.14 KB gzip <= 120 KB gzip, CSS 3.56 KB gzip <= 15 KB gzip).
- **What Changed**:
  - Implemented `src/ui/icons/icons.tsx`: Material-Symbols-style clean SVG icon sprite for all module types (Text, Shape, Image, FontIcon, Progress, CurvedText, Series, Overlap, Stack, Komponent, AnimatedImage) and official editor actions (Save, Undo, Redo, Add, Lock/Unlock, Screen, Fit, Layers, Play/Pause).
  - Implemented `src/ui/dialogs/AddModuleModal.tsx`: Replica of the official Kustom "New Item" dialog (`samples/klwp ui samples/tempFileForShare_20261110-020324.jpg`) with 2-column card grid, icons, bold titles, and descriptions.
  - Overhauled `src/ui/components/TopBar.tsx`: Hamburger menu dropdown, interactive Breadcrumb bar (`Root > Group > Item`), preset kind & dimensions badge, orientation/grid/frame toggles, live-state Undo/Redo, Quick Save, and Export button.
  - Overhauled `src/ui/components/LeftPanel.tsx`: Official tabs (`ITEMS`, `GLOBALS`, `ASSETS`), module tree with type icons, titles, subtitles, reorder arrows, delete actions, Floating Action Button (`+` FAB), and modal-based global variable creation (eliminating `prompt()`).
  - Overhauled `src/ui/components/CanvasArea.tsx`: Interactive selection outline with corner handles, canvas hit-testing to click-select elements, official right vertical floating tools strip (Screen index, Fit to stage, Lock toggle, Grid/Layers toggle, Play/Pause simulation), and bottom zoom/scale bar.
  - Overhauled `src/ui/components/Inspector.tsx`: Dynamic module tabs with red underline indicator, number steppers (`<<`, `-`, value, `+`, `>>`), color picker swatch + hex input, source toggle button (`val` / `fx` / `gv`), and complete property support across all module types.
  - Implemented `src/ui/components/StatusBar.tsx`: 26px status bar with validation status badge + problems popover, simulated clock/battery/network indicators, and unit scale readout (`1 u = X px`).
  - Overhauled `src/ui/styles/editor.css`: Material-3 dark slate tokens (`#121214`, `#1A1A1E`, `#24242A`), red accent underline (`#E53935`), and responsive flexbox stage layout.
  - Added unit test suite `tests/unit/ui-shell.test.ts`.
- **DoD**: Green. Official Kustom look-and-feel established; all 22 test suites passing cleanly; JS size 65.14 KB gzip (well under 120 KB budget).

## [2026-11-10] Phase F9 & F10: Corpus Verification Gate & Repo Hygiene
- **Commands Run**:
  - `node tools/verify/verify.mjs --struct` -> Passed (L1/L2: 46 passed, 0 failed. L3: 46 passed, 0 failed).
  - `node tools/verify/verify.mjs --export` -> Passed.
  - `cmd /c npm test` -> 22 test suites passed, 170 tests passed.
  - `cmd /c npm run build` -> Passed.
  - `node tools/check-size.mjs` -> Passed (JS 65.14 KB gzip, CSS 3.56 KB gzip).
- **What Changed**:
  - Updated `src/core/model/types.ts`: explicitly declared `public readonly v: number;` and `public readonly raw: string;` on `LexNumber` constructor to eliminate Node v26 strip-only TypeScript syntax incompatibility.
  - Fixed `index.html`: removed redundant `<link rel="stylesheet">` (handled by Vite CSS chunk) and made manifest link relative (`./manifest.json`).
  - Updated `src/main.tsx`: added global `ErrorBoundary` component with clean error dialog and reload trigger.
  - Updated `.gitignore`: removed `reports/` exclusion so `reports/summary.json` is tracked while ignoring screenshot images; added `samples/_src/`, `samples/extra/`, and `samples/iconpacks/`.
  - Added comprehensive `README.md` documenting architecture, zero-handwritten-enum policy, immutable state model, verification results, and dev commands.
- **DoD**: Green. All 46 corpus presets pass L1-L3 verification; all 22 test suites passing (170 tests); repo hygiene clean.



