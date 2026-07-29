// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { useOnlineStatus } from '~/shared/hooks/use-online-status';

// renderToString 테스트 전용 컴포넌트. 모듈 최상위에 정의해야 한다
// (eslint: component-hook-factories).
function OnlineStatusProbe() {
  const { isOnline } = useOnlineStatus();
  return createElement('span', null, String(isOnline));
}

describe('useOnlineStatus', () => {
  beforeEach(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('초기 상태: 브라우저가 온라인이면 isOnline은 true', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('초기 상태: 브라우저가 오프라인이면 isOnline은 false', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(false);
  });

  it('offline 이벤트 수신 시 isOnline이 false로 변한다', () => {
    const { result } = renderHook(() => useOnlineStatus());
    act(() => {
      // HTML 표준상 브라우저는 navigator.onLine 값을 먼저 반영한 뒤 이벤트를
      // 발생시킨다. mock도 이벤트 발생 직전에 값을 갱신해 그 순서를 재현한다.
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);
  });

  it('online 이벤트 수신 시 isOnline이 true로 변한다', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = renderHook(() => useOnlineStatus());
    act(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOnline).toBe(true);
  });

  it('언마운트 시 이벤트 리스너를 정리한다', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnlineStatus());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});

describe('useOnlineStatus - Node 24 SSR 환경 (navigator는 있지만 onLine이 없음)', () => {
  let savedNavigator: PropertyDescriptor | undefined;

  beforeEach(() => {
    // Node 21+는 globalThis.navigator를 정의하지만 onLine 프로퍼티는 없다.
    // navigator가 아예 undefined인 Node 20 시뮬레이션은 실제 버그를 재현하지
    // 못하므로(early-return으로 우회됨), onLine이 빠진 객체로 대체한다.
    savedNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'node' },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (savedNavigator) {
      Object.defineProperty(globalThis, 'navigator', savedNavigator);
    }
  });

  it('navigator에 onLine이 없는 환경에서도 초기 상태는 true(온라인으로 가정)다', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('react-dom/server의 renderToString으로 렌더링해도 isOnline은 true다', () => {
    // 두 가지를 동시에 검증해야 한다.
    // 1) 실제 Node 24와 동일하게 navigator는 존재하되 onLine이 없는 상태에서도
    //    렌더링 결과가 true여야 한다. navigator를 아예 undefined로 만들면
    //    typeof navigator === 'undefined' || navigator.onLine 같은 예전 표현식이
    //    early-return으로 우회되어 버그를 재현하지 못한다.
    // 2) getServerSnapshot이 navigator의 어떤 프로퍼티도 읽지 않아야 한다(SSR은
    //    navigator에 의존해서는 안 된다).
    // Proxy로 프로퍼티 접근을 기록하면서도 Node 24와 동일한 모양(onLine 없음)을
    // 유지해 두 요구를 동시에 만족시킨다.
    const accessedProperties: PropertyKey[] = [];
    const nodeLikeNavigator = new Proxy(
      { userAgent: 'node' },
      {
        get(target, prop, receiver) {
          accessedProperties.push(prop);
          return Reflect.get(target, prop, receiver);
        },
      }
    );

    Object.defineProperty(globalThis, 'navigator', {
      value: nodeLikeNavigator,
      configurable: true,
      writable: true,
    });

    const html = renderToString(createElement(OnlineStatusProbe));

    expect(accessedProperties).toEqual([]);
    expect(html).toBe('<span>true</span>');
  });
});
