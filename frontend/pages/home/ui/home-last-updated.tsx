import { useState, useEffect } from 'react';

interface HomeLastUpdatedProps {
  fetchedAt: string; // ISO 8601
  timezone: string; // e.g., 'Asia/Seoul'
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
  const [minutes, setMinutes] = useState(() => relativeMinutes(fetchedAt));
  const [showAbsolute, setShowAbsolute] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setMinutes(relativeMinutes(fetchedAt));
    }, 60_000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  return (
    <button
      type="button"
      onClick={() => setShowAbsolute((prev) => !prev)}
      className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-body text-xs text-muted-foreground"
    >
      <span className="material-symbols-outlined text-[14px]">schedule</span>
      {showAbsolute
        ? formatAbsolute(fetchedAt, timezone)
        : formatRelative(minutes)}
    </button>
  );
}
