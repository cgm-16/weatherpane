import { describe, expect, test } from 'vitest';

import { formatTemperature } from '../../../frontend/shared/lib/temperature';

describe('formatTemperature', () => {
  test.each([
    [17.2, 'C', '17°'],
    [17.2, 'F', '63°'],
    [-40, 'F', '-40°'],
    [0.4, 'C', '0°'],
  ] as const)('formats %s°C as %s -> %s', (celsius, unit, expected) => {
    expect(formatTemperature(celsius, unit)).toBe(expected);
  });
});
