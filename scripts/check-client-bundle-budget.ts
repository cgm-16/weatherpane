import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  assertCatalogBundleBudget,
  assertGeneratedCatalogBundleBudgets,
  type CatalogBundleBudgets,
  type ClientBundleReport,
  type GeneratedCatalogBundleBudgets,
} from './client-bundle-budget';

const reportPath = resolve('build/client/catalog-bundle-report.json');
const budgetPath = resolve('scripts/catalog-bundle-budgets.generated.json');
const report = JSON.parse(
  await readFile(reportPath, 'utf8')
) as ClientBundleReport;
const generatedBudgets = JSON.parse(
  await readFile(budgetPath, 'utf8')
) as GeneratedCatalogBundleBudgets;
const budgets = assertGeneratedCatalogBundleBudgets(generatedBudgets);
const evidence = assertCatalogBundleBudget(report, budgets);

console.log(
  `검색 카탈로그: ${evidence.search.actual.rawBytes} raw bytes, ${evidence.search.actual.gzipBytes} gzip bytes, raw ${evidence.search.reductionPercentage.rawBytes.toFixed(2)}% 감소, gzip ${evidence.search.reductionPercentage.gzipBytes.toFixed(2)}% 감소`
);
console.log(
  `상세 조회: ${evidence.lookup.actual.rawBytes} raw bytes, ${evidence.lookup.actual.gzipBytes} gzip bytes, raw ${evidence.lookup.reductionPercentage.rawBytes.toFixed(2)}% 감소, gzip ${evidence.lookup.reductionPercentage.gzipBytes.toFixed(2)}% 감소`
);
console.log('전체 카탈로그 제외 및 Search/Detail 경로 격리를 확인했습니다.');

if (process.argv.includes('--prove-red')) {
  const checks = [
    ['search', 'rawBytes', '검색 카탈로그', 'raw'],
    ['search', 'gzipBytes', '검색 카탈로그', 'gzip'],
    ['lookup', 'rawBytes', '상세 조회', 'raw'],
    ['lookup', 'gzipBytes', '상세 조회', 'gzip'],
  ] as const;

  for (const [route, byteType, label, byteLabel] of checks) {
    const falsifiedBudgets = structuredClone(budgets) as CatalogBundleBudgets;
    const actual = evidence[route].actual[byteType];
    falsifiedBudgets[route][byteType] = actual - 1;
    const expectedMessage = `${label} ${byteLabel} 예산 초과: ${actual} > ${actual - 1}`;

    try {
      assertCatalogBundleBudget(report, falsifiedBudgets);
    } catch (error) {
      if (error instanceof Error && error.message === expectedMessage) {
        console.log(`예상 RED: ${expectedMessage}`);
        continue;
      }
      throw error;
    }

    throw new Error(`예상 RED가 발생하지 않았습니다: ${expectedMessage}`);
  }

  assertCatalogBundleBudget(report, budgets);
  console.log('복원된 커밋 예산 GREEN을 확인했습니다.');
}
