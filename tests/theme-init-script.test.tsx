// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { runInNewContext } from 'node:vm';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();

  return {
    ...actual,
    Links: () => null,
    Meta: () => null,
    Scripts: () => null,
    ScrollRestoration: () => null,
  };
});

vi.mock(
  '../frontend/shared/lib/storage/storage-keys',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('../frontend/shared/lib/storage/storage-keys')
      >();
    const storageSchemaVersion = 2;

    return {
      ...actual,
      storageKeys: {
        ...actual.storageKeys,
        theme: `weatherpane.theme.v${storageSchemaVersion}`,
      },
      storageSchemaVersion,
    };
  }
);

import { Layout } from '../app/root';

function runThemeInitScript() {
  const markup = renderToStaticMarkup(
    <Layout>
      <main />
    </Layout>
  );
  const parsedDocument = new DOMParser().parseFromString(markup, 'text/html');
  const script = parsedDocument.querySelector('head script')?.textContent;

  if (!script) {
    throw new Error('테마 초기화 스크립트를 찾을 수 없습니다.');
  }
  runInNewContext(script, { document, localStorage, sessionStorage, window });
}

describe('하이드레이션 전 테마 초기화', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.classList.remove('dark');
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: false })),
      writable: true,
    });
  });

  test('현재 스키마 버전으로 저장된 테마를 적용한다', () => {
    localStorage.setItem(
      'weatherpane.theme.v2',
      JSON.stringify({ data: 'dark', version: 2 })
    );

    runThemeInitScript();

    expect(document.documentElement).toHaveClass('dark');
  });
});
