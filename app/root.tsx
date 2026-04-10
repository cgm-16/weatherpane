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
import '../frontend/app/styles/global.css';

export const links: Route.LinksFunction = () => [];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
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
