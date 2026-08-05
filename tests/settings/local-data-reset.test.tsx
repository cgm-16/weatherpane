// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { resetLocalData } from '../../frontend/features/settings/model/reset-local-data';
import { LocalDataReset } from '../../frontend/features/settings/ui/local-data-reset';
import { storageKeys } from '../../frontend/shared/lib/storage/storage-keys';
import type { StorageLike } from '../../frontend/shared/lib/storage/storage-types';
import { createMemoryStorage } from '../storage/test-storage';

function seedResetStorage() {
  const localStorage = createMemoryStorage();
  const sessionStorage = createMemoryStorage();

  for (const key of [
    storageKeys.activeLocation,
    storageKeys.aqiSnapshots,
    storageKeys.favorites,
    storageKeys.recents,
    storageKeys.settings,
    storageKeys.theme,
    storageKeys.weatherSnapshots,
  ]) {
    localStorage.setItem(key, `saved:${key}`);
  }
  for (const key of [storageKeys.theme, storageKeys.unsupportedRouteContext]) {
    sessionStorage.setItem(key, `saved:${key}`);
  }
  localStorage.setItem('other.local.key', 'keep');
  sessionStorage.setItem('other.session.key', 'keep');

  return { localStorage, sessionStorage };
}

describe('LocalDataReset', () => {
  test('확인 대화상자에서 취소하면 초기화를 호출하지 않고 저장값을 보존한다', async () => {
    const user = userEvent.setup();
    const { localStorage, sessionStorage } = seedResetStorage();
    let resetCalls = 0;
    let reloadCalls = 0;

    render(
      <LocalDataReset
        reload={() => {
          reloadCalls += 1;
        }}
        reset={() => {
          resetCalls += 1;
          return resetLocalData({ localStorage, sessionStorage });
        }}
      />
    );

    await user.click(
      screen.getByRole('button', { name: '로컬 데이터 초기화' })
    );
    expect(
      screen.getByRole('alertdialog', { name: '로컬 데이터 초기화' })
    ).toBeInTheDocument();
    expect(screen.getByText(/현재 위치/)).toHaveTextContent('즐겨찾기');
    expect(screen.getByText(/현재 위치/)).toHaveTextContent('최근 위치');
    expect(screen.getByText(/현재 위치/)).toHaveTextContent('날씨');
    expect(screen.getByText(/현재 위치/)).toHaveTextContent('AQI');
    expect(screen.getByText(/현재 위치/)).toHaveTextContent('테마');
    expect(screen.getByText(/현재 위치/)).toHaveTextContent('온도 단위');
    expect(screen.getByText(/현재 위치/)).toHaveTextContent('동작 줄이기');
    expect(screen.getByText(/현재 위치/)).toHaveTextContent(
      '지원하지 않는 위치'
    );

    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(resetCalls).toBe(0);
    expect(reloadCalls).toBe(0);
    expect(localStorage.getItem(storageKeys.activeLocation)).not.toBeNull();
    expect(sessionStorage.getItem(storageKeys.theme)).not.toBeNull();
    expect(localStorage.getItem('other.local.key')).toBe('keep');
    expect(sessionStorage.getItem('other.session.key')).toBe('keep');
  });

  test('확인하면 정확한 대상을 제거한 뒤 한 번만 새로고침한다', async () => {
    const user = userEvent.setup();
    const { localStorage, sessionStorage } = seedResetStorage();
    let reloadCalls = 0;

    render(
      <LocalDataReset
        reload={() => {
          reloadCalls += 1;
        }}
        reset={() => resetLocalData({ localStorage, sessionStorage })}
      />
    );

    await user.click(
      screen.getByRole('button', { name: '로컬 데이터 초기화' })
    );
    await user.click(screen.getByRole('button', { name: '초기화' }));

    expect(localStorage.length).toBe(1);
    expect(sessionStorage.length).toBe(1);
    expect(localStorage.getItem('other.local.key')).toBe('keep');
    expect(sessionStorage.getItem('other.session.key')).toBe('keep');
    expect(reloadCalls).toBe(1);
  });

  test('제거가 하나라도 실패하면 오류를 표시하고 새로고침하지 않는다', async () => {
    const user = userEvent.setup();
    const { localStorage: localMemory, sessionStorage } = seedResetStorage();
    const localStorage: StorageLike = {
      ...localMemory,
      removeItem(key) {
        if (key === storageKeys.favorites) {
          throw new Error('favorites removal failed');
        }
        localMemory.removeItem(key);
      },
    };
    let reloadCalls = 0;

    render(
      <LocalDataReset
        reload={() => {
          reloadCalls += 1;
        }}
        reset={() => resetLocalData({ localStorage, sessionStorage })}
      />
    );

    await user.click(
      screen.getByRole('button', { name: '로컬 데이터 초기화' })
    );
    await user.click(screen.getByRole('button', { name: '초기화' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      '일부 로컬 데이터를 삭제하지 못했습니다.'
    );
    expect(
      screen.getByRole('alertdialog', { name: '로컬 데이터 초기화' })
    ).toBeInTheDocument();
    expect(reloadCalls).toBe(0);
    expect(localMemory.getItem(storageKeys.favorites)).not.toBeNull();
    expect(localMemory.getItem(storageKeys.weatherSnapshots)).toBeNull();
    expect(localMemory.getItem('other.local.key')).toBe('keep');
    expect(sessionStorage.getItem('other.session.key')).toBe('keep');
  });
});
