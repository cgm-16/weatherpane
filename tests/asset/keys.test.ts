// 스케치 시맨틱 키 파서/직렬화/타입 가드 단위 테스트.
import { describe, expect, test } from 'vitest';

import {
  isSemanticKey,
  parseSemanticKey,
  toSemanticKey,
} from '../../frontend/entities/asset/model/keys';

describe('semantic key parse/serialize', () => {
  test('toSemanticKey + parseSemanticKey 라운드트립 (hub/seoul/clear-day)', () => {
    const key = toSemanticKey({
      family: 'hub',
      familyId: 'seoul',
      variant: 'clear-day',
    });
    expect(key).toBe('hub/seoul/clear-day');
    expect(parseSemanticKey(key)).toEqual({
      family: 'hub',
      familyId: 'seoul',
      variant: 'clear-day',
    });
  });

  test('toSemanticKey + parseSemanticKey 라운드트립 (generic/urban/rainy-night)', () => {
    const key = toSemanticKey({
      family: 'generic',
      familyId: 'urban',
      variant: 'rainy-night',
    });
    expect(key).toBe('generic/urban/rainy-night');
    expect(parseSemanticKey(key)).toEqual({
      family: 'generic',
      familyId: 'urban',
      variant: 'rainy-night',
    });
  });

  test('parseSemanticKey는 형식이 맞지 않으면 null을 반환한다', () => {
    expect(parseSemanticKey('not-a-key')).toBeNull();
    expect(parseSemanticKey('hub/seoul')).toBeNull();
    expect(parseSemanticKey('weird/seoul/clear-day')).toBeNull();
  });

  test('parseSemanticKey는 유효한 키를 분해한다', () => {
    expect(parseSemanticKey('hub/seoul/clear-day')).toEqual({
      family: 'hub',
      familyId: 'seoul',
      variant: 'clear-day',
    });
  });

  test('isSemanticKey는 유효한 키에 true, 그 외에는 false를 반환한다', () => {
    expect(isSemanticKey('hub/seoul/clear-day')).toBe(true);
    expect(isSemanticKey('generic/urban/clear-day')).toBe(true);
    expect(isSemanticKey('bad')).toBe(false);
    expect(isSemanticKey(42)).toBe(false);
    expect(isSemanticKey(null)).toBe(false);
  });
});
