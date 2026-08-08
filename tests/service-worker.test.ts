import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, test, vi } from 'vitest';

type CachedResponse = {
  body: string;
  status: number;
  clone: () => CachedResponse;
};

function createResponse(body: string): CachedResponse {
  return {
    body,
    status: 200,
    clone: () => createResponse(body),
  };
}

function cacheKey(request: string | { url: string }) {
  return typeof request === 'string' ? request : request.url;
}

class MemoryCache {
  readonly entries = new Map<string, CachedResponse>();

  constructor(
    private readonly shouldFailPut: (request: string) => boolean = () => false
  ) {}

  async keys() {
    return [...this.entries.keys()];
  }

  async match(request: string | { url: string }) {
    return this.entries.get(cacheKey(request));
  }

  async put(request: string | { url: string }, response: CachedResponse) {
    const key = cacheKey(request);
    if (this.shouldFailPut(key)) {
      throw new Error(`캐시 복사 실패: ${key}`);
    }
    this.entries.set(key, response);
  }
}

class MemoryCacheStorage {
  readonly caches = new Map<string, MemoryCache>();
  readonly deleted: string[] = [];

  constructor(
    private readonly shouldFailPut: (
      cacheName: string,
      request: string
    ) => boolean = () => false
  ) {}

  add(name: string, entries: Record<string, string> = {}) {
    const cache = new MemoryCache((request) =>
      this.shouldFailPut(name, request)
    );
    for (const [request, body] of Object.entries(entries)) {
      cache.entries.set(request, createResponse(body));
    }
    this.caches.set(name, cache);
    return cache;
  }

  async keys() {
    return [...this.caches.keys()];
  }

  async open(name: string) {
    return this.caches.get(name) ?? this.add(name);
  }

  async delete(name: string) {
    this.deleted.push(name);
    return this.caches.delete(name);
  }
}

function loadServiceWorker(caches: MemoryCacheStorage, networkFetch = vi.fn()) {
  const listeners = new Map<string, (event: unknown) => void>();
  const claim = vi.fn().mockResolvedValue(undefined);
  const serviceWorker = {
    addEventListener(type: string, listener: (event: unknown) => void) {
      listeners.set(type, listener);
    },
    clients: { claim },
    location: { origin: 'https://weatherpane.test' },
  };
  const source = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

  vm.runInNewContext(source, {
    self: serviceWorker,
    caches,
    fetch: networkFetch,
    URL,
  });

  return {
    claim,
    async activate() {
      let activation: Promise<void> | undefined;
      listeners.get('activate')?.({
        waitUntil(promise: Promise<void>) {
          activation = promise;
        },
      });
      if (!activation)
        throw new Error('activate 핸들러가 등록되지 않았습니다.');
      await activation;
    },
    async fetch(request: { url: string; method: string; mode?: string }) {
      let response: Promise<CachedResponse> | undefined;
      const backgroundTasks: Promise<unknown>[] = [];
      listeners.get('fetch')?.({
        request,
        respondWith(promise: Promise<CachedResponse>) {
          response = promise;
        },
        waitUntil(promise: Promise<unknown>) {
          backgroundTasks.push(promise);
        },
      });
      if (!response)
        throw new Error('fetch 핸들러가 응답을 등록하지 않았습니다.');
      const resolved = await response;
      await Promise.all(backgroundTasks);
      return resolved;
    },
  };
}

async function responseBody(cache: MemoryCache, request: string) {
  return (await cache.match(request))?.body;
}

describe('서비스 워커 캐시 버전 전환', () => {
  test('이전 앱 셸과 에셋 캐시 항목을 삭제 전에 현재 캐시로 옮긴다', async () => {
    const caches = new MemoryCacheStorage();
    caches.add('weatherpane-app-shell-v0', {
      'https://weatherpane.test/': '셸',
    });
    caches.add('weatherpane-assets-v0', {
      'https://weatherpane.test/assets/app.js': '에셋',
    });
    const serviceWorker = loadServiceWorker(caches);

    await serviceWorker.activate();

    const appShell = await caches.open('weatherpane-app-shell-v1');
    const assets = await caches.open('weatherpane-assets-v1');
    expect(await responseBody(appShell, 'https://weatherpane.test/')).toBe(
      '셸'
    );
    expect(
      await responseBody(assets, 'https://weatherpane.test/assets/app.js')
    ).toBe('에셋');
    expect(caches.caches.has('weatherpane-app-shell-v0')).toBe(false);
    expect(caches.caches.has('weatherpane-assets-v0')).toBe(false);
  });

  test('더 새 이전 버전을 먼저 복사하고 현재 캐시 항목을 덮어쓰지 않는다', async () => {
    const caches = new MemoryCacheStorage();
    caches.add('weatherpane-app-shell-v3', {
      'https://weatherpane.test/': 'v3 셸',
      'https://weatherpane.test/about': 'v3 소개',
    });
    caches.add('weatherpane-app-shell-v2', {
      'https://weatherpane.test/': 'v2 셸',
    });
    caches.add('weatherpane-assets-v3', {
      'https://weatherpane.test/assets/app.js': 'v3 에셋',
    });
    caches.add('weatherpane-assets-v2', {
      'https://weatherpane.test/assets/app.js': 'v2 에셋',
    });
    caches.add('weatherpane-app-shell-v1', {
      'https://weatherpane.test/': '현재 셸',
    });
    const serviceWorker = loadServiceWorker(caches);

    await serviceWorker.activate();

    const appShell = await caches.open('weatherpane-app-shell-v1');
    const assets = await caches.open('weatherpane-assets-v1');
    expect(await responseBody(appShell, 'https://weatherpane.test/')).toBe(
      '현재 셸'
    );
    expect(await responseBody(appShell, 'https://weatherpane.test/about')).toBe(
      'v3 소개'
    );
    expect(
      await responseBody(assets, 'https://weatherpane.test/assets/app.js')
    ).toBe('v3 에셋');
    expect(serviceWorker.claim).toHaveBeenCalledOnce();
  });

  test('캐시 복사가 실패하면 정리와 clients.claim 전에 활성화를 거절한다', async () => {
    const caches = new MemoryCacheStorage(
      (cacheName, request) =>
        cacheName === 'weatherpane-assets-v1' &&
        request === 'https://weatherpane.test/assets/app.js'
    );
    caches.add('weatherpane-app-shell-v0', {
      'https://weatherpane.test/': '셸',
    });
    caches.add('weatherpane-assets-v0', {
      'https://weatherpane.test/assets/app.js': '에셋',
    });
    const serviceWorker = loadServiceWorker(caches);

    await expect(serviceWorker.activate()).rejects.toThrow('캐시 복사 실패');

    expect(caches.deleted).toEqual([]);
    expect(caches.caches.has('weatherpane-app-shell-v0')).toBe(true);
    expect(caches.caches.has('weatherpane-assets-v0')).toBe(true);
    expect(serviceWorker.claim).not.toHaveBeenCalled();
  });
});

describe('서비스 워커 스케치 재검증', () => {
  test('해시된 assets WebP는 캐시 우선으로 반환한다', async () => {
    const assetUrl = 'https://weatherpane.test/assets/logo-a1b2c3.webp';
    const request = { url: assetUrl, method: 'GET' };
    const caches = new MemoryCacheStorage();
    caches.add('weatherpane-assets-v1', { [assetUrl]: '캐시된 에셋' });
    const networkFetch = vi
      .fn()
      .mockRejectedValue(new Error('네트워크를 호출하면 안 됩니다.'));
    const serviceWorker = loadServiceWorker(caches, networkFetch);

    const response = await serviceWorker.fetch(request);

    expect(response.body).toBe('캐시된 에셋');
    expect(networkFetch).not.toHaveBeenCalled();
  });

  test('캐시된 동일 출처 WebP를 네트워크 응답으로 갱신한다', async () => {
    const sketchUrl =
      'https://weatherpane.test/sketches/hub/seoul/clear-day.webp';
    const request = { url: sketchUrl, method: 'GET' };
    const caches = new MemoryCacheStorage();
    caches.add('weatherpane-assets-v1', { [sketchUrl]: '오래된 스케치' });
    const networkFetch = vi.fn().mockResolvedValue(createResponse('새 스케치'));
    const serviceWorker = loadServiceWorker(caches, networkFetch);

    const response = await serviceWorker.fetch(request);

    expect(response.body).toBe('새 스케치');
    expect(networkFetch).toHaveBeenCalledWith(request);
    expect(
      await responseBody(await caches.open('weatherpane-assets-v1'), sketchUrl)
    ).toBe('새 스케치');
  });
});
