import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
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

function waitForOutput(
  child: ChildProcess,
  expected: string,
  timeoutMs = 2_000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { stdout, stderr } = child;
    if (stdout === null || stderr === null) {
      reject(new Error('자식 프로세스 출력 스트림을 사용할 수 없습니다'));
      return;
    }

    let output = '';
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`출력 대기 시간이 초과되었습니다: ${output}`));
    }, timeoutMs);
    const onData = (chunk: Buffer | string) => {
      output += String(chunk);
      if (output.includes(expected)) {
        cleanup();
        resolve();
      }
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      reject(
        new Error(
          `예상 출력을 받기 전에 자식 프로세스가 종료되었습니다: code=${String(code)} signal=${String(signal)} output=${output}`
        )
      );
    };
    const cleanup = () => {
      clearTimeout(timeout);
      stdout.off('data', onData);
      stderr.off('data', onData);
      child.off('exit', onExit);
    };

    stdout.on('data', onData);
    stderr.on('data', onData);
    child.once('exit', onExit);
  });
}

function killProcessGroup(processId: number): void {
  try {
    process.kill(-processId, 'SIGKILL');
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      error.code !== 'ESRCH'
    ) {
      throw error;
    }
  }
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

  test('serverBundles가 배열이면 명확한 오류를 던진다', () => {
    const projectRoot = createProjectRoot();
    expect(() =>
      resolveProductionServerBuild(buildResult([] as never), { projectRoot })
    ).toThrow('serverBundles must be an object');
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

  test('유일한 번들 값이 객체가 아니면 명확한 오류를 던진다', () => {
    const projectRoot = createProjectRoot();
    expect(() =>
      resolveProductionServerBuild(buildResult({ node: 'nope' }), {
        projectRoot,
      })
    ).toThrow('server bundle must be an object');
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

  test('번들 file이 프로젝트 루트를 벗어나면 오류를 던진다', () => {
    const projectRoot = createProjectRoot();
    const outsideRoot = mkdtempSync(
      join(tmpdir(), 'weatherpane-entrypoint-outside-')
    );
    temporaryRoots.push(outsideRoot);
    const outsidePath = join(outsideRoot, 'index.js');
    writeFileSync(outsidePath, 'export {};\n', 'utf8');
    const relativePath = relative(projectRoot, outsidePath);

    expect(() =>
      resolveProductionServerBuild(
        buildResult({
          node: {
            id: 'node',
            file: relativePath,
            config: { runtime: 'nodejs' },
          },
        }),
        { projectRoot }
      )
    ).toThrow('bundle file must stay within the project root');
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

describe('runProductionServer', () => {
  test.each(['SIGINT', 'SIGTERM'] as const)(
    '런처가 받은 %s을 서버 자식 프로세스에 전달한다',
    async (receivedSignal) => {
      const projectRoot = createProjectRoot();
      const relativePath = 'build/server/nodejs_signal/index.js';
      const serverBuildPath = join(projectRoot, relativePath);
      const signalMarkerPath = join(projectRoot, 'signal-received');
      mkdirSync(dirname(serverBuildPath), { recursive: true });
      writeFileSync(
        serverBuildPath,
        [
          "import { writeFileSync } from 'node:fs';",
          `process.once(${JSON.stringify(receivedSignal)}, () => {`,
          `  writeFileSync(${JSON.stringify(signalMarkerPath)}, ${JSON.stringify(receivedSignal)}, 'utf8');`,
          '  process.exit(0);',
          '});',
          "console.log('fixture ready');",
          'setInterval(() => {}, 1_000);',
          'await new Promise(() => {});',
        ].join('\n'),
        'utf8'
      );
      const buildResultPath = join(
        projectRoot,
        '.vercel/react-router-build-result.json'
      );
      mkdirSync(dirname(buildResultPath), { recursive: true });
      writeFileSync(
        buildResultPath,
        JSON.stringify(
          buildResult({
            nodejs_signal: {
              id: 'nodejs_signal',
              file: relativePath,
              config: { runtime: 'nodejs' },
            },
          })
        ),
        'utf8'
      );
      const harnessPath = join(projectRoot, 'run-launcher.mjs');
      const launcherModuleUrl = pathToFileURL(
        join(process.cwd(), 'scripts/serve-production-build.js')
      ).href;
      writeFileSync(
        harnessPath,
        [
          `const { runProductionServer } = await import(${JSON.stringify(launcherModuleUrl)});`,
          'await runProductionServer({ projectRoot: process.argv[2] });',
        ].join('\n'),
        'utf8'
      );

      const launcher = spawn(process.execPath, [harnessPath, projectRoot], {
        detached: true,
        env: {
          ...process.env,
          HOST: '127.0.0.1',
          PORT: '43194',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const exit = once(launcher, 'exit');

      try {
        await waitForOutput(launcher, 'fixture ready');
        launcher.kill(receivedSignal);
        const [code, signal] = await exit;
        expect(code).toBe(0);
        expect(signal).toBeNull();
        expect(existsSync(signalMarkerPath)).toBe(true);
      } finally {
        if (launcher.pid !== undefined) {
          killProcessGroup(launcher.pid);
        }
      }
    }
  );
});
