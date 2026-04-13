import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import type { Route } from './+types/root';
import { AppProviders } from '../frontend/app/providers/app-providers';
import { storageKeys } from '../frontend/shared/lib/storage/storage-keys';
import '../frontend/app/styles/global.css';

export const links: Route.LinksFunction = () => [];

// 페이지 로드 전에 즉시 실행되는 테마 초기화 스크립트 (FOUC 방지 + 하이드레이션 전 인터랙션 처리).
// React가 하이드레이션되기 전에도 테마 토글이 동작하도록 클릭 인터셉터를 등록한다.
const THEME_INIT_SCRIPT = `(function(){
  var k = '${storageKeys.theme}';
  function save(d) {
    var v = JSON.stringify({ version: 1, data: d });
    try { sessionStorage.setItem(k, v); } catch(e) {}
    try { localStorage.setItem(k, v); } catch(e) {}
  }
  function applyTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    save(dark ? 'dark' : 'light');
  }
  try {
    var raw = sessionStorage.getItem(k) || localStorage.getItem(k);
    if (raw) {
      var d = JSON.parse(raw).data;
      if (d === 'dark') { document.documentElement.classList.add('dark'); }
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }
  // React 하이드레이션 전 클릭을 처리해 상태 불일치와 경쟁 조건을 방지한다 (data-theme-toggle 속성 기반)
  document.addEventListener('click', function(e) {
    var btn = e.target && e.target.closest && e.target.closest('button[data-theme-toggle]');
    if (!btn) return;
    var val = btn.getAttribute('data-theme-toggle');
    if (val === 'dark') { applyTheme(true); }
    else if (val === 'light') { applyTheme(false); }
  }, true);
})();`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* 테마를 즉시 적용해 React 하이드레이션 전 깜빡임을 방지한다 */}
        {/* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- 인라인 스크립트는 FOUC 방지 목적으로 의도적으로 사용한다 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AppProviders>
      <Outlet />
    </AppProviders>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = '오류가 발생했습니다.';
  let details = '앱 셸을 불러오는 중에 예기치 않은 문제가 발생했습니다.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message =
      error.status === 404
        ? '페이지를 찾을 수 없습니다.'
        : '요청을 처리할 수 없습니다.';
    details =
      error.status === 404
        ? '요청한 경로를 찾지 못했습니다.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm font-medium tracking-[0.3em] text-sky-300 uppercase">
        Weatherpane
      </p>
      <h1 className="text-3xl font-semibold text-white">{message}</h1>
      <p className="text-base text-slate-300">{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
