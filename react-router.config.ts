import { vercelPreset } from '@vercel/react-router/vite';
import type { Config } from '@react-router/dev/config';

export default {
  ssr: true,
  // 지연 라우트 탐색(/__manifest fetch)을 끄고 전체 라우트 매니페스트를 초기 HTML에
  // 인라인한다. 라우트가 소수라 페이로드 비용은 무시할 수준이며, 오프라인 셸이
  // 캐시된 매니페스트에 의존하지 않게 되고 /__manifest 경쟁 상태도 사라진다.
  routeDiscovery: { mode: 'initial' },
  presets: [vercelPreset()],
} satisfies Config;
