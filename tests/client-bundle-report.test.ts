import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Plugin, Rollup } from 'vite';

import { clientBundleReportPlugin } from '../scripts/client-bundle-report';

const temporaryDirectories: string[] = [];

function applyToEnvironment(plugin: Plugin, name: string): boolean {
  if (typeof plugin.applyToEnvironment !== 'function') {
    throw new Error('applyToEnvironment hook이 필요합니다.');
  }

  const result = plugin.applyToEnvironment({ name } as never);

  if (typeof result !== 'boolean') {
    throw new Error('applyToEnvironment hook은 boolean을 반환해야 합니다.');
  }

  return result;
}

async function writeBundle(
  plugin: Plugin,
  outputDirectory: string,
  bundle: Rollup.OutputBundle
): Promise<void> {
  if (!plugin.writeBundle) {
    throw new Error('writeBundle hook이 필요합니다.');
  }

  const handler =
    typeof plugin.writeBundle === 'function'
      ? plugin.writeBundle
      : plugin.writeBundle.handler;

  await handler.call(
    {} as never,
    { dir: outputDirectory } as Rollup.NormalizedOutputOptions,
    bundle
  );
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    temporaryDirectories.map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
  temporaryDirectories.length = 0;
});

describe('client bundle report plugin', () => {
  it('환경 변수로 명시적으로 활성화한 client 빌드에만 적용한다', () => {
    vi.stubEnv('CATALOG_BUNDLE_REPORT', '');
    const plugin = clientBundleReportPlugin();

    expect(applyToEnvironment(plugin, 'client')).toBe(false);

    vi.stubEnv('CATALOG_BUNDLE_REPORT', '1');

    expect(applyToEnvironment(plugin, 'client')).toBe(true);
    expect(applyToEnvironment(plugin, 'server')).toBe(false);
  });

  it('보고서를 client 배포 산출물 밖에 기록한다', async () => {
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), 'weatherpane-report-')
    );
    temporaryDirectories.push(temporaryDirectory);
    const clientOutputDirectory = join(temporaryDirectory, 'build', 'client');
    await mkdir(clientOutputDirectory, { recursive: true });
    const moduleId = '/project/app/routes/search.tsx';
    const chunk = {
      code: 'export const value = 1;',
      dynamicImports: [],
      fileName: 'assets/client.js',
      imports: [],
      modules: { [moduleId]: {} },
      type: 'chunk',
    } as unknown as Rollup.OutputChunk;
    const plugin = clientBundleReportPlugin();

    expect(plugin.generateBundle).toBeUndefined();
    await writeBundle(plugin, clientOutputDirectory, {
      [chunk.fileName]: chunk,
    });

    const report = JSON.parse(
      await readFile(
        join(temporaryDirectory, 'build', 'catalog-bundle-report.json'),
        'utf8'
      )
    ) as { chunks: { modules: string[] }[] };

    expect(report.chunks).toEqual([
      expect.objectContaining({ modules: [moduleId] }),
    ]);
    await expect(
      readFile(join(clientOutputDirectory, 'catalog-bundle-report.json'))
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
