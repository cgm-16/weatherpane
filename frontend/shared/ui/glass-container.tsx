import { cn } from '~/shared/lib/utils';

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 유리형태(glassmorphism) 컨테이너.
 * 밝은 모드: surface-container-highest 60% 불투명도 + backdrop-blur
 * 어두운 모드: surface-bright 40% 불투명도 + backdrop-blur
 * 유리형태가 필요한 요소에 사용한다 (예: floating 내비게이션 바, 팝오버, 중앙 정렬 오류 카드).
 */
export function GlassContainer({ children, className }: GlassContainerProps) {
  return (
    <div
      className={cn(
        'bg-surface-container-highest/60 backdrop-blur-[20px] dark:bg-surface-bright/40',
        className
      )}
    >
      {children}
    </div>
  );
}
