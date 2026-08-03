import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

import type { Plugin, Rollup } from 'vite';

import type {
  ClientBundleChunk,
  ClientBundleReport,
} from './client-bundle-budget';

function toClientBundleChunk(chunk: Rollup.OutputChunk): ClientBundleChunk {
  return {
    dynamicImports: [...chunk.dynamicImports].sort(),
    fileName: chunk.fileName,
    gzipBytes: gzipSync(chunk.code).byteLength,
    imports: [...chunk.imports].sort(),
    modules: Object.keys(chunk.modules).sort(),
    rawBytes: Buffer.byteLength(chunk.code),
  };
}

export function clientBundleReportPlugin(): Plugin {
  return {
    applyToEnvironment(environment) {
      return (
        environment.name === 'client' &&
        process.env.CATALOG_BUNDLE_REPORT === '1'
      );
    },
    async writeBundle(outputOptions, bundle) {
      if (!outputOptions.dir) {
        throw new Error('client-bundle-report: 출력 디렉터리가 필요합니다.');
      }

      const chunks = Object.values(bundle)
        .filter((output) => output.type === 'chunk')
        .map(toClientBundleChunk)
        .sort((left, right) =>
          left.fileName.localeCompare(right.fileName, 'en')
        );
      const report: ClientBundleReport = { chunks };
      const reportPath = resolve(
        outputOptions.dir,
        '..',
        'catalog-bundle-report.json'
      );

      await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    },
    name: 'client-bundle-report',
  };
}
