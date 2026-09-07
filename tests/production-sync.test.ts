import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';

const temporaryRoots: string[] = [];
const workflow = readFileSync('.github/workflows/production-sync.yml', 'utf8');
// 실제 워크플로의 셸을 실행하고 GitHub PR API 경계만 대체한다.
const script = workflow
  .split('        run: |\n')[1]
  .split('\n')
  .map((line) => line.slice(10))
  .join('\n');

function createRepository() {
  const root = mkdtempSync(join(tmpdir(), 'weatherpane-production-sync-'));
  temporaryRoots.push(root);
  // Git 훅이 전달한 저장소 경로와 인덱스 설정을 임시 저장소에 전파하지 않는다.
  const inheritedEnv = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))
  );
  const env = {
    ...inheritedEnv,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Release Test',
    GIT_AUTHOR_EMAIL: 'release@example.invalid',
    GIT_COMMITTER_NAME: 'Release Test',
    GIT_COMMITTER_EMAIL: 'release@example.invalid',
  };
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, env, encoding: 'utf8' }).trim();
  git('init', '--quiet', '--initial-branch=main');
  git('init', '--quiet', '--bare', '--initial-branch=main', 'origin.git');
  git('remote', 'add', 'origin', join(root, 'origin.git'));

  function commit(value: string) {
    writeFileSync(join(root, 'weather.txt'), `${value}\n`);
    git('add', 'weather.txt');
    git('commit', '--quiet', '-m', value);
    return git('rev-parse', 'HEAD');
  }

  const base = commit('base');
  git('tag', 'v1.0.0');
  commit('first release');
  git('tag', 'v1.0.1');
  const production = git(
    'commit-tree',
    'HEAD^{tree}',
    '-p',
    base,
    '-m',
    'rebased first release'
  );
  git('branch', 'production', production);
  git('push', '--quiet', 'origin', 'production');
  commit('second release');
  git('tag', 'v1.0.2');

  function run(tag = 'v1.0.2') {
    git('checkout', '--quiet', '--detach', tag);
    git('fetch', '--quiet', 'origin', 'production');
    return spawnSync(
      'bash',
      ['-c', `gh() { printf '%s\\n' "$@" >> "$PR_CALLS"; }\n${script}`],
      {
        cwd: root,
        env: {
          ...env,
          GITHUB_REF: `refs/tags/${tag}`,
          GITHUB_REPOSITORY: 'test/weatherpane',
          PR_BODY_TEMPLATE: '__TAG_NAME__ __COMPARE_URL__',
          PR_CALLS: join(root, 'pr-calls'),
        },
        encoding: 'utf8',
        timeout: 10_000,
      }
    );
  }

  return { root, env, git, commit, run, production };
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Git 훅 환경에서도 바깥 저장소의 설정과 인덱스를 변경하지 않는다', () => {
  const outer = createRepository();
  const headBefore = outer.git('rev-parse', 'HEAD');
  const indexBefore = outer.git('write-tree');
  vi.stubEnv('GIT_DIR', join(outer.root, '.git'));
  vi.stubEnv('GIT_WORK_TREE', outer.root);
  vi.stubEnv('GIT_INDEX_FILE', join(outer.root, '.git/index'));
  const inner = createRepository();
  const result = inner.run();
  expect(result.status, result.stderr).toBe(0);
  expect(outer.git('rev-parse', '--is-bare-repository')).toBe('false');
  expect(outer.git('rev-parse', 'HEAD')).toBe(headBefore);
  expect(outer.git('write-tree')).toBe(indexBefore);
  expect(outer.git('ls-remote', 'origin', 'refs/heads/sync/*')).toBe('');
});

test('rebase 배포 이후 겹치는 수정도 태그와 같은 트리로 충돌 없이 승격한다', () => {
  const { root, env, git, run, production } = createRepository();
  const originalMerge = spawnSync(
    'git',
    ['merge-tree', '--write-tree', 'production', 'v1.0.2'],
    { cwd: root, env, encoding: 'utf8' }
  );
  expect(originalMerge.status).toBe(1);
  expect(originalMerge.stdout).toContain('CONFLICT (content)');

  const result = run();
  expect(result.status, result.stderr).toBe(0);
  const sync = 'origin/sync/production-v1.0.2';
  expect(git('rev-parse', `${sync}^`)).toBe(production);
  expect(git('rev-parse', `${sync}^{tree}`)).toBe(
    git('rev-parse', 'v1.0.2^{tree}')
  );
  expect(git('merge-tree', '--write-tree', 'production', sync)).toBe(
    git('rev-parse', 'v1.0.2^{tree}')
  );
  expect(git('ls-remote', 'origin', 'refs/heads/production')).toBe(
    `${production}\trefs/heads/production`
  );
  expect(readFileSync(join(root, 'pr-calls'), 'utf8')).toContain(
    'pr\ncreate\n--base\nproduction\n--head\nsync/production-v1.0.2\n'
  );
  expect(readFileSync(join(root, 'pr-calls'), 'utf8')).toContain(
    'v1.0.2 https://github.com/test/weatherpane/compare/production...sync/production-v1.0.2\n'
  );
});

test('production이 태그와 같은 내용이면 브랜치나 PR을 만들지 않는다', () => {
  const { root, git, run } = createRepository();
  const result = run('v1.0.1');
  expect(result.status, result.stderr).toBe(0);
  expect(git('ls-remote', 'origin', 'refs/heads/sync/*')).toBe('');
  expect(existsSync(join(root, 'pr-calls'))).toBe(false);
});

test('같은 태그를 재실행해도 기존 승격 브랜치와 PR을 중복 생성하지 않는다', () => {
  const { root, git, run } = createRepository();
  const first = run();
  expect(first.status, first.stderr).toBe(0);
  const branchBefore = git('ls-remote', 'origin', 'refs/heads/sync/*');
  const callsBefore = readFileSync(join(root, 'pr-calls'), 'utf8');
  const repeated = run();
  expect(repeated.status, repeated.stderr).toBe(0);
  expect(git('ls-remote', 'origin', 'refs/heads/sync/*')).toBe(branchBefore);
  expect(readFileSync(join(root, 'pr-calls'), 'utf8')).toBe(callsBefore);
});

test('다음 릴리스도 직전 production 위에 태그의 추가·삭제 파일까지 그대로 승격한다', () => {
  const { root, git, commit, run, production } = createRepository();
  expect(run().status).toBe(0);
  const promoted = git(
    'commit-tree',
    'v1.0.2^{tree}',
    '-p',
    production,
    '-m',
    'rebased second release'
  );
  git('branch', '-f', 'production', promoted);
  git('push', '--quiet', 'origin', 'production');
  git('checkout', '--quiet', 'main');
  commit('third release');
  git('rm', '--quiet', 'weather.txt');
  writeFileSync(join(root, 'forecast.txt'), 'third release forecast\n');
  git('add', 'forecast.txt');
  git('commit', '--quiet', '-m', 'replace forecast file');
  git('tag', 'v1.0.3');
  const tagBefore = git('rev-parse', 'v1.0.3');
  const result = run('v1.0.3');
  expect(result.status, result.stderr).toBe(0);
  const sync = 'origin/sync/production-v1.0.3';
  expect(git('rev-parse', `${sync}^`)).toBe(promoted);
  expect(git('merge-tree', '--write-tree', 'production', sync)).toBe(
    git('rev-parse', 'v1.0.3^{tree}')
  );
  expect(git('ls-tree', '--name-only', sync)).toBe('forecast.txt');
  expect(git('show', `${sync}:forecast.txt`)).toBe('third release forecast');
  expect(git('rev-parse', 'v1.0.3')).toBe(tagBefore);
});
