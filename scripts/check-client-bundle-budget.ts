import { resolve } from 'node:path';

import {
  assertCatalogBundleBudget,
  assertGeneratedCatalogBundleBudgets,
  formatCatalogBundleEvidence,
  readGeneratedJsonFile,
  type CatalogBundleBudgets,
  type ClientBundleReport,
  type GeneratedCatalogBundleBudgets,
} from './client-bundle-budget';

const reportPath = resolve('build/client/catalog-bundle-report.json');
const budgetPath = resolve('scripts/catalog-bundle-budgets.generated.json');
const report = await readGeneratedJsonFile<ClientBundleReport>(
  reportPath,
  'pnpm build'
);
const generatedBudgets =
  await readGeneratedJsonFile<GeneratedCatalogBundleBudgets>(
    budgetPath,
    'pnpm calibrate:bundle-budget'
  );
const { baseline, limits } =
  assertGeneratedCatalogBundleBudgets(generatedBudgets);
const evidence = assertCatalogBundleBudget(report, limits, baseline);

console.log(formatCatalogBundleEvidence(evidence, limits));

if (process.argv.includes('--prove-red')) {
  const checks = [
    ['search', 'rawBytes', '검색 카탈로그', 'raw'],
    ['search', 'gzipBytes', '검색 카탈로그', 'gzip'],
    ['lookup', 'rawBytes', '상세 조회', 'raw'],
    ['lookup', 'gzipBytes', '상세 조회', 'gzip'],
  ] as const;

  for (const [route, byteType, label, byteLabel] of checks) {
    const falsifiedBudgets = structuredClone(limits) as CatalogBundleBudgets;
    const actual = evidence[route].actual[byteType];
    falsifiedBudgets[route][byteType] = actual - 1;
    const expectedMessage = `${label} ${byteLabel} 예산 초과: ${actual} > ${actual - 1}`;

    try {
      assertCatalogBundleBudget(report, falsifiedBudgets, baseline);
    } catch (error) {
      if (error instanceof Error && error.message === expectedMessage) {
        console.log(`예상 RED: ${expectedMessage}`);
        continue;
      }
      throw error;
    }

    throw new Error(`예상 RED가 발생하지 않았습니다: ${expectedMessage}`);
  }

  assertCatalogBundleBudget(report, limits, baseline);
  console.log('복원된 커밋 예산 GREEN을 확인했습니다.');
}
