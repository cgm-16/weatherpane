import { describe, it, expect, vi } from 'vitest';
import { registerServiceWorker } from '~/shared/pwa/register';

describe('registerServiceWorker', () => {
  it('enabled이고 지원될 때 /sw.js를 등록한다', () => {
    const register = vi.fn().mockResolvedValue(undefined);
    registerServiceWorker({
      serviceWorker: { register } as unknown as ServiceWorkerContainer,
      enabled: true,
    });
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('enabled=false(개발)에서는 등록하지 않는다', () => {
    const register = vi.fn();
    registerServiceWorker({
      serviceWorker: { register } as unknown as ServiceWorkerContainer,
      enabled: false,
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('serviceWorker 미지원 환경에서는 조용히 넘어간다', () => {
    expect(() =>
      registerServiceWorker({ serviceWorker: undefined, enabled: true })
    ).not.toThrow();
  });
});
