import { gzipSync } from 'node:zlib';

import type { Plugin } from 'vite';

import type {
  ClientBundleChunk,
  ClientBundleReport,
} from './client-bundle-budget';

interface FinalClientChunk {
  fileName: string;
  imports: string[];
  dynamicImports: string[];
  modules: Record<string, unknown>;
  code: string;
}

function toClientBundleChunk(chunk: FinalClientChunk): ClientBundleChunk {
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
      return environment.name === 'client';
    },
    generateBundle(_outputOptions, bundle) {
      const chunks = Object.values(bundle)
        .filter((output) => output.type === 'chunk')
        .map(toClientBundleChunk)
        .sort((left, right) =>
          left.fileName.localeCompare(right.fileName, 'en')
        );
      const report: ClientBundleReport = { chunks };

      this.emitFile({
        fileName: 'catalog-bundle-report.json',
        source: `${JSON.stringify(report, null, 2)}\n`,
        type: 'asset',
      });
    },
    name: 'client-bundle-report',
  };
}
