// 지원하지 않는 지역(대한민국 외)을 요청했을 때 표시되는 화면입니다.
import { Link } from 'react-router';

export function LocationUnsupported() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6"
      role="main"
    >
      <div className="w-full max-w-md rounded-[--radius-lg] bg-card p-8">
        <p className="font-headline mb-6 text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase">
          지원 불가 지역
        </p>
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <span
            className="material-symbols-outlined text-5xl text-primary"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}
          >
            location_off
          </span>
        </div>
        <h2 className="font-headline mb-4 text-3xl font-extrabold text-foreground">
          지원하지 않는 지역입니다
        </h2>
        <p className="mb-10 font-body text-base text-muted-foreground">
          현재 대한민국 외 지역은 제공하지 않습니다.
        </p>
        <div className="w-full space-y-3">
          <Link
            to="/search"
            className="font-headline flex w-full items-center justify-center gap-2 rounded-[--radius-sm] bg-primary px-6 py-4 font-bold text-primary-foreground"
          >
            <span className="material-symbols-outlined text-[20px]">
              search
            </span>
            검색으로 돌아가기
          </Link>
          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-[--radius-sm] bg-muted px-6 py-4 font-body text-foreground"
          >
            <span className="material-symbols-outlined text-[20px]">
              my_location
            </span>
            현재 위치로 돌아가기
          </Link>
          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-[--radius-sm] bg-muted px-6 py-4 font-body text-foreground"
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
            홈으로
          </Link>
        </div>
      </div>
    </main>
  );
}
