// 활성 위치가 없을 때 검색으로 안내하는 화면입니다.
import { Link } from 'react-router';

export function HomeNoLocation() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 bg-background" role="main">
      <p className="font-headline text-sm font-bold tracking-[0.3em] text-primary uppercase">
        Weatherpane
      </p>
      <h1 className="font-headline text-3xl font-extrabold text-on-surface">
        위치를 선택하세요
      </h1>
      <p className="font-body text-base text-on-surface-variant text-center leading-relaxed">
        날씨 정보를 보려면 지역을 검색하세요.
      </p>
      <Link
        to="/search"
        className="rounded-sm bg-primary px-8 py-4 font-headline font-bold text-on-primary hover:bg-primary-container transition-all active:scale-95"
      >
        지역 검색
      </Link>
    </main>
  );
}
