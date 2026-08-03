# PR 106 Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PR 106's catalog lookup and bundle-budget tooling fail closed, keep diagnostic reports out of deployed client assets, and cover every selected review finding without changing product behavior.

**Architecture:** Preserve the existing generated-catalog and bundle-budget modules. Add validation at their current ingestion boundaries, reuse the existing reachability graph for complete artifact-set checks, and keep calibration/reporting as small Node scripts with pure helpers for unit coverage. Production builds remain unchanged unless `CATALOG_BUNDLE_REPORT=1` explicitly enables diagnostic output.

**Tech Stack:** TypeScript 5.9, Vite 8/Rollup types, React Router build, Vitest 4, Node `fs/promises`, GitHub Actions YAML, pnpm 10.

## Global Constraints

- Work only in `/Users/ori/repos/weatherpane/.worktrees/80-search-catalog-load-performance` on `chore/80-search-catalog-load-performance` for issue #80 / PR #106.
- Do not rebase the already-pushed shared branch.
- Keep search ranking, URL/IME behavior, location selection, and generated catalog contents unchanged.
- Keep Detail bootstrap test naming and build-provenance schema work out of scope.
- Use Korean for code comments, runtime messages, documentation, and Conventional Commit subjects.
- Write a failing test before each production behavior change and observe the expected RED.
- Do not reply to or resolve GitHub review threads without separate explicit authorization.
- UI behavior is unchanged; Playwright and screenshots are not required.

## File Responsibilities

- `frontend/entities/location/model/catalog-artifacts.ts`: generated lookup shape contract and fixed catalog ID width.
- `frontend/entities/location/model/catalog-lookup.ts`: runtime default lookup ingestion and aligned ID lookup.
- `scripts/client-bundle-budget.ts`: bundle graph validation, generated budget validation, generated JSON loading, calibration increase guard, and evidence calculations.
- `scripts/calibrate-client-bundle-budget.ts`: read report/current budget, reject implicit increases, and write calibrated limits.
- `scripts/check-client-bundle-budget.ts`: read validated generated inputs and check the built graph.
- `scripts/client-bundle-report.ts`: opt-in Rollup chunk measurement and report writing outside `build/client`.
- `.github/workflows/ci.yml`: enable report generation in the existing production build used by the budget gate.
- `docs/performance/search-catalog-load-budget.md`: operator commands, report path, and explicit increase procedure.
- `tests/catalog-lookup-artifact.test.ts`: malformed lookup ingestion and aligned lookup behavior.
- `tests/client-bundle-budget.test.ts`: graph isolation, schema validation, evidence baseline, calibration, and fail-closed branches.
- `tests/client-bundle-generated-files.test.ts`: missing/malformed generated JSON behavior.
- `tests/client-bundle-report.test.ts`: opt-in plugin behavior and report output placement.
- `tests/search-catalog-engine.test.ts`: popular-location read bound derived from input count.
- `docs/journal/journal-pr-106-review.md`: verified review decisions and execution evidence.

---

### Task 1: Harden and optimize the lookup artifact

**Files:**

- Create: `tests/catalog-lookup-artifact.test.ts`
- Modify: `frontend/entities/location/model/catalog-artifacts.ts`
- Modify: `frontend/entities/location/model/catalog-lookup.ts`
- Test: `tests/search-catalog-engine.test.ts`

**Interfaces:**

- Produces: `GENERATED_CATALOG_LOCATION_ID_LENGTH = 12`.
- Produces: `assertGeneratedCatalogLookup(lookup: GeneratedCatalogLookup): void`.
- Preserves: `getCatalogEntryById(catalogLocationId: string, catalog?: LocationCatalog): CatalogEntry | null`.

- [ ] **Step 1: Write the failing malformed-entry-count test**

Create `tests/catalog-lookup-artifact.test.ts` with a module-level mock that supplies one fixed-width ID but zero entries, resets modules after each case, and expects importing `catalog-lookup.ts` to reject:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

const lookupArtifactPath =
  '../frontend/entities/location/catalog.lookup.generated.json';
const catalogLookupPath = '../frontend/entities/location/model/catalog-lookup';

afterEach(() => {
  vi.doUnmock(lookupArtifactPath);
  vi.resetModules();
});

describe('catalog lookup artifact validation', () => {
  it('rejects an artifact whose entry count does not match total', async () => {
    vi.doMock(lookupArtifactPath, () => ({
      default: { entries: [], ids: 'aaaaaaaaaaaa', total: 1, version: '1' },
    }));

    await expect(import(catalogLookupPath)).rejects.toThrow(
      'catalog-lookup: fixed-width ID artifact length is invalid'
    );
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm exec vitest run tests/catalog-lookup-artifact.test.ts
```

Expected: FAIL because the current guard accepts `ids.length === total * 12` without checking `entries.length`.

- [ ] **Step 3: Implement the minimum lookup shape contract**

In `catalog-artifacts.ts`, export the fixed width and validator:

```ts
export const GENERATED_CATALOG_LOCATION_ID_LENGTH = 12;

export function assertGeneratedCatalogLookup(
  lookup: GeneratedCatalogLookup
): void {
  if (
    lookup.ids.length !== lookup.total * GENERATED_CATALOG_LOCATION_ID_LENGTH ||
    lookup.entries.length !== lookup.total
  ) {
    throw new Error(
      'catalog-lookup: fixed-width ID artifact length is invalid'
    );
  }
}
```

Import and call the validator once in `catalog-lookup.ts` immediately after casting the generated JSON.

- [ ] **Step 4: Run the new test and verify GREEN**

Run:

```bash
pnpm exec vitest run tests/catalog-lookup-artifact.test.ts tests/catalog-generation.test.ts
```

Expected: both files PASS with pristine output.

- [ ] **Step 5: Add aligned-lookup characterization coverage**

Extend `tests/catalog-lookup-artifact.test.ts` with a valid two-entry mock whose cross-boundary substring is 12 characters but is not an actual ID. Assert that the cross-boundary value returns `null`, while the second aligned ID returns its reconstructed entry. This coverage must pass before and after the refactor.

- [ ] **Step 6: Refactor default lookup to aligned `indexOf`**

Keep the custom catalog path unchanged. For the default artifact:

```ts
if (catalogLocationId.length !== GENERATED_CATALOG_LOCATION_ID_LENGTH) {
  return null;
}

let idStart = defaultLookup.ids.indexOf(catalogLocationId);
while (idStart !== -1 && idStart % GENERATED_CATALOG_LOCATION_ID_LENGTH !== 0) {
  idStart = defaultLookup.ids.indexOf(catalogLocationId, idStart + 1);
}

if (idStart === -1) return null;
const entryIndex = idStart / GENERATED_CATALOG_LOCATION_ID_LENGTH;
```

Use `entryIndex` for the existing tuple reconstruction without changing its return shape.

- [ ] **Step 7: Verify lookup behavior**

Run:

```bash
pnpm exec vitest run tests/catalog-lookup-artifact.test.ts tests/catalog-generation.test.ts tests/search-catalog-engine.test.ts
```

Expected: all tests PASS with pristine output.

- [ ] **Step 8: Commit the lookup unit**

```bash
git add frontend/entities/location/model/catalog-artifacts.ts frontend/entities/location/model/catalog-lookup.ts tests/catalog-lookup-artifact.test.ts
git commit -m "fix(catalog): 조회 산출물 검증과 ID 검색 보강"
```

Done-check: malformed entry counts fail with the artifact error, aligned IDs reconstruct correctly, cross-boundary matches return `null`, and the commit contains only lookup-related files.

---

### Task 2: Make bundle isolation and generated budgets fail closed

**Files:**

- Modify: `scripts/client-bundle-budget.ts`
- Modify: `scripts/check-client-bundle-budget.ts`
- Modify: `tests/client-bundle-budget.test.ts`

**Interfaces:**

- Produces: `ValidatedCatalogBundleBudgets { baseline: CatalogBundleBytes; limits: CatalogBundleBudgets }`.
- Changes: `assertGeneratedCatalogBundleBudgets(...): ValidatedCatalogBundleBudgets`.
- Changes: `assertCatalogBundleBudget(report, budgets, baseline = catalogBundleBaseline): CatalogBundleEvidence`.

- [ ] **Step 1: Add a failing duplicate-artifact isolation test**

In `tests/client-bundle-budget.test.ts`, create reports that retain the normal owned Search/lookup chunks, add a second chunk containing the same artifact module, and make the opposite route reach only that duplicate. Add one assertion for Search leakage into Detail and one for lookup leakage into Search.

- [ ] **Step 2: Run the isolation test and verify RED**

Run:

```bash
pnpm exec vitest run tests/client-bundle-budget.test.ts -t "중복된 카탈로그 청크"
```

Expected: FAIL because `findChunkByModuleSuffix` checks only the first matching artifact chunk.

- [ ] **Step 3: Check every artifact-bearing chunk**

Reuse `findCatalogChunks(report.chunks, suffix, errorMessage)` to collect the complete Search and lookup artifact sets. Fail if any Search artifact file is Detail-reachable or any lookup artifact file is Search-reachable:

```ts
if (
  searchArtifactChunks.some((chunk) =>
    detailReachableFileNames.has(chunk.fileName)
  )
) {
  throw new Error('Detail 라우트가 검색 카탈로그에 도달합니다.');
}
```

Apply the symmetric lookup check and remove the single-artifact variables.

- [ ] **Step 4: Run the isolation test and verify GREEN**

Run:

```bash
pnpm exec vitest run tests/client-bundle-budget.test.ts -t "중복된 카탈로그 청크"
```

Expected: PASS.

- [ ] **Step 5: Add failing generated-schema tests**

Add tests that pass formula-correct objects through `unknown` casts and expect exact failures for `version: 2` and a mismatched `baseline`. Add an assertion that the valid result has this shape:

```ts
expect(assertGeneratedCatalogBundleBudgets(validGeneratedBudgets)).toEqual({
  baseline: { gzipBytes: 847_465, rawBytes: 8_733_640 },
  limits: deriveCatalogBundleBudgets(measured),
});
```

- [ ] **Step 6: Run the schema tests and verify RED**

Run:

```bash
pnpm exec vitest run tests/client-bundle-budget.test.ts -t "생성 예산"
```

Expected: FAIL because version/baseline are ignored and the current return value is limits only.

- [ ] **Step 7: Implement validated schema output**

Add exact runtime checks before the existing headroom/formula checks:

```ts
if (generatedBudgets.version !== 1) {
  throw new Error('카탈로그 예산 파일 버전이 일치하지 않습니다.');
}
if (
  generatedBudgets.baseline.rawBytes !== catalogBundleBaseline.rawBytes ||
  generatedBudgets.baseline.gzipBytes !== catalogBundleBaseline.gzipBytes
) {
  throw new Error('카탈로그 baseline이 일치하지 않습니다.');
}
```

Return `{ baseline: generatedBudgets.baseline, limits }` after formula validation.

- [ ] **Step 8: Add and satisfy the validated-baseline evidence test**

First add a test that passes a custom baseline as the third argument to `assertCatalogBundleBudget` and expects delta/percentage calculations to use it. Observe RED because the current function ignores the third argument. Then pass `baseline` into `toRouteEvidence` and use it instead of the module constant. Re-run the targeted test and observe GREEN.

- [ ] **Step 9: Update the check script consumer**

Change `check-client-bundle-budget.ts` to destructure `{ baseline, limits }`, pass `limits` and `baseline` into `assertCatalogBundleBudget`, and pass `limits` to `formatCatalogBundleEvidence`.

- [ ] **Step 10: Add complete fail-closed characterization cases**

Cover and assert exact messages for:

- empty `chunks`
- missing Detail route
- missing Search artifact
- Search route present but not reaching Search artifact
- Detail route present but not reaching lookup artifact

These cases characterize existing intended failures; run them after the behavior changes to guard the full gate.

- [ ] **Step 11: Verify the full budget test file**

Run:

```bash
pnpm exec vitest run tests/client-bundle-budget.test.ts
```

Expected: PASS with pristine output.

- [ ] **Step 12: Commit the bundle validation unit**

```bash
git add scripts/client-bundle-budget.ts scripts/check-client-bundle-budget.ts tests/client-bundle-budget.test.ts
git commit -m "fix(bundle): 경로 격리와 생성 예산 검증 보강"
```

Done-check: duplicate artifact chunks fail from either route, invalid generated metadata fails, evidence uses the validated baseline, and every fail-closed branch is covered.

---

### Task 3: Add generated-file errors and calibration anti-ratchet

**Files:**

- Create: `tests/client-bundle-generated-files.test.ts`
- Modify: `scripts/client-bundle-budget.ts`
- Modify: `scripts/calibrate-client-bundle-budget.ts`
- Modify: `scripts/check-client-bundle-budget.ts`
- Modify: `tests/client-bundle-budget.test.ts`

**Interfaces:**

- Produces: `readGeneratedJsonFile<T>(filePath: string, prerequisiteCommand: string): Promise<T>`.
- Produces: `readOptionalGeneratedJsonFile<T>(filePath: string, prerequisiteCommand: string): Promise<T | null>`; only `ENOENT` returns `null`.
- Produces: `assertCatalogBundleBudgetCalibration(previous, next, allowIncrease): void`.

- [ ] **Step 1: Write failing generated-file loader tests**

Use `mkdtemp(join(tmpdir(), 'weatherpane-bundle-'))`, `writeFile`, and `rm` in `afterEach`. Assert:

- missing strict file rejects with its path and prerequisite command
- malformed JSON rejects with its path and prerequisite command
- missing optional file returns `null`
- malformed optional file still rejects

- [ ] **Step 2: Run loader tests and verify RED**

Run:

```bash
pnpm exec vitest run tests/client-bundle-generated-files.test.ts
```

Expected: FAIL because the shared loader interfaces do not exist.

- [ ] **Step 3: Implement the shared loaders**

Use `readFile` from `node:fs/promises`. The strict loader catches read and parse errors and throws:

```ts
throw new Error(
  `생성 파일을 읽을 수 없습니다: ${filePath}. 먼저 \`${prerequisiteCommand}\`을 실행하세요.`
);
```

The optional loader returns `null` only when `(error as NodeJS.ErrnoException).code === 'ENOENT'`; all other failures use the same friendly error.

- [ ] **Step 4: Run loader tests and verify GREEN**

Run:

```bash
pnpm exec vitest run tests/client-bundle-generated-files.test.ts
```

Expected: PASS with pristine output.

- [ ] **Step 5: Write failing anti-ratchet table tests**

In `tests/client-bundle-budget.test.ts`, use `it.each` over Search/lookup and these four fields:

- `measuredRawBytes`
- `measuredGzipBytes`
- `rawBytes`
- `gzipBytes`

For each case, clone a valid generated budget, increase exactly one value, and expect rejection without override. Add one test confirming `allowIncrease: true` accepts the same increase.

- [ ] **Step 6: Run calibration tests and verify RED**

Run:

```bash
pnpm exec vitest run tests/client-bundle-budget.test.ts -t "보정 증가"
```

Expected: FAIL because the calibration guard does not exist.

- [ ] **Step 7: Implement the calibration guard**

Compare all eight route/field values. On the first increase, throw a Korean message that names the route/measurement and ends with `의도한 경우 --allow-increase를 사용하세요.` Return immediately when `allowIncrease` is true.

- [ ] **Step 8: Wire both scripts to the shared loaders and guard**

Use strict reads in `check-client-bundle-budget.ts` for the report and generated budgets. In calibration:

1. strict-read the report
2. optional-read the previous generated budget
3. build the next generated budget
4. validate the previous budget when present
5. call `assertCatalogBundleBudgetCalibration(previous, next, process.argv.includes('--allow-increase'))`
6. write only after the guard passes

Use prerequisite commands matching the current report path until Task 4 moves it.

- [ ] **Step 9: Verify the scripts and helper tests**

Run:

```bash
pnpm exec vitest run tests/client-bundle-budget.test.ts tests/client-bundle-generated-files.test.ts
```

Expected: PASS with pristine output.

- [ ] **Step 10: Commit the generated-file safety unit**

```bash
git add scripts/client-bundle-budget.ts scripts/calibrate-client-bundle-budget.ts scripts/check-client-bundle-budget.ts tests/client-bundle-budget.test.ts tests/client-bundle-generated-files.test.ts
git commit -m "fix(bundle): 생성 파일 로딩과 예산 보정 보호"
```

Done-check: missing/malformed files name prerequisite commands, all budget increases require an explicit override, and no provenance field is added.

---

### Task 4: Make bundle reporting opt-in and non-deployable

**Files:**

- Create: `tests/client-bundle-report.test.ts`
- Modify: `scripts/client-bundle-report.ts`
- Modify: `scripts/calibrate-client-bundle-budget.ts`
- Modify: `scripts/check-client-bundle-budget.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/performance/search-catalog-load-budget.md`

**Interfaces:**

- Preserves: `clientBundleReportPlugin(): Plugin`.
- Uses: `CATALOG_BUNDLE_REPORT=1` as the sole report opt-in.
- Changes report path from `build/client/catalog-bundle-report.json` to `build/catalog-bundle-report.json`.

- [ ] **Step 1: Write the failing plugin opt-in test**

In `tests/client-bundle-report.test.ts`, use `vi.stubEnv`/`vi.unstubAllEnvs` and call the plugin's functional `applyToEnvironment` hook. Assert client returns `false` without the variable, client returns `true` with `CATALOG_BUNDLE_REPORT=1`, and server remains `false`.

- [ ] **Step 2: Run the opt-in test and verify RED**

Run:

```bash
pnpm exec vitest run tests/client-bundle-report.test.ts -t "명시적으로 활성화"
```

Expected: FAIL because the current plugin always applies to the client environment.

- [ ] **Step 3: Implement the opt-in condition**

```ts
applyToEnvironment(environment) {
  return (
    environment.name === 'client' &&
    process.env.CATALOG_BUNDLE_REPORT === '1'
  );
}
```

Run the targeted test again and observe GREEN.

- [ ] **Step 4: Write the failing output-placement test**

Create a temporary `build/client` directory, construct one minimal `Rollup.OutputChunk`, invoke the plugin hook, and assert:

- `build/catalog-bundle-report.json` exists and contains the chunk module
- `build/client/catalog-bundle-report.json` does not exist
- the plugin does not use `generateBundle`/`emitFile`

Expected RED: the current plugin has `generateBundle`, emits a client asset, and has no `writeBundle` hook.

- [ ] **Step 5: Move report writing to `writeBundle`**

Import `writeFile` from `node:fs/promises`, `resolve` from `node:path`, and `Rollup` from Vite types. Remove `FinalClientChunk`. Type `toClientBundleChunk(chunk: Rollup.OutputChunk)` and implement:

```ts
async writeBundle(outputOptions, bundle) {
  if (!outputOptions.dir) {
    throw new Error('client-bundle-report: 출력 디렉터리가 필요합니다.');
  }
  const reportPath = resolve(
    outputOptions.dir,
    '..',
    'catalog-bundle-report.json'
  );
  await writeFile(reportPath, `${JSON.stringify({ chunks }, null, 2)}\n`);
}
```

Preserve chunk sorting, module sorting, raw byte measurement, and gzip measurement.

- [ ] **Step 6: Run report tests and verify GREEN**

Run:

```bash
pnpm exec vitest run tests/client-bundle-report.test.ts
```

Expected: PASS with pristine output.

- [ ] **Step 7: Update consumers, CI, and operator documentation**

- Read `build/catalog-bundle-report.json` in both scripts.
- Change prerequisite text to `CATALOG_BUNDLE_REPORT=1 VITE_WEATHER_PROVIDER_MODE=mock pnpm build`.
- Add `CATALOG_BUNDLE_REPORT=1` to the existing CI production build environment block.
- Update the performance document's report path, build command, and `pnpm calibrate:bundle-budget -- --allow-increase` procedure.

- [ ] **Step 8: Verify TypeScript and targeted tests**

Run:

```bash
pnpm typecheck
pnpm exec vitest run tests/client-bundle-report.test.ts tests/client-bundle-budget.test.ts tests/client-bundle-generated-files.test.ts
```

Expected: all commands PASS with pristine output.

- [ ] **Step 9: Verify both build modes**

First run a normal diagnostic-disabled build:

```bash
VITE_WEATHER_PROVIDER_MODE=mock pnpm build
```

Done-check: neither `build/catalog-bundle-report.json` nor `build/client/catalog-bundle-report.json` exists.

Then run the enabled build and gate:

```bash
CATALOG_BUNDLE_REPORT=1 VITE_WEATHER_PROVIDER_MODE=mock pnpm build
pnpm check:bundle-budget
```

Done-check: `build/catalog-bundle-report.json` exists, no report exists under `build/client`, and the budget gate exits 0. Treat any warning output as non-pristine and report it explicitly.

- [ ] **Step 10: Commit the report/CI/docs unit**

```bash
git add scripts/client-bundle-report.ts scripts/calibrate-client-bundle-budget.ts scripts/check-client-bundle-budget.ts tests/client-bundle-report.test.ts .github/workflows/ci.yml docs/performance/search-catalog-load-budget.md
git commit -m "fix(bundle): 진단 보고서를 배포 산출물에서 분리"
```

Done-check: normal production builds skip diagnostics, enabled builds write only outside the client tree, CI enables the report once, and docs match actual commands.

---

### Task 5: Derive the popular-location read bound

**Files:**

- Modify: `tests/search-catalog-engine.test.ts`

**Interfaces:**

- No production interface changes.

- [ ] **Step 1: Replace the fixed total with a named per-path bound**

Inside the popular-locations test, define:

```ts
const maxSegmentReadsPerPath = 4 * 2;
```

Then assert:

```ts
expect(segmentReads).toBeLessThanOrEqual(
  POPULAR_LOCATIONS.length * maxSegmentReadsPerPath
);
```

This is test maintainability coverage for existing behavior, so the test is expected to remain GREEN.

- [ ] **Step 2: Verify the search test**

Run:

```bash
pnpm exec vitest run tests/search-catalog-engine.test.ts
```

Expected: PASS with pristine output.

- [ ] **Step 3: Commit the test-only unit**

```bash
git add tests/search-catalog-engine.test.ts
git commit -m "test(search): 인기 지역 조회 상한을 입력 수에 맞춤"
```

Done-check: the bound remains 80 for the current ten paths but scales explicitly with `POPULAR_LOCATIONS.length`.

---

### Task 6: Record evidence and verify the branch

**Files:**

- Create: `docs/journal/journal-pr-106-review.md` in the PR worktree from the existing temporary main-checkout journal.
- Modify: `docs/journal/journal-pr-106-review.md` with selected scope, commit SHAs, RED/GREEN evidence, and remaining non-scope.

**Interfaces:**

- No production interface changes.

- [ ] **Step 1: Transfer and update the review journal**

Use `apply_patch` to add the Korean journal to the PR worktree, remove stale statements that implementation scope is unselected, and record actual results only. Remove the temporary copy from the main checkout with `apply_patch` after confirming the PR-worktree copy is complete.

- [ ] **Step 2: Commit the journal**

```bash
git add docs/journal/journal-pr-106-review.md
git commit -m "docs(bundle): PR 106 리뷰 후속 결과 기록"
```

- [ ] **Step 3: Invoke verification-before-completion and run final checks**

Run fresh from the PR worktree:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
CATALOG_BUNDLE_REPORT=1 VITE_WEATHER_PROVIDER_MODE=mock pnpm build
pnpm check:bundle-budget
git diff --check origin/chore/80-search-catalog-load-performance..HEAD
git status --short --branch
```

Expected: lint, typecheck, all unit/integration tests, build, and bundle budget exit 0. Any warnings must be reported and cannot be called pristine.

- [ ] **Step 4: Review the final commit range**

```bash
git log --oneline origin/chore/80-search-catalog-load-performance..HEAD
git diff --stat origin/chore/80-search-catalog-load-performance..HEAD
git diff origin/chore/80-search-catalog-load-performance..HEAD -- . ':!*.generated.json'
```

Done-check: every edit maps to selected review items, generated catalog content is unchanged, and no GitHub thread was written or resolved.

- [ ] **Step 5: Invoke requesting-code-review**

Use `superpowers:requesting-code-review` on the complete commit range. Address only verified in-scope findings through new RED/GREEN cycles.

- [ ] **Step 6: Ask before external publication**

Report the local commits and verification. Ask Ori for explicit authorization before pushing the branch or writing/resolving GitHub review threads.

Done-check: the branch is locally complete and reviewable, while external GitHub state remains unchanged until Ori authorizes it.
