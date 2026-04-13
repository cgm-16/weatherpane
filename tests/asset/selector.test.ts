// 위치와 날씨 조건으로부터 스케치 시맨틱 키를 선택하는 로직의 테스트.
import { describe, expect, test } from 'vitest';

import { selectSketchKey } from '../../frontend/entities/asset/model/selector';
import type {
  RawGpsFallbackLocation,
  ResolvedLocation,
} from '../../frontend/entities/location/model/types';
import type {
  WeatherCondition,
  WeatherVisualBucket,
} from '../../frontend/entities/weather/model/core-weather';

function makeResolved(admin1: string, admin2?: string): ResolvedLocation {
  return {
    kind: 'resolved',
    locationId: `loc_${admin1}_${admin2 ?? 'none'}`,
    catalogLocationId: `catalog:${admin1}-${admin2 ?? 'none'}`,
    name: `${admin1} ${admin2 ?? ''}`.trim(),
    admin1,
    admin2,
    latitude: 37.5,
    longitude: 127,
    timezone: 'Asia/Seoul',
  };
}

function makeRawGps(): RawGpsFallbackLocation {
  return {
    kind: 'raw-gps',
    locationId: 'loc_raw_gps_1',
    name: '현재 위치',
    latitude: 36.0,
    longitude: 128.0,
    capturedAt: '2026-04-13T09:00:00+09:00',
    fallbackReason: 'canonicalization-failed',
  };
}

function makeCondition(
  visualBucket: WeatherVisualBucket,
  isDay: boolean
): WeatherCondition {
  return {
    code: `${visualBucket}-${isDay ? 'day' : 'night'}`,
    text: `${visualBucket} ${isDay ? 'day' : 'night'}`,
    isDay,
    visualBucket,
    textMapping: {
      conditionCode: `${visualBucket}-${isDay ? 'day' : 'night'}`,
      isDay,
      precipitationKind:
        visualBucket === 'rainy'
          ? 'rain'
          : visualBucket === 'snowy'
            ? 'snow'
            : 'none',
      cloudCoverPct: visualBucket === 'clear' ? 5 : 80,
      intensity: 'moderate',
    },
  };
}

describe('selectSketchKey - 서울 허브 (full-8, 재작성 없음)', () => {
  const gangnam = makeResolved('서울특별시', '강남구');
  const jongno = makeResolved('서울특별시', '종로구');

  test('서울 강남, clear day -> hub/seoul/clear-day', () => {
    expect(selectSketchKey(gangnam, makeCondition('clear', true))).toBe(
      'hub/seoul/clear-day'
    );
  });

  test('서울 종로, clear night -> hub/seoul/clear-night', () => {
    expect(selectSketchKey(jongno, makeCondition('clear', false))).toBe(
      'hub/seoul/clear-night'
    );
  });

  test('서울, cloudy day -> hub/seoul/cloudy-day', () => {
    expect(selectSketchKey(gangnam, makeCondition('cloudy', true))).toBe(
      'hub/seoul/cloudy-day'
    );
  });

  test('서울, cloudy night -> hub/seoul/cloudy-night (허브는 재작성 없음)', () => {
    expect(selectSketchKey(gangnam, makeCondition('cloudy', false))).toBe(
      'hub/seoul/cloudy-night'
    );
  });

  test('서울, rainy day -> hub/seoul/rainy-day', () => {
    expect(selectSketchKey(gangnam, makeCondition('rainy', true))).toBe(
      'hub/seoul/rainy-day'
    );
  });

  test('서울, rainy night -> hub/seoul/rainy-night', () => {
    expect(selectSketchKey(gangnam, makeCondition('rainy', false))).toBe(
      'hub/seoul/rainy-night'
    );
  });

  test('서울, snowy day -> hub/seoul/snowy-day', () => {
    expect(selectSketchKey(gangnam, makeCondition('snowy', true))).toBe(
      'hub/seoul/snowy-day'
    );
  });

  test('서울, snowy night -> hub/seoul/snowy-night (허브는 재작성 없음)', () => {
    expect(selectSketchKey(gangnam, makeCondition('snowy', false))).toBe(
      'hub/seoul/snowy-night'
    );
  });
});

describe('selectSketchKey - 부산 허브', () => {
  const busan = makeResolved('부산광역시', '해운대구');

  test('부산, rainy night -> hub/busan/rainy-night', () => {
    expect(selectSketchKey(busan, makeCondition('rainy', false))).toBe(
      'hub/busan/rainy-night'
    );
  });
});

describe('selectSketchKey - 허브가 아닌 resolved 위치는 generic/urban으로 폴백', () => {
  const daejeon = makeResolved('대전광역시', '유성구');

  test('대전, clear day -> generic/urban/clear-day', () => {
    expect(selectSketchKey(daejeon, makeCondition('clear', true))).toBe(
      'generic/urban/clear-day'
    );
  });

  test('대전, cloudy night -> generic/urban/clear-night (폴백 재작성)', () => {
    expect(selectSketchKey(daejeon, makeCondition('cloudy', false))).toBe(
      'generic/urban/clear-night'
    );
  });

  test('대전, snowy night -> generic/urban/rainy-night (폴백 재작성)', () => {
    expect(selectSketchKey(daejeon, makeCondition('snowy', false))).toBe(
      'generic/urban/rainy-night'
    );
  });

  test('대전, cloudy day -> generic/urban/cloudy-day (6-variant 통과)', () => {
    expect(selectSketchKey(daejeon, makeCondition('cloudy', true))).toBe(
      'generic/urban/cloudy-day'
    );
  });
});

describe('selectSketchKey - raw-gps 위치는 generic/urban으로 폴백', () => {
  const rawGps = makeRawGps();

  test('raw-gps, clear day -> generic/urban/clear-day', () => {
    expect(selectSketchKey(rawGps, makeCondition('clear', true))).toBe(
      'generic/urban/clear-day'
    );
  });

  test('raw-gps, snowy night -> generic/urban/rainy-night (폴백 재작성)', () => {
    expect(selectSketchKey(rawGps, makeCondition('snowy', false))).toBe(
      'generic/urban/rainy-night'
    );
  });
});
