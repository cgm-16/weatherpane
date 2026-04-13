// generic 패밀리의 6-variant 폴백 재작성 규칙 테스트.
import { describe, expect, test } from 'vitest';

import { resolveGenericVariant } from '../../frontend/entities/asset/model/variant';

describe('resolveGenericVariant', () => {
  test('cloudy-night는 clear-night로 재작성된다', () => {
    expect(resolveGenericVariant('cloudy-night')).toBe('clear-night');
  });

  test('snowy-night는 rainy-night로 재작성된다', () => {
    expect(resolveGenericVariant('snowy-night')).toBe('rainy-night');
  });

  test('clear-day는 재작성 없이 그대로 반환된다', () => {
    expect(resolveGenericVariant('clear-day')).toBe('clear-day');
  });

  test('rainy-day는 재작성 없이 그대로 반환된다', () => {
    expect(resolveGenericVariant('rainy-day')).toBe('rainy-day');
  });
});
