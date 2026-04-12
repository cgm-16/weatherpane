// 존재하지 않는 지역 페이지를 요청했을 때 표시되는 404 화면입니다.
import { Link } from 'react-router';

export function LocationNotFound() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6"
      role="main"
    >
      <div className="w-full max-w-md rounded-[--radius-lg] bg-card p-8">
        <p className="font-headline mb-6 text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase">
          404
        </p>
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <span
            className="material-symbols-outlined text-5xl text-primary"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}
          >
            cloud_off
          </span>
        </div>
        <h2 className="font-headline mb-4 text-3xl font-extrabold text-foreground">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="mb-10 font-body text-base text-muted-foreground">
          요청한 지역 페이지가 존재하지 않습니다.
        </p>
        <div className="w-full space-y-3">
          <Link
            to="/"
            className="font-headline flex w-full items-center justify-center gap-2 rounded-[--radius-sm] bg-primary px-6 py-4 font-bold text-primary-foreground"
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
            홈으로
          </Link>
          <Link
            to="/search"
            className="flex w-full items-center justify-center gap-2 rounded-[--radius-sm] bg-muted px-6 py-4 font-body text-foreground"
          >
            <span className="material-symbols-outlined text-[20px]">
              search
            </span>
            검색하기
          </Link>
        </div>
      </div>
    </main>
  );
}
