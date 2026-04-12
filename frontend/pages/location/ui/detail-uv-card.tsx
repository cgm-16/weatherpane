import { useState } from 'react';

function uvCategory(uvIndex: number): { label: string; advice: string } {
  if (uvIndex <= 2)
    return { label: '낮음', advice: '자외선 차단 없이도 안전합니다.' };
  if (uvIndex <= 5)
    return { label: '보통', advice: 'SPF 15+ 선크림을 바르세요.' };
  if (uvIndex <= 7)
    return { label: '높음', advice: 'SPF 30+ 선크림과 모자가 필요합니다.' };
  if (uvIndex <= 10)
    return {
      label: '매우 높음',
      advice: 'SPF 50+ 선크림을 바르고 오전 10시~오후 4시 외출을 자제하세요.',
    };
  return { label: '위험', advice: '직사광선을 피하고 실외 활동을 삼가세요.' };
}

interface DetailUvCardProps {
  uvIndex: number | undefined;
}

export function DetailUvCard({ uvIndex }: DetailUvCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-1 rounded-[--radius-md] bg-card p-4">
        <span className="material-symbols-outlined text-[20px] text-muted-foreground">
          wb_sunny
        </span>
        <p className="font-body text-xs text-muted-foreground">자외선 지수</p>
        <p className="font-display text-2xl font-bold text-foreground">
          {uvIndex != null ? uvIndex : '—'}
        </p>
        {uvIndex != null && (
          <>
            <p className="font-body text-xs text-muted-foreground">
              {uvCategory(uvIndex).label}
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-2 self-start font-body text-xs text-primary underline-offset-2 hover:underline"
              aria-label="자외선 지수 상세 보기"
            >
              상세 보기
            </button>
          </>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="자외선 지수 상세"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 bottom-0 left-0 rounded-t-[--radius-lg] bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-headline text-xl font-bold text-foreground">
                자외선 지수 상세
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-display text-5xl font-extrabold text-foreground">
                  {uvIndex}
                </span>
                <span className="font-headline text-xl font-bold text-muted-foreground">
                  {uvCategory(uvIndex!).label}
                </span>
              </div>
              <p className="font-body text-base text-muted-foreground">
                {uvCategory(uvIndex!).advice}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
