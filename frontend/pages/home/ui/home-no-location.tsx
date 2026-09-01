// 활성 위치가 없을 때 검색으로 안내하는 화면입니다.
import { Link } from 'react-router';

export function HomeNoLocation() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6"
      role="main"
    >
      <p className="font-headline text-sm font-bold tracking-[0.3em] text-primary uppercase">
        Weatherpane
      </p>
      <h1 className="font-headline text-3xl font-extrabold text-on-surface">
        위치를 선택하세요
      </h1>
      <p className="text-center font-body text-base leading-relaxed text-on-surface-variant">
        날씨 정보를 보려면 지역을 검색하세요.
      </p>
      <Link
        to="/search"
        className="font-headline rounded-sm bg-primary px-8 py-4 font-bold text-on-primary transition-all hover:bg-primary-container hover:text-on-primary-container active:scale-95"
      >
        지역 검색
      </Link>
    </main>
  );
}
