import { afterEach, describe, expect, it, vi } from 'vitest';

const lookupArtifactPath =
  '../frontend/entities/location/catalog.lookup.generated.json';

afterEach(() => {
  vi.doUnmock(lookupArtifactPath);
  vi.resetModules();
});

describe('catalog lookup artifact validation', () => {
  it('total과 entries 개수가 다르면 산출물을 거부한다', async () => {
    vi.doMock(lookupArtifactPath, () => ({
      default: {
        entries: [],
        ids: 'aaaaaaaaaaaa',
        total: 1,
        version: '1',
      },
    }));

    await expect(
      import('../frontend/entities/location/model/catalog-lookup')
    ).rejects.toThrow(
      'catalog-lookup: fixed-width ID artifact length is invalid'
    );
  });

  it('고정 폭 레코드 경계를 가로지르는 ID 문자열을 찾지 않는다', async () => {
    vi.doMock(lookupArtifactPath, () => ({
      default: {
        entries: [
          ['서울특별시', null, null],
          ['부산광역시', null, null],
        ],
        ids: 'aaaaaaaaaaaabbbbbbbbbbbb',
        total: 2,
        version: '1',
      },
    }));

    const { getCatalogEntryById } =
      await import('../frontend/entities/location/model/catalog-lookup');

    expect(getCatalogEntryById('aaaabbbbbbbb')).toBeNull();
    expect(getCatalogEntryById('bbbbbbbbbbbb')).toMatchObject({
      canonicalPath: '부산광역시',
      catalogLocationId: 'bbbbbbbbbbbb',
    });
  });
});
