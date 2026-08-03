import { spawn, type ChildProcess } from 'node:child_process';
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

interface LauncherCompletion {
  code: number | null;
  signal: NodeJS.Signals | null;
}

interface RunningLauncher {
  child: ChildProcess;
  completion: Promise<LauncherCompletion>;
  output(): string;
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
  launcher: RunningLauncher,
  expected: string,
  timeoutMs = 2_000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { child } = launcher;
    const { stdout, stderr } = child;
    if (stdout === null || stderr === null) {
      reject(new Error('자식 프로세스 출력 스트림을 사용할 수 없습니다'));
      return;
    }

    if (launcher.output().includes(expected)) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(`출력 대기 시간이 초과되었습니다: ${launcher.output()}`)
      );
    }, timeoutMs);
    const onData = () => {
      if (launcher.output().includes(expected)) {
        cleanup();
        resolve();
      }
    };
    const onClose = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      reject(
        new Error(
          `예상 출력을 받기 전에 자식 프로세스가 종료되었습니다: code=${String(code)} signal=${String(signal)} output=${launcher.output()}`
        )
      );
    };
    const cleanup = () => {
      clearTimeout(timeout);
      stdout.off('data', onData);
      stderr.off('data', onData);
      child.off('close', onClose);
    };

    stdout.on('data', onData);
    stderr.on('data', onData);
    child.once('close', onClose);
  });
}

function processGroupExists(processId: number): boolean {
  try {
    process.kill(-processId, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ESRCH') {
      return false;
    }
    throw error;
  }
}

function killProcessGroup(processId: number): void {
  if (processGroupExists(processId)) {
    process.kill(-processId, 'SIGKILL');
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function cleanupLauncher(launcher: RunningLauncher): Promise<void> {
  const { pid } = launcher.child;
  if (pid !== undefined) {
    killProcessGroup(pid);
  }
  await withTimeout(
    launcher.completion,
    2_000,
    `런처 프로세스 종료 대기 시간이 초과되었습니다: ${launcher.output()}`
  );
  if (pid === undefined) {
    return;
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!processGroupExists(pid)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(
    `런처 프로세스 그룹이 정리 후에도 남아 있습니다: ${String(pid)}`
  );
}

function createLauncherHarness(
  projectRoot: string,
  serverBuildSource: string,
  harnessBody: string[] = [
    'await runProductionServer({ projectRoot: process.argv[2] });',
  ]
): string {
  const relativePath = 'build/server/nodejs_lifecycle/index.js';
  const serverBuildPath = join(projectRoot, relativePath);
  mkdirSync(dirname(serverBuildPath), { recursive: true });
  writeFileSync(serverBuildPath, serverBuildSource, 'utf8');

  const buildResultPath = join(
    projectRoot,
    '.vercel/react-router-build-result.json'
  );
  mkdirSync(dirname(buildResultPath), { recursive: true });
  writeFileSync(
    buildResultPath,
    JSON.stringify(
      buildResult({
        nodejs_lifecycle: {
          id: 'nodejs_lifecycle',
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
      ...harnessBody,
    ].join('\n'),
    'utf8'
  );
  return harnessPath;
}

function spawnErrorHarnessBody(projectRoot: string): string[] {
  return [
    "const beforeSigint = process.listenerCount('SIGINT');",
    "const beforeSigterm = process.listenerCount('SIGTERM');",
    `process.execPath = ${JSON.stringify(join(projectRoot, 'missing-node'))};`,
    'try {',
    '  await runProductionServer({ projectRoot: process.argv[2] });',
    "  console.log('spawn-error:missing');",
    '  process.exitCode = 2;',
    '} catch (error) {',
    "  const causeCode = error instanceof Error && error.cause && typeof error.cause === 'object' && 'code' in error.cause ? error.cause.code : 'missing';",
    '  console.log(`spawn-error:${error instanceof Error ? error.message : String(error)}:${String(causeCode)}`);',
    "  console.log(`listener-delta:${process.listenerCount('SIGINT') - beforeSigint},${process.listenerCount('SIGTERM') - beforeSigterm}`);",
    '  process.exitCode = 1;',
    '}',
  ];
}

function startLauncher(
  harnessPath: string,
  projectRoot: string
): RunningLauncher {
  const child = spawn(process.execPath, [harnessPath, projectRoot], {
    detached: true,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: '43194',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout?.on('data', (chunk: Buffer | string) => {
    output += String(chunk);
  });
  child.stderr?.on('data', (chunk: Buffer | string) => {
    output += String(chunk);
  });
  const completion = new Promise<LauncherCompletion>((resolve) => {
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  return {
    child,
    completion,
    output: () => output,
  };
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
  test('서버 자식의 37 종료 상태를 런처 종료 상태로 전파한다', async () => {
    const projectRoot = createProjectRoot();
    const harnessPath = createLauncherHarness(projectRoot, 'process.exit(37);');
    const launcher = startLauncher(harnessPath, projectRoot);

    try {
      const { code, signal } = await withTimeout(
        launcher.completion,
        2_000,
        `런처 종료 대기 시간이 초과되었습니다: ${launcher.output()}`
      );
      expect(code).toBe(37);
      expect(signal).toBeNull();
    } finally {
      await cleanupLauncher(launcher);
    }
  }, 5_000);

  test('서버 자식의 SIGTERM 종료를 런처 신호 종료로 전파한다', async () => {
    const projectRoot = createProjectRoot();
    const harnessPath = createLauncherHarness(
      projectRoot,
      "process.kill(process.pid, 'SIGTERM');"
    );
    const launcher = startLauncher(harnessPath, projectRoot);

    try {
      const { code, signal } = await withTimeout(
        launcher.completion,
        2_000,
        `런처 종료 대기 시간이 초과되었습니다: ${launcher.output()}`
      );
      expect(code).toBeNull();
      expect(signal).toBe('SIGTERM');
    } finally {
      await cleanupLauncher(launcher);
    }
  }, 5_000);

  test('spawn ENOENT를 원인과 함께 감싸고 런처 상태 1로 전파한다', async () => {
    const projectRoot = createProjectRoot();
    const harnessPath = createLauncherHarness(
      projectRoot,
      'export {};',
      spawnErrorHarnessBody(projectRoot)
    );
    const launcher = startLauncher(harnessPath, projectRoot);

    try {
      const { code, signal } = await withTimeout(
        launcher.completion,
        2_000,
        `런처 종료 대기 시간이 초과되었습니다: ${launcher.output()}`
      );
      expect(code).toBe(1);
      expect(signal).toBeNull();
      expect(launcher.output()).toContain(
        'spawn-error:Failed to start react-router-serve:ENOENT'
      );
    } finally {
      await cleanupLauncher(launcher);
    }
  }, 5_000);

  test('정상 종료 후 런처 신호 listener 수를 원복한다', async () => {
    const projectRoot = createProjectRoot();
    const harnessPath = createLauncherHarness(projectRoot, 'process.exit(0);', [
      "const beforeSigint = process.listenerCount('SIGINT');",
      "const beforeSigterm = process.listenerCount('SIGTERM');",
      'await runProductionServer({ projectRoot: process.argv[2] });',
      "console.log(`listener-delta:${process.listenerCount('SIGINT') - beforeSigint},${process.listenerCount('SIGTERM') - beforeSigterm}`);",
    ]);
    const launcher = startLauncher(harnessPath, projectRoot);

    try {
      const { code, signal } = await withTimeout(
        launcher.completion,
        2_000,
        `런처 종료 대기 시간이 초과되었습니다: ${launcher.output()}`
      );
      expect(code).toBe(0);
      expect(signal).toBeNull();
      expect(launcher.output()).toContain('listener-delta:0,0');
    } finally {
      await cleanupLauncher(launcher);
    }
  }, 5_000);

  test('spawn 오류 후 런처 신호 listener 수를 원복한다', async () => {
    const projectRoot = createProjectRoot();
    const harnessPath = createLauncherHarness(
      projectRoot,
      'export {};',
      spawnErrorHarnessBody(projectRoot)
    );
    const launcher = startLauncher(harnessPath, projectRoot);

    try {
      const { code, signal } = await withTimeout(
        launcher.completion,
        2_000,
        `런처 종료 대기 시간이 초과되었습니다: ${launcher.output()}`
      );
      expect(code).toBe(1);
      expect(signal).toBeNull();
      expect(launcher.output()).toContain('listener-delta:0,0');
    } finally {
      await cleanupLauncher(launcher);
    }
  }, 5_000);

  test.each(['SIGINT', 'SIGTERM'] as const)(
    '런처가 받은 %s을 서버 자식 프로세스에 전달한다',
    async (receivedSignal) => {
      const projectRoot = createProjectRoot();
      const signalMarkerPath = join(projectRoot, 'signal-received');
      const harnessPath = createLauncherHarness(
        projectRoot,
        [
          "import { writeFileSync } from 'node:fs';",
          `process.once(${JSON.stringify(receivedSignal)}, () => {`,
          `  writeFileSync(${JSON.stringify(signalMarkerPath)}, ${JSON.stringify(receivedSignal)}, 'utf8');`,
          '  process.exit(0);',
          '});',
          "console.log('fixture ready');",
          'setInterval(() => {}, 1_000);',
          'await new Promise(() => {});',
        ].join('\n')
      );
      const launcher = startLauncher(harnessPath, projectRoot);

      try {
        await waitForOutput(launcher, 'fixture ready');
        launcher.child.kill(receivedSignal);
        const { code, signal } = await withTimeout(
          launcher.completion,
          2_000,
          `런처 종료 대기 시간이 초과되었습니다: ${launcher.output()}`
        );
        expect(code).toBe(0);
        expect(signal).toBeNull();
        expect(existsSync(signalMarkerPath)).toBe(true);
      } finally {
        await cleanupLauncher(launcher);
      }
    },
    5_000
  );
});
