import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, test, vi } from 'vitest';

type CachedResponse = {
  body: string;
  status: number;
  clone: () => CachedResponse;
};

type CacheFailures = {
  open?: (cacheName: string) => boolean;
  match?: (cacheName: string, request: string) => boolean;
  put?: (cacheName: string, request: string) => boolean;
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
    private readonly name: string,
    private readonly failures: CacheFailures
  ) {}

  async keys() {
    return [...this.entries.keys()];
  }

  async delete(request: string | { url: string }) {
    return this.entries.delete(cacheKey(request));
  }

  async match(request: string | { url: string }) {
    const key = cacheKey(request);
    if (this.failures.match?.(this.name, key)) {
      throw new Error(`캐시 조회 실패: ${key}`);
    }
    return this.entries.get(key);
  }

  async put(request: string | { url: string }, response: CachedResponse) {
    const key = cacheKey(request);
    if (this.failures.put?.(this.name, key)) {
      throw new Error(`캐시 복사 실패: ${key}`);
    }
    this.entries.set(key, response);
  }
}

class MemoryCacheStorage {
  readonly caches = new Map<string, MemoryCache>();
  readonly deleted: string[] = [];

  constructor(private readonly failures: CacheFailures = {}) {}

  add(name: string, entries: Record<string, string> = {}) {
    const cache = new MemoryCache(name, this.failures);
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
    if (this.failures.open?.(name)) {
      throw new Error(`캐시 열기 실패: ${name}`);
    }
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

  async function dispatchFetch(request: {
    url: string;
    method: string;
    mode?: string;
  }) {
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
    if (!response) {
      return { respondWithCalled: false, response: undefined };
    }
    const resolved = await response;
    await Promise.all(backgroundTasks);
    return { respondWithCalled: true, response: resolved };
  }

  return {
    claim,
    async install() {
      let installation: Promise<void> | undefined;
      listeners.get('install')?.({
        waitUntil(promise: Promise<void>) {
          installation = promise;
        },
      });
      await installation;
    },
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
    dispatchFetch,
    async fetch(request: { url: string; method: string; mode?: string }) {
      const result = await dispatchFetch(request);
      if (!result.respondWithCalled || !result.response)
        throw new Error('fetch 핸들러가 응답을 등록하지 않았습니다.');
      return result.response;
    },
  };
}

async function responseBody(cache: MemoryCache, request: string) {
  return (await cache.match(request))?.body;
}

describe('서비스 워커 캐시 버전 전환', () => {
  test('이전 앱 셸과 에셋 캐시 항목을 삭제 전에 현재 캐시로 옮긴다', async () => {
    const caches = new MemoryCacheStorage();
    caches.add('weatherpane-app-shell-v1', {
      'https://weatherpane.test/': '셸',
    });
    caches.add('weatherpane-assets-v1', {
      'https://weatherpane.test/assets/app.js': '에셋',
    });
    const serviceWorker = loadServiceWorker(caches);

    await serviceWorker.activate();

    const appShell = await caches.open('weatherpane-app-shell-v2');
    const assets = await caches.open('weatherpane-assets-v2');
    expect(await responseBody(appShell, 'https://weatherpane.test/')).toBe(
      '셸'
    );
    expect(
      await responseBody(assets, 'https://weatherpane.test/assets/app.js')
    ).toBe('에셋');
    expect(caches.caches.has('weatherpane-app-shell-v1')).toBe(false);
    expect(caches.caches.has('weatherpane-assets-v1')).toBe(false);
  });

  test('더 새 이전 버전을 먼저 복사하고 현재 캐시 항목을 덮어쓰지 않는다', async () => {
    const caches = new MemoryCacheStorage();
    caches.add('weatherpane-app-shell-v3', {
      'https://weatherpane.test/': '이전 셸',
      'https://weatherpane.test/about': '이전 소개',
    });
    caches.add('weatherpane-app-shell-v4', {
      'https://weatherpane.test/': '더 새 셸',
      'https://weatherpane.test/about': '더 새 소개',
    });
    caches.add('weatherpane-assets-v3', {
      'https://weatherpane.test/assets/app.js': '이전 에셋',
    });
    caches.add('weatherpane-assets-v4', {
      'https://weatherpane.test/assets/app.js': '더 새 에셋',
    });
    caches.add('weatherpane-app-shell-v2', {
      'https://weatherpane.test/': '현재 셸',
    });
    const serviceWorker = loadServiceWorker(caches);

    await serviceWorker.activate();

    const appShell = await caches.open('weatherpane-app-shell-v2');
    const assets = await caches.open('weatherpane-assets-v2');
    expect(await responseBody(appShell, 'https://weatherpane.test/')).toBe(
      '현재 셸'
    );
    expect(await responseBody(appShell, 'https://weatherpane.test/about')).toBe(
      '더 새 소개'
    );
    expect(
      await responseBody(assets, 'https://weatherpane.test/assets/app.js')
    ).toBe('더 새 에셋');
    expect(serviceWorker.claim).toHaveBeenCalledOnce();
  });

  test('캐시 복사가 실패하면 정리와 clients.claim 전에 활성화를 거절한다', async () => {
    const caches = new MemoryCacheStorage({
      put: (cacheName, request) =>
        cacheName === 'weatherpane-assets-v2' &&
        request === 'https://weatherpane.test/assets/app.js',
    });
    caches.add('weatherpane-app-shell-v1', {
      'https://weatherpane.test/': '셸',
    });
    caches.add('weatherpane-assets-v1', {
      'https://weatherpane.test/assets/app.js': '에셋',
    });
    const serviceWorker = loadServiceWorker(caches);

    await expect(serviceWorker.activate()).rejects.toThrow('캐시 복사 실패');

    expect(caches.deleted).toEqual([]);
    expect(caches.caches.has('weatherpane-app-shell-v1')).toBe(true);
    expect(caches.caches.has('weatherpane-assets-v1')).toBe(true);
    expect(serviceWorker.claim).not.toHaveBeenCalled();
  });
});

describe('서비스 워커 스케치 재검증', () => {
  test('해시된 assets WebP는 캐시 우선으로 반환한다', async () => {
    const assetUrl = 'https://weatherpane.test/assets/logo-a1b2c3.webp';
    const request = { url: assetUrl, method: 'GET' };
    const caches = new MemoryCacheStorage();
    caches.add('weatherpane-assets-v2', { [assetUrl]: '캐시된 에셋' });
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
    caches.add('weatherpane-assets-v2', { [sketchUrl]: '오래된 스케치' });
    const networkFetch = vi.fn().mockResolvedValue(createResponse('새 스케치'));
    const serviceWorker = loadServiceWorker(caches, networkFetch);

    const response = await serviceWorker.fetch(request);

    expect(response.body).toBe('새 스케치');
    expect(networkFetch).toHaveBeenCalledWith(request);
    expect(
      await responseBody(await caches.open('weatherpane-assets-v2'), sketchUrl)
    ).toBe('새 스케치');
  });
});

describe('서비스 워커 캐시 실패 폴백', () => {
  test('캐시 우선은 캐시 열기가 실패해도 네트워크 응답을 반환한다', async () => {
    const assetUrl = 'https://weatherpane.test/assets/app-a1b2c3.js';
    const request = { url: assetUrl, method: 'GET' };
    const caches = new MemoryCacheStorage({
      open: (cacheName) => cacheName === 'weatherpane-assets-v2',
    });
    const networkFetch = vi.fn().mockResolvedValue(createResponse('새 에셋'));
    const serviceWorker = loadServiceWorker(caches, networkFetch);

    const response = await serviceWorker.fetch(request);

    expect(response.body).toBe('새 에셋');
  });

  test('캐시 우선은 캐시 조회가 실패해도 네트워크 응답을 반환한다', async () => {
    const assetUrl = 'https://weatherpane.test/assets/app-a1b2c3.js';
    const request = { url: assetUrl, method: 'GET' };
    const caches = new MemoryCacheStorage({
      match: (cacheName) => cacheName === 'weatherpane-assets-v2',
    });
    caches.add('weatherpane-assets-v2');
    const networkFetch = vi.fn().mockResolvedValue(createResponse('새 에셋'));
    const serviceWorker = loadServiceWorker(caches, networkFetch);

    const response = await serviceWorker.fetch(request);

    expect(response.body).toBe('새 에셋');
  });

  test('캐시 우선은 네트워크도 실패하면 원래 네트워크 오류를 유지한다', async () => {
    const assetUrl = 'https://weatherpane.test/assets/app-a1b2c3.js';
    const request = { url: assetUrl, method: 'GET' };
    const caches = new MemoryCacheStorage({
      open: (cacheName) => cacheName === 'weatherpane-assets-v2',
    });
    const networkError = new Error('원래 네트워크 오류');
    const networkFetch = vi.fn().mockRejectedValue(networkError);
    const serviceWorker = loadServiceWorker(caches, networkFetch);

    await expect(serviceWorker.fetch(request)).rejects.toBe(networkError);
  });

  test('네트워크 우선은 캐시 열기가 실패해도 네트워크 응답을 반환한다', async () => {
    const sketchUrl = 'https://weatherpane.test/sketches/clear-day.webp';
    const request = { url: sketchUrl, method: 'GET' };
    const caches = new MemoryCacheStorage({
      open: (cacheName) => cacheName === 'weatherpane-assets-v2',
    });
    const networkFetch = vi.fn().mockResolvedValue(createResponse('새 스케치'));
    const serviceWorker = loadServiceWorker(caches, networkFetch);

    const response = await serviceWorker.fetch(request);

    expect(response.body).toBe('새 스케치');
  });

  test('네트워크 우선은 캐시 쓰기가 실패해도 네트워크 응답을 반환한다', async () => {
    const sketchUrl = 'https://weatherpane.test/sketches/clear-day.webp';
    const request = { url: sketchUrl, method: 'GET' };
    const caches = new MemoryCacheStorage({
      put: (cacheName) => cacheName === 'weatherpane-assets-v2',
    });
    const networkFetch = vi.fn().mockResolvedValue(createResponse('새 스케치'));
    const serviceWorker = loadServiceWorker(caches, networkFetch);

    const response = await serviceWorker.fetch(request);

    expect(response.body).toBe('새 스케치');
  });

  test('네트워크 실패 뒤 캐시 열기도 실패하면 원래 네트워크 오류를 유지한다', async () => {
    const request = {
      url: 'https://weatherpane.test/',
      method: 'GET',
      mode: 'navigate',
    };
    const caches = new MemoryCacheStorage({
      open: (cacheName) => cacheName === 'weatherpane-app-shell-v2',
    });
    const networkError = new Error('원래 네트워크 오류');
    const networkFetch = vi.fn().mockRejectedValue(networkError);
    const serviceWorker = loadServiceWorker(caches, networkFetch);

    await expect(serviceWorker.fetch(request)).rejects.toBe(networkError);
  });

  test('네트워크 실패 뒤 캐시 조회도 실패하면 원래 네트워크 오류를 유지한다', async () => {
    const request = {
      url: 'https://weatherpane.test/',
      method: 'GET',
      mode: 'navigate',
    };
    const caches = new MemoryCacheStorage({
      match: (cacheName) => cacheName === 'weatherpane-app-shell-v2',
    });
    caches.add('weatherpane-app-shell-v2');
    const networkError = new Error('원래 네트워크 오류');
    const networkFetch = vi.fn().mockRejectedValue(networkError);
    const serviceWorker = loadServiceWorker(caches, networkFetch);

    await expect(serviceWorker.fetch(request)).rejects.toBe(networkError);
  });
});

describe('서비스 워커 라우팅 제외 경계', () => {
  test('동일 출처 /v1/* GET 요청을 가로채지 않는다', async () => {
    const serviceWorker = loadServiceWorker(new MemoryCacheStorage());

    const result = await serviceWorker.dispatchFetch({
      url: 'https://weatherpane.test/v1/weather/core',
      method: 'GET',
    });

    expect(result.respondWithCalled).toBe(false);
  });

  test('교차 출처 WebP GET 요청을 가로채지 않는다', async () => {
    const serviceWorker = loadServiceWorker(new MemoryCacheStorage());

    const result = await serviceWorker.dispatchFetch({
      url: 'https://assets.example.test/clear-day.webp',
      method: 'GET',
    });

    expect(result.respondWithCalled).toBe(false);
  });
});

describe('서비스 워커 오프라인 문서', () => {
  test('설치 때 전용 오프라인 문서를 저장한다', async () => {
    const caches = new MemoryCacheStorage();
    const networkFetch = vi
      .fn()
      .mockResolvedValue(createResponse('오프라인 안내'));
    const worker = loadServiceWorker(caches, networkFetch);

    await worker.install();

    expect(
      await responseBody(
        await caches.open('weatherpane-app-shell-v2'),
        'https://weatherpane.test/offline.html'
      )
    ).toBe('오프라인 안내');
    expect(networkFetch).toHaveBeenCalledWith(
      'https://weatherpane.test/offline.html',
      { cache: 'reload' }
    );
  });

  test('오프라인 문서 다운로드가 실패하면 설치를 완료하지 않는다', async () => {
    const caches = new MemoryCacheStorage();
    const worker = loadServiceWorker(
      caches,
      vi.fn().mockResolvedValue({ ...createResponse('없음'), status: 404 })
    );
    await expect(worker.install()).rejects.toThrow();
  });

  test.each(['/favorites', '/settings', '/search?q=서울'])(
    '%s 문서가 없으면 홈 HTML 대신 전용 오프라인 문서를 반환한다',
    async (path) => {
      const caches = new MemoryCacheStorage();
      caches.add('weatherpane-app-shell-v2', {
        'https://weatherpane.test/': '홈 SSR',
        'https://weatherpane.test/offline.html': '오프라인 안내',
      });
      const worker = loadServiceWorker(
        caches,
        vi.fn().mockRejectedValue(new Error('오프라인'))
      );
      const response = await worker.fetch({
        url: `https://weatherpane.test${path}`,
        method: 'GET',
        mode: 'navigate',
      });
      expect(response.body).toBe('오프라인 안내');
    }
  );

  test('같은 URL의 문서가 있으면 전용 오프라인 문서보다 우선한다', async () => {
    const caches = new MemoryCacheStorage();
    caches.add('weatherpane-app-shell-v2', {
      'https://weatherpane.test/favorites': '즐겨찾기 SSR',
      'https://weatherpane.test/offline.html': '오프라인 안내',
    });
    const worker = loadServiceWorker(
      caches,
      vi.fn().mockRejectedValue(new Error('오프라인'))
    );
    const response = await worker.fetch({
      url: 'https://weatherpane.test/favorites',
      method: 'GET',
      mode: 'navigate',
    });
    expect(response.body).toBe('즐겨찾기 SSR');
  });

  test('누락된 스케치에 HTML 폴백을 보내지 않는다', async () => {
    const caches = new MemoryCacheStorage();
    caches.add('weatherpane-app-shell-v2', {
      'https://weatherpane.test/offline.html': '오프라인 안내',
    });
    const error = new Error('오프라인');
    const worker = loadServiceWorker(caches, vi.fn().mockRejectedValue(error));
    await expect(
      worker.fetch({
        url: 'https://weatherpane.test/missing.webp',
        method: 'GET',
      })
    ).rejects.toBe(error);
  });
});

describe('서비스 워커 에셋 캐시 상한', () => {
  test.each(['/assets/new.js', '/sketches/new.webp'])(
    '%s 저장 후 오래된 항목을 제거해 200개를 유지한다',
    async (path) => {
      const caches = new MemoryCacheStorage();
      const assets = caches.add(
        'weatherpane-assets-v2',
        Object.fromEntries(
          Array.from({ length: 200 }, (_, index) => [
            `https://weatherpane.test/assets/${index}.js`,
            `${index}`,
          ])
        )
      );
      const worker = loadServiceWorker(
        caches,
        vi.fn().mockResolvedValue(createResponse('새 에셋'))
      );
      await worker.fetch({
        url: `https://weatherpane.test${path}`,
        method: 'GET',
      });
      expect(await assets.keys()).toHaveLength(200);
      expect(
        await responseBody(assets, 'https://weatherpane.test/assets/0.js')
      ).toBeUndefined();
      expect(
        await responseBody(assets, `https://weatherpane.test${path}`)
      ).toBe('새 에셋');
    }
  );

  test('이전 캐시 이관 후에도 상한을 적용하고 문서 캐시는 보존한다', async () => {
    const caches = new MemoryCacheStorage();
    caches.add(
      'weatherpane-assets-v1',
      Object.fromEntries(
        Array.from({ length: 205 }, (_, index) => [
          `https://weatherpane.test/assets/${index}.js`,
          `${index}`,
        ])
      )
    );
    caches.add('weatherpane-app-shell-v1', {
      'https://weatherpane.test/': '홈 SSR',
    });
    const worker = loadServiceWorker(caches);
    await worker.activate();
    expect(
      await (await caches.open('weatherpane-assets-v2')).keys()
    ).toHaveLength(200);
    expect(
      await responseBody(
        await caches.open('weatherpane-app-shell-v2'),
        'https://weatherpane.test/'
      )
    ).toBe('홈 SSR');
    expect(caches.caches.has('weatherpane-assets-v1')).toBe(false);
  });
});
