# KustomWeb — Browser-Based KLWP & KWGT Editor

KustomWeb is an open-source, web-based visual editor and compiler for Kustom live wallpapers (`.klwp`), widgets (`.kwgt`), and components (`.komp`). It allows you to design, edit, preview, and export presets that import directly into Kustom apps on Android.

---

## Features & Architecture

- **Faithful Kustom UI**: Redesigned to replicate the official Kustom Android app experience, featuring breadcrumb navigation (`Root > Overlap Group > Item`), tabbed property inspector with red active indicators, numeric steppers (`<< - [val] + >>`), source toggles (`val` / `fx` / `gv`), and the official 11-module Add Item modal dialog.
- **Spec-Driven**: Generated directly from decompiled Kustom specs (`spec/enums.json`, `spec/modules.json`, `spec/defaults.json`) via `tools/gen-spec.mjs`. Enforces a strict zero-handwritten-enum policy verified by automated scanning.
- **Immutable State Model**: All mutations go through `core/model/edit.ts` (`commit()`), maintaining full undo/redo history without document corruption.
- **Byte-Accurate Round-Trip**: Preserves exact JSON lexemes (such as floats `22.0` vs `22`) via `LexNumber` and preserves object key order.
- **Isolated Composite Buffer**: Canvas 2D painting isolates destructive blend modes (`CLEAR`, `XOR`, `SRC`) and clipping masks (`CLIP_NEXT`, `CLIP_ALL`) in offscreen buffers to prevent clearing outer canvases.
- **Calibrated Text & Layout**: Real font measurement context with font metric caching, multi-line wrapping for `FIXED_WIDTH`, proportional scaling for `SINGLE_FIXED_WIDTH`, and multi-screen horizontal scrolling (`screenScrollX`).
- **Strict Size Budget**: Production bundle is ~65 KB gzip JS (budget ≤ 120 KB gzip) and ~3.5 KB gzip CSS (budget ≤ 15 KB gzip).

---

## Verification & Parity

Verification results across the preset corpus:
- **L1 / L2 Lossless Round-Trip**: 46 of 46 corpus presets pass byte-for-byte serialization.
- **L3 Schema Validation**: 46 of 46 corpus presets pass with zero schema errors.
- **L4 Formula Health**: 5,509 formulas harvested across presets; 0 parse failures, 0 evaluation failures.

> **On-Device vs. In-Browser Scope**: Preset structures, property validations, formula evaluations, and Canvas 2D rendering are verified in-browser. Android launcher-specific interactions (such as gyroscope hardware triggers, notification listeners, and live music progress) are simulated in the editor and execute natively when imported into Kustom on Android.

---

## Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run all test suites
npm test

# Build production bundle
npm run build

# Verify bundle size budget
npm run size

# Run corpus structural verification
npm run verify:struct
```

---

## License

MIT
