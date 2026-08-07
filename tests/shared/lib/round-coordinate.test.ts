import { describe, expect, test } from 'vitest';

import { roundCoordinate } from '../../../frontend/shared/lib/round-coordinate';

describe('roundCoordinate', () => {
  test.each([
    [37.5729, 37.57],
    [126.9794, 126.98],
    [37.5, 37.5],
    [127, 127],
    [-33.8688, -33.87],
  ] as const)('rounds %s to %s (2 decimals)', (input, expected) => {
    expect(roundCoordinate(input)).toBe(expected);
  });
});
