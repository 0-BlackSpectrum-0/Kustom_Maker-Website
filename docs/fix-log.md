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
