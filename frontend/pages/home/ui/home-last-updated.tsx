import { useState, useEffect, useReducer } from 'react';

interface HomeLastUpdatedProps {
  fetchedAt: string; // ISO 8601 형식
  timezone: string; // 예: 'Asia/Seoul'
}

function relativeMinutes(fetchedAt: string): number {
  return Math.floor((Date.now() - new Date(fetchedAt).getTime()) / 60_000);
}

function formatRelative(minutes: number): string {
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  return `${Math.floor(minutes / 60)}시간 전`;
}

function formatAbsolute(fetchedAt: string, timezone: string): string {
  return new Date(fetchedAt).toLocaleString('ko-KR', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HomeLastUpdated({ fetchedAt, timezone }: HomeLastUpdatedProps) {
  // 60초마다 dispatch해 컴포넌트를 강제로 재렌더링한다.
  // minutes는 렌더 시점에 fetchedAt에서 직접 계산하므로 fetchedAt 변경 즉시 반영된다.
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const minutes = relativeMinutes(fetchedAt);
  const [showAbsolute, setShowAbsolute] = useState(false);

  useEffect(() => {
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  return (
    <button
      type="button"
      onClick={() => setShowAbsolute((prev) => !prev)}
      aria-label={
        showAbsolute
          ? '절대 시각 표시 중 — 클릭하면 상대 시각으로 전환'
          : '마지막 업데이트 시각 — 클릭하면 절대 시각으로 전환'
      }
      className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-body text-xs text-muted-foreground"
    >
      <span className="material-symbols-outlined text-[14px]">schedule</span>
      {showAbsolute
        ? formatAbsolute(fetchedAt, timezone)
        : formatRelative(minutes)}
    </button>
  );
}
