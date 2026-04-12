// 날씨 데이터 로드에 실패했을 때(네트워크 오류 등) 표시되는 화면입니다.
import { Link } from 'react-router';

interface LocationConnectionErrorProps {
  onRetry: () => void;
}

export function LocationConnectionError({
  onRetry,
}: LocationConnectionErrorProps) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6"
      role="main"
    >
      <div className="w-full max-w-md rounded-[--radius-lg] bg-card p-8">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          <span className="font-headline text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
            오프라인 상태
          </span>
        </div>
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <span
            className="material-symbols-outlined text-5xl text-primary"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}
          >
            wifi_off
          </span>
        </div>
        <h2 className="font-headline mb-4 text-3xl font-extrabold text-foreground">
          날씨 정보를 불러오지 못했습니다
        </h2>
        <p className="mb-10 font-body text-base text-muted-foreground">
          네트워크 연결을 확인한 후 다시 시도해 주세요.
        </p>
        <div className="w-full space-y-3">
          <button
            type="button"
            onClick={onRetry}
            className="font-headline flex w-full items-center justify-center gap-2 rounded-[--radius-sm] bg-primary px-6 py-4 font-bold text-primary-foreground"
          >
            <span className="material-symbols-outlined text-[20px]">
              refresh
            </span>
            다시 시도
          </button>
          <Link
            to="/search"
            className="flex w-full items-center justify-center gap-2 rounded-[--radius-sm] bg-muted px-6 py-4 font-body text-foreground"
          >
            <span className="material-symbols-outlined text-[20px]">
              search
            </span>
            검색하기
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
        </div>
      </div>
    </main>
  );
}
