import { describe, expect, test } from 'vitest';

import { applyProxyCacheControl } from '../../../frontend/shared/api/proxy-cache-control';

describe('applyProxyCacheControl', () => {
  test('2xx 응답에 public s-maxage 헤더를 설정한다', () => {
    const response = applyProxyCacheControl(Response.json({ ok: true }), 600);
    const header = response.headers.get('Cache-Control');
    expect(header).toContain('public');
    expect(header).toContain('max-age=0');
    expect(header).toContain('s-maxage=600');
    expect(header).toContain('stale-while-revalidate=600');
  });

  test('오류 응답에는 no-store를 설정한다', () => {
    const response = applyProxyCacheControl(
      Response.json({ code: 'INVALID_PROVIDER_RESPONSE' }, { status: 502 }),
      600
    );
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
