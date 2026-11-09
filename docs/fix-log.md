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
