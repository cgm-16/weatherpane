/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import {
  BASELINE_MANIFEST,
  SketchBackground,
  SketchManifestProvider,
  selectSketchKey,
  useSketchManifest,
  type SketchManifest,
} from '../../frontend/entities/asset';
import type { ResolvedLocation } from '../../frontend/entities/location/model/types';
import type { WeatherCondition } from '../../frontend/entities/weather/model/core-weather';

// 서울 허브를 확정적으로 타기 위한 resolved 위치 픽스처.
const seoul: ResolvedLocation = {
  kind: 'resolved',
  locationId: 'loc_seoul',
  catalogLocationId: 'KR-Seoul',
  name: '서울',
  admin1: '서울특별시',
  latitude: 37.56,
  longitude: 126.97,
  timezone: 'Asia/Seoul',
};

// visualBucket='clear', isDay=true → hub/seoul/clear-day 키로 해석됨.
const clearDay: WeatherCondition = {
  code: 'CLEAR',
  text: '맑음',
  isDay: true,
  visualBucket: 'clear',
  textMapping: {
    conditionCode: 'CLEAR',
    isDay: true,
    precipitationKind: 'none',
    cloudCoverPct: 5,
    intensity: 'none',
  },
};

const expectedKey = selectSketchKey(seoul, clearDay);
const baselineSrc = BASELINE_MANIFEST[expectedKey];

function renderWith(manifest: SketchManifest) {
  return render(
    <SketchManifestProvider manifest={manifest}>
      <SketchBackground location={seoul} condition={clearDay} />
    </SketchManifestProvider>
  );
}

describe('SketchBackground', () => {
  test('매니페스트의 키에 매핑된 URL로 img를 렌더링한다', () => {
    const { container } = renderWith(BASELINE_MANIFEST);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', baselineSrc);
  });

  test('선택기의 시맨틱 키를 data-sketch-key 속성으로 노출한다', () => {
    const { container } = renderWith(BASELINE_MANIFEST);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('data-sketch-key', expectedKey);
  });

  test('override URL로 시작하고, error 이벤트 시 baseline으로 스왑한다', () => {
    const overrideSrc = 'https://cdn.example/override.webp';
    const override: SketchManifest = Object.freeze({
      ...BASELINE_MANIFEST,
      [expectedKey]: overrideSrc,
    }) as SketchManifest;

    const { container } = renderWith(override);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', overrideSrc);

    fireEvent.error(img!);

    const afterFirst = container.querySelector('img');
    expect(afterFirst).toHaveAttribute('src', baselineSrc);
    expect(afterFirst).not.toHaveClass('hidden');
  });

  test('baseline도 실패하면 hidden 클래스로 렌더링하고 throw하지 않는다', () => {
    const overrideSrc = 'https://cdn.example/override.webp';
    const override: SketchManifest = Object.freeze({
      ...BASELINE_MANIFEST,
      [expectedKey]: overrideSrc,
    }) as SketchManifest;

    const { container } = renderWith(override);
    const first = container.querySelector('img');
    expect(first).not.toBeNull();
    fireEvent.error(first!);

    const second = container.querySelector('img');
    expect(second).not.toBeNull();
    fireEvent.error(second!);

    const final = container.querySelector('img');
    expect(final).not.toBeNull();
    expect(final).toHaveClass('hidden');
  });

  test('key가 바뀌면 에러 상태가 초기화된다', () => {
    const overrideSrc = 'https://cdn.example/override.webp';
    const override: SketchManifest = Object.freeze({
      ...BASELINE_MANIFEST,
      [expectedKey]: overrideSrc,
    }) as SketchManifest;

    const { container, rerender } = render(
      <SketchManifestProvider manifest={override}>
        <SketchBackground location={seoul} condition={clearDay} />
      </SketchManifestProvider>
    );

    // override 실패 → baseline 실패 → hidden
    const first = container.querySelector('img');
    expect(first).not.toBeNull();
    fireEvent.error(first!);
    const second = container.querySelector('img');
    fireEvent.error(second!);
    expect(container.querySelector('img')).toHaveClass('hidden');

    // 부산으로 위치를 변경 → 새 키에 대해 에러 상태가 초기화되어야 한다
    const busan: ResolvedLocation = {
      kind: 'resolved',
      locationId: 'loc_busan',
      catalogLocationId: 'KR-Busan',
      name: '부산',
      admin1: '부산광역시',
      latitude: 35.18,
      longitude: 129.08,
      timezone: 'Asia/Seoul',
    };
    const busanKey = selectSketchKey(busan, clearDay);
    expect(busanKey).not.toBe(expectedKey);

    rerender(
      <SketchManifestProvider manifest={override}>
        <SketchBackground location={busan} condition={clearDay} />
      </SketchManifestProvider>
    );

    const afterRerender = container.querySelector('img');
    expect(afterRerender).not.toBeNull();
    expect(afterRerender).not.toHaveClass('hidden');
    expect(afterRerender).toHaveAttribute('data-sketch-key', busanKey);
    expect(afterRerender).toHaveAttribute('src', BASELINE_MANIFEST[busanKey]);
  });

  test('프로바이더 바깥에서 useSketchManifest 사용 시 문서화된 에러를 던진다', () => {
    // 콘솔 에러 억제는 생략: vitest가 throw를 잡아낸다.
    expect(() => render(<ProbeManifest />)).toThrow(/useSketchManifest/);
  });
});

// 모듈 레벨 프로브 컴포넌트: eslint component-hook-factories 규칙 준수.
function ProbeManifest() {
  useSketchManifest();
  return null;
}
