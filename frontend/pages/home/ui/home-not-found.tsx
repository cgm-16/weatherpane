// 404 — 요청한 페이지를 찾지 못했을 때 표시되는 화면입니다.
import { Link } from 'react-router';

export function HomeNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-background" role="main">
      <div className="w-full max-w-md rounded-lg bg-surface-container-highest/50 p-8 backdrop-blur-[20px] flex flex-col items-center text-center">
        {/* 레이블 */}
        <p className="font-headline mb-6 text-xs font-bold uppercase tracking-[0.3em] text-on-surface-variant">
          Atmospheric Service 404
        </p>

        {/* 아이콘 */}
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <span
            className="material-symbols-outlined text-5xl text-primary"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}
          >
            cloud_off
          </span>
        </div>

        <h2 className="font-headline mb-4 text-3xl font-extrabold leading-tight text-on-surface">
          Lost in the Mist
        </h2>
        <p className="font-body mb-10 px-2 text-base leading-relaxed text-on-surface-variant">
          We couldn&apos;t find the page you&apos;re looking for. It might have drifted away in the fog.
        </p>

        <div className="w-full space-y-4">
          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-5 font-headline font-bold text-on-primary shadow-lg transition-all hover:bg-primary-container active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">home</span>
            Take me Home
          </Link>
          <Link
            to="/search"
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-secondary-container px-6 py-4 font-headline font-semibold text-on-secondary-fixed transition-all hover:bg-surface-container-highest active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">search</span>
            Check Forecast
          </Link>
        </div>
      </div>
    </main>
  );
}
