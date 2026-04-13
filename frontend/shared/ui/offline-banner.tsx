import { useOnlineStatus } from '../hooks/use-online-status';

// 오프라인 상태일 때 화면 상단에 고정 표시되는 전역 배너입니다.
export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="bg-surface-container-high/90 fixed top-0 right-0 left-0 z-50 flex items-center justify-center gap-2 px-4 py-2 backdrop-blur-md"
    >
      <span className="bg-outline-variant h-2 w-2 animate-pulse rounded-full" />
      <span className="font-headline text-on-surface-variant text-[11px] font-bold tracking-widest uppercase">
        오프라인 상태
      </span>
    </div>
  );
}
