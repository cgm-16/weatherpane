import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  assertCatalogBundleBudget,
  assertCatalogBundleBudgetCalibration,
  assertGeneratedCatalogBundleBudgets,
  catalogBundleBaseline,
  catalogBundleHeadroomRatio,
  deriveCatalogBundleBudgets,
  readGeneratedJsonFile,
  readOptionalGeneratedJsonFile,
  type ClientBundleReport,
  type GeneratedCatalogBundleBudgets,
} from './client-bundle-budget';

const reportPath = resolve('build/catalog-bundle-report.json');
const budgetPath = resolve('scripts/catalog-bundle-budgets.generated.json');
const report = await readGeneratedJsonFile<ClientBundleReport>(
  reportPath,
  'CATALOG_BUNDLE_REPORT=1 VITE_WEATHER_PROVIDER_MODE=mock pnpm build'
);
const previousBudgets =
  await readOptionalGeneratedJsonFile<GeneratedCatalogBundleBudgets>(
    budgetPath,
    'pnpm calibrate:bundle-budget'
  );
const measuredEvidence = assertCatalogBundleBudget(
  report,
  deriveCatalogBundleBudgets({
    lookup: {
      gzipBytes: Number.MAX_SAFE_INTEGER,
      rawBytes: Number.MAX_SAFE_INTEGER,
    },
    search: {
      gzipBytes: Number.MAX_SAFE_INTEGER,
      rawBytes: Number.MAX_SAFE_INTEGER,
    },
  })
);
const measured = {
  lookup: measuredEvidence.lookup.actual,
  search: measuredEvidence.search.actual,
};
const limits = deriveCatalogBundleBudgets(measured);
const generatedBudgets: GeneratedCatalogBundleBudgets = {
  version: 1,
  headroomRatio: catalogBundleHeadroomRatio,
  baseline: catalogBundleBaseline,
  search: {
    measuredRawBytes: measured.search.rawBytes,
    measuredGzipBytes: measured.search.gzipBytes,
    rawBytes: limits.search.rawBytes,
    gzipBytes: limits.search.gzipBytes,
  },
  lookup: {
    measuredRawBytes: measured.lookup.rawBytes,
    measuredGzipBytes: measured.lookup.gzipBytes,
    rawBytes: limits.lookup.rawBytes,
    gzipBytes: limits.lookup.gzipBytes,
  },
};

if (previousBudgets) {
  assertGeneratedCatalogBundleBudgets(previousBudgets);
  assertCatalogBundleBudgetCalibration(
    previousBudgets,
    generatedBudgets,
    process.argv.includes('--allow-increase')
  );
}

await writeFile(budgetPath, `${JSON.stringify(generatedBudgets, null, 2)}\n`);
