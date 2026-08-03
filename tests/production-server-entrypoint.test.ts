import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

interface ProductionServerLauncher {
  resolveProductionServerBuild(
    buildResult: Record<string, unknown>,
    options: { projectRoot: string }
  ): string;
}

const launcherModuleSpecifier = '../scripts/serve-production-build.js';
const { resolveProductionServerBuild } = (await import(
  launcherModuleSpecifier
)) as ProductionServerLauncher;

const temporaryRoots: string[] = [];

function createProjectRoot(existingFiles: string[] = []): string {
  const projectRoot = mkdtempSync(join(tmpdir(), 'weatherpane-entrypoint-'));
  temporaryRoots.push(projectRoot);
  for (const relativePath of existingFiles) {
    const absolutePath = join(projectRoot, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, 'export {};\n', 'utf8');
  }
  return projectRoot;
}

function buildResult(
  serverBundles: Record<string, unknown>
): Record<string, unknown> {
  return { buildManifest: { serverBundles } };
}

afterEach(() => {
  for (const projectRoot of temporaryRoots.splice(0)) {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

describe('resolveProductionServerBuild', () => {
  test('매니페스트가 선택한 동적 Node 번들 경로를 반환한다', () => {
    const relativePath = 'build/server/nodejs_dynamic-id/index.js';
    const projectRoot = createProjectRoot([relativePath]);
    const result = resolveProductionServerBuild(
      buildResult({
        'nodejs_dynamic-id': {
          id: 'nodejs_dynamic-id',
          file: relativePath,
          config: { runtime: 'nodejs' },
        },
      }),
      { projectRoot }
    );
    expect(result).toBe(join(projectRoot, relativePath));
    expect(existsSync(result)).toBe(true);
  });

  test('serverBundles가 없으면 명확한 오류를 던진다', () => {
    const projectRoot = createProjectRoot();
    expect(() => resolveProductionServerBuild({}, { projectRoot })).toThrow(
      'serverBundles must be an object'
    );
  });

  test('Node 번들이 없으면 명확한 오류를 던진다', () => {
    const projectRoot = createProjectRoot();
    expect(() =>
      resolveProductionServerBuild(buildResult({}), { projectRoot })
    ).toThrow('expected exactly one server bundle; found 0');
  });

  test('번들이 여러 개면 첫 항목을 선택하지 않고 오류를 던진다', () => {
    const projectRoot = createProjectRoot();
    expect(() =>
      resolveProductionServerBuild(
        buildResult({
          first: {
            id: 'first',
            file: 'build/server/first/index.js',
            config: { runtime: 'nodejs' },
          },
          second: {
            id: 'second',
            file: 'build/server/second/index.js',
            config: { runtime: 'nodejs' },
          },
        }),
        { projectRoot }
      )
    ).toThrow('expected exactly one server bundle; found 2');
  });

  test('유일한 번들이 Node 런타임이 아니면 오류를 던진다', () => {
    const projectRoot = createProjectRoot();
    expect(() =>
      resolveProductionServerBuild(
        buildResult({
          edge: {
            id: 'edge',
            file: 'build/server/edge/index.js',
            config: { runtime: 'edge' },
          },
        }),
        { projectRoot }
      )
    ).toThrow('expected runtime "nodejs"; found "edge"');
  });

  test('번들 file이 상대 경로가 아니면 오류를 던진다', () => {
    const projectRoot = createProjectRoot();
    expect(() =>
      resolveProductionServerBuild(
        buildResult({
          node: {
            id: 'node',
            file: join(projectRoot, 'build/server/node/index.js'),
            config: { runtime: 'nodejs' },
          },
        }),
        { projectRoot }
      )
    ).toThrow('bundle file must be a non-empty relative path');
  });

  test('매니페스트가 가리키는 파일이 없으면 오류를 던진다', () => {
    const projectRoot = createProjectRoot();
    const relativePath = 'build/server/nodejs_missing/index.js';
    expect(() =>
      resolveProductionServerBuild(
        buildResult({
          nodejs_missing: {
            id: 'nodejs_missing',
            file: relativePath,
            config: { runtime: 'nodejs' },
          },
        }),
        { projectRoot }
      )
    ).toThrow(
      `server bundle does not exist: ${join(projectRoot, relativePath)}`
    );
  });
});
