# KustomWeb Maintenance & Version Drift Guide

This document describes how to maintain KustomWeb, update specs when new versions of Kustom (KLWP, KWGT, KLCK) are released, and verify fidelity.

---

## 1. Updating Specifications on New Kustom Releases

When official Kustom Android apps are updated:

### 1.1 Step 1: Harvest New Presets & APK Metadata
Place newly exported `.klwp`, `.kwgt`, or `.komp` files into `samples/extra/` or update sample repositories:
```powershell
npm run fetch
```
This fetches sample presets, updates `samples/manifest.json`, and records corpus metadata.

### 1.2 Step 2: Re-extract Specs
Run the spec extraction tool to regenerate `spec/*.json` with updated schema definitions, enum values, and defaults:
```powershell
npm run spec:extract
```
The spec extractor updates:
- `spec/enums.json`: Discovered enum constants (shapes, blend modes, alignments, stacking modes)
- `spec/modules.json`: Discovered module types and their valid properties
- `spec/defaults.json`: Implicit default property values (omitted defaults)
- `spec/functions.json`: Recognized formula functions and parameter signatures
- `spec/archive-layout.json`: Archive layout conventions, compression methods, and thumbnail naming
- `spec/provenance.json`: Metadata linking each spec entry to its source sample preset

### 1.3 Step 3: Run Full Verification Suite
```powershell
npm test
npm run verify
```
All automated tests must pass:
- **L1 / L2**: Lossless roundtrip on all corpus presets (canonical equality)
- **L3**: Spec-driven schema validation (zero schema errors on untouched presets)
- **L4**: Formula harvest test (zero parse or evaluation errors across thousands of formulas)
- **L5 / L6**: Visual baselines comparison against reference preview images
- **L7**: Interactive editor and target rendering tests
- **L8**: On-device test pack verification

---

## 2. Adding New Formula Functions

Formula function implementations live in `src/core/formula/functions/`:
- `t1-exact.ts`: Exact implementations (deterministic arithmetic, strings, dates, colors, loops, globals, locals)
- `t2-simulated.ts`: Sensor/simulation functions (`mi`, `bi`, `wi`, `wf`, `ai`, etc.) that read from `SimState`
- `t3-placeholder.ts`: System shell/broadcast functions (`sh`, `wg`, `br`, `cd`)

When adding a function:
1. Register its dispatcher in `src/core/formula/functions/registry.ts`.
2. Add its signature and parameter documentation to `spec/functions.json`.
3. Add unit test cases in `tests/unit/formula.test.ts`.
4. Re-run `npm test` to verify zero regression across the 5,500+ harvested corpus formulas.

---

## 3. Pre-Export Validation & Deterministic Auto-Fixers

All deterministic fixers live in `src/core/validate/fixers/index.ts`:
- `F-info-missing`: Populates missing `preset_info` fields
- `F-color-format`: Normalizes `#RGB` and `#RRGGBB` to standard `#AARRGGBB` uppercase
- `F-default-omit`: Strips properties that exactly match Kustom default values to minimize file size
- `F-kfile-alias`: Normalizes legacy alias URIs (`kfile://org.kustom.provider/widgets/...`) to canonical root paths

Every fixer must maintain a break-then-repair test in `tests/unit/fixers.test.ts`.

---

## 4. Performance Budgets

| Metric | Budget | Current Measured |
|---|---|---|
| Initial Bundle JS (gzip) | ≤ 120 KB | 54.09 KB |
| Initial Bundle CSS (gzip) | ≤ 15 KB | 2.03 KB |
| DarkWave Import (678 modules) | ≤ 3500 ms (Node cold) / ≤ 1500 ms (Browser) | 1587 ms |
| DarkWave Layout Compute | ≤ 1000 ms | 155 ms |

Check bundle sizes on every build:
```powershell
npm run build
```
Verify performance benchmarks:
```powershell
npx vitest run tests/integration/perf.test.ts
```
