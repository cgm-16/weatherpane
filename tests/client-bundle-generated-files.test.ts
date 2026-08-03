import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  readGeneratedJsonFile,
  readOptionalGeneratedJsonFile,
} from '../scripts/client-bundle-budget';

const temporaryDirectories: string[] = [];
const prerequisiteCommand = 'pnpm build';

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'weatherpane-bundle-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
  temporaryDirectories.length = 0;
});

describe('generated bundle file loading', () => {
  it('필수 생성 파일이 없으면 경로와 선행 명령을 안내한다', async () => {
    const filePath = join(await createTemporaryDirectory(), 'missing.json');

    await expect(
      readGeneratedJsonFile(filePath, prerequisiteCommand)
    ).rejects.toThrow(
      `생성 파일을 읽을 수 없습니다: ${filePath}. 먼저 \`${prerequisiteCommand}\`을 실행하세요.`
    );
  });

  it('필수 생성 파일의 JSON이 잘못되면 경로와 선행 명령을 안내한다', async () => {
    const filePath = join(await createTemporaryDirectory(), 'malformed.json');
    await writeFile(filePath, '{');

    await expect(
      readGeneratedJsonFile(filePath, prerequisiteCommand)
    ).rejects.toThrow(
      `생성 파일을 읽을 수 없습니다: ${filePath}. 먼저 \`${prerequisiteCommand}\`을 실행하세요.`
    );
  });

  it('선택 생성 파일이 없으면 null을 반환한다', async () => {
    const filePath = join(await createTemporaryDirectory(), 'missing.json');

    await expect(
      readOptionalGeneratedJsonFile(filePath, prerequisiteCommand)
    ).resolves.toBeNull();
  });

  it('선택 생성 파일의 JSON이 잘못되면 오류를 숨기지 않는다', async () => {
    const filePath = join(await createTemporaryDirectory(), 'malformed.json');
    await writeFile(filePath, '{');

    await expect(
      readOptionalGeneratedJsonFile(filePath, prerequisiteCommand)
    ).rejects.toThrow(
      `생성 파일을 읽을 수 없습니다: ${filePath}. 먼저 \`${prerequisiteCommand}\`을 실행하세요.`
    );
  });
});
