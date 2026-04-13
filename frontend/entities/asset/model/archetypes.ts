// 허브 패밀리 매핑과 기본 generic archetype 정의.
import type { SketchFamilyId } from './keys';

// admin1(시/도) 이름을 허브 familyId로 매핑한다. 누락된 경우 generic 폴백으로 처리한다.
export const HUB_BY_ADMIN1: Readonly<Record<string, SketchFamilyId>> = {
  서울특별시: 'seoul',
  부산광역시: 'busan',
};

export const DEFAULT_ARCHETYPE: SketchFamilyId = 'urban';
