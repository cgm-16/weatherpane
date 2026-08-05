import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const BUILD_RESULT_PATH = '.vercel/react-router-build-result.json';
const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));

export function resolveProductionServerBuild(
  buildResult,
  { projectRoot = PROJECT_ROOT, fileExists = existsSync } = {}
) {
  const serverBundles = buildResult?.buildManifest?.serverBundles;
  if (
    serverBundles === null ||
    typeof serverBundles !== 'object' ||
    Array.isArray(serverBundles)
  ) {
    throw new Error(`${BUILD_RESULT_PATH}: serverBundles must be an object`);
  }
  const bundles = Object.values(serverBundles);
  if (bundles.length !== 1) {
    throw new Error(
      `${BUILD_RESULT_PATH}: expected exactly one server bundle; found ${bundles.length}`
    );
  }
  const [bundle] = bundles;
  if (bundle === null || typeof bundle !== 'object') {
    throw new Error(`${BUILD_RESULT_PATH}: server bundle must be an object`);
  }
  const runtime = bundle.config?.runtime;
  if (runtime !== 'nodejs') {
    throw new Error(
      `${BUILD_RESULT_PATH}: expected runtime "nodejs"; found "${String(runtime)}"`
    );
  }
  if (
    typeof bundle.file !== 'string' ||
    bundle.file.length === 0 ||
    isAbsolute(bundle.file)
  ) {
    throw new Error(
      `${BUILD_RESULT_PATH}: bundle file must be a non-empty relative path`
    );
  }
  const resolvedProjectRoot = resolve(projectRoot);
  const serverBuildPath = resolve(resolvedProjectRoot, bundle.file);
  const relativeServerBuildPath = relative(
    resolvedProjectRoot,
    serverBuildPath
  );
  if (
    relativeServerBuildPath === '..' ||
    relativeServerBuildPath.startsWith(`..${sep}`)
  ) {
    throw new Error(
      `${BUILD_RESULT_PATH}: bundle file must stay within the project root`
    );
  }
  if (!fileExists(serverBuildPath)) {
    throw new Error(
      `${BUILD_RESULT_PATH}: server bundle does not exist: ${serverBuildPath}`
    );
  }
  return serverBuildPath;
}

function readBuildResult(projectRoot) {
  const buildResultPath = resolve(projectRoot, BUILD_RESULT_PATH);
  let source;
  try {
    source = readFileSync(buildResultPath, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read ${buildResultPath}`, { cause: error });
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Cannot parse ${buildResultPath}`, { cause: error });
  }
}

function resolveServeBin() {
  const packageJsonPath = fileURLToPath(
    import.meta.resolve('@react-router/serve/package.json')
  );
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const serveBin = packageJson.bin?.['react-router-serve'];
  if (typeof serveBin !== 'string' || serveBin.length === 0) {
    throw new Error('@react-router/serve does not expose react-router-serve');
  }
  return resolve(dirname(packageJsonPath), serveBin);
}

export function runProductionServer({ projectRoot = PROJECT_ROOT } = {}) {
  const buildResult = readBuildResult(projectRoot);
  const serverBuildPath = resolveProductionServerBuild(buildResult, {
    projectRoot,
  });
  const child = spawn(process.execPath, [resolveServeBin(), serverBuildPath], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });

  return new Promise((resolveRun, rejectRun) => {
    const forwardSigint = () => child.kill('SIGINT');
    const forwardSigterm = () => child.kill('SIGTERM');
    const removeListeners = () => {
      process.off('SIGINT', forwardSigint);
      process.off('SIGTERM', forwardSigterm);
      child.off('error', onError);
      child.off('exit', onExit);
    };
    const onError = (error) => {
      removeListeners();
      rejectRun(
        new Error('Failed to start react-router-serve', {
          cause: error,
        })
      );
    };
    const onExit = (status, signal) => {
      removeListeners();
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      process.exitCode = status ?? 1;
      resolveRun();
    };

    process.on('SIGINT', forwardSigint);
    process.on('SIGTERM', forwardSigterm);
    child.once('error', onError);
    child.once('exit', onExit);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await runProductionServer();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
