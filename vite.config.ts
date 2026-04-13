/// <reference types="vitest/config" />
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

import { REMOTE_MANIFEST_URL } from './frontend/entities/asset/api/fetch-remote-manifest';

// 개발 서버에서 /v1/assets/manifest 엔드포인트가 없으면 React Router가 "No route matches URL"
// 오류를 발생시켜 HMR 이벤트가 트리거되고 E2E 테스트에 타이밍 문제가 발생한다.
// 개발 서버에서는 빈 override 객체로 응답해 이를 방지한다.
function manifestStubPlugin(): Plugin {
  return {
    name: 'manifest-stub',
    configureServer(server) {
      server.middlewares.use(REMOTE_MANIFEST_URL, (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end('{}');
      });
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), manifestStubPlugin()],
  resolve: {
    tsconfigPaths: true,
  },
});
