
## Iteration 0: Phase 0 Reconnaissance & Inventory
Date: 2026-11-09T16:04:39.255Z
Command: node tools/inventory.mjs
Summary: 40 KWGT, 2 KLWP, 1 KOMP, 3 APK extras, 69 KWGT preview PNGs, 8 DarkWave screenshot downloads.
Evidence: samples/manifest.json, docs/corpus-report.md, docs/spec-corrections.md
Next: Spec extraction (Phase 0.4)

## Iteration 1: Phase 1 Lossless Model & Archive Round-Trip
Date: 2026-11-09T16:25:30Z
Command: npm.cmd test (vitest run)
Summary: 53 tests passed (6 unit tests, 47 integration tests across 46 presets). 0 failures.
By class: STRUCT_LOSS 0 · SCHEMA 0 · ZIP_LAYOUT 0 · FORMULA 0 · RENDER_DIFF 0 · EXPORT_STYLE 0
Pass conditions: L1 (canonical JSON equality) and L2 (archive layout & byte fidelity) verified across all 46 corpus presets (40 KWGT, 2 KLWP, 1 KOMP, 3 APK extras).
Evidence: tests/integration/roundtrip.test.ts, tests/unit/spec-loader.test.ts
Next: Phase 2 (Spec-driven validation + fixers)

## Iteration 2: Phase 2 Validation + Phase 3 Formula Engine
Date: 2026-11-09T16:45:50Z
Command: npm.cmd test (vitest run)
Summary: 126 tests passed across 6 test suites. 0 failures.
By class: STRUCT_LOSS 0 · SCHEMA 0 · ZIP_LAYOUT 0 · FORMULA 0 · RENDER_DIFF 0 · EXPORT_STYLE 0
Pass conditions:
- L3 (Schema): 0 schema errors across all 46 corpus presets (tests/integration/schema.test.ts).
- Fixer test suite: 7/7 break-then-repair tests passing (tests/unit/fixers.test.ts).
- Formula unit tests: 19/19 passing (T1 exact: gv, ce, si, tc, if, df, mu, lv, tf, cm, fl, dp; T2 simulated: bi, wi, wf, mi, ai, ni, bp, monet; Pratt parser, tokenizer, AST).
- L4 (Formula Health): 5,509 formulas harvested across all 46 presets in the corpus; 100% parsed with 0 errors and evaluated under Sim with 0 failures (tests/integration/formula-harvest.test.ts).
Evidence: tests/integration/formula-harvest.test.ts, tests/unit/formula.test.ts, tests/integration/schema.test.ts
Next: Phase 4 (Layout & Canvas 2D Renderer)

## Iteration 3: Phases 4-9 (Renderer, Editor UI, Targets, Export & Hardening)
Date: 2026-11-09T17:42:00Z
Command: npm.cmd test && npm.cmd run size && npm.cmd run verify:struct
Summary: 151 vitest tests passed across 13 test suites. 0 failures. 0 errors.
By class: STRUCT_LOSS 0 · SCHEMA 0 · ZIP_LAYOUT 0 · FORMULA 0 · RENDER_DIFF 0 · EXPORT_STYLE 0

Pass conditions:
- Phase 4 (Layout & Canvas 2D Renderer):
  - 9 shape geometries, 9-anchor layout positioning, layer stacking with margins.
  - Blend modes (CLEAR -> destination-out, XOR, MULTIPLY, SCREEN, OVERLAY), clipping masks (CLIP_NEXT, CLIP_ALL).
  - Clock rotations (CLOCK_HOUR, CLOCK_MINUTE, CLOCK_SECOND, smooth modes).
  - L5 / L6 visual verification: tested on 69 preview PNGs across KWGT corpus, alpha IoU baselines saved to `reports/visual-baselines.json`.
- Phase 5 (Editor UI MVP):
  - Desktop-class Figma/Photopea Preact UI with reactive signals.
  - Layers tree, 3-way source toggle Inspector (Val / fx / gv), formula editor with live evaluation.
  - Interactive undo/redo stack, hotkeys, dark-mode styling.
- Phase 6 (Targets in Depth):
  - Device profiles (Pixel 8, Pixel 8 Pro, Galaxy S24, S24 Ultra, Nothing Phone 2) with status/nav bar overlays.
  - Widget size presets (1x1, 2x1, 2x2, 3x3, 4x1, 4x2, 4x4, 5x5) calibrated per Appendix B.
  - Multi-screen scroll bar with screen counts and live scroll progress for KLWP.
  - Home launcher grid overlay with customizable columns/rows.
  - Multi-Size 2x2 / 4x2 / 4x4 side-by-side preview modal.
- Phase 7 (Export Fidelity & Pre-Export Gate):
  - Pre-export validation gate (`ExportModal.tsx`) with L2/L3/L4 health checks and 1-click deterministic auto-fix.
  - WebP thumbnail handling and asset pruning option.
  - Device Test Pack generator: builds `kustomweb-device-test-pack.zip` with 5 targeted test presets and README instructions.
  - Screenshot drop-zone (L8) in BottomDrawer for on-device screenshot comparison.
- Phase 8 & 9 (Completeness, Polish & Hardening):
  - `##KUSTOMCLIP##` clipboard serialize and parse with automatic ID regeneration.
  - Offline PWA manifest and service worker.
  - Fuzz testing (`tests/unit/fuzz.test.ts`): gracefully rejects empty, corrupt, truncated archives and refuses locked (`internal_readonly: true`) archives.
  - Scale & benchmark test (`tests/integration/perf.test.ts`): imports DarkWave Release (~700 modules, 24.6 MB unpacked) in 1587 ms and computes layout in 155 ms.
  - Size budget check (`npm run size`): JS 52.82 KB gzip (budget <= 120 KB), CSS 1.98 KB gzip (budget <= 15 KB).
Evidence: reports/summary.json, reports/perf.json, reports/visual-baselines.json, docs/MAINTENANCE.md
