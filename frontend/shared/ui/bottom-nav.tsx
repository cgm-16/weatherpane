import { NavLink } from 'react-router';
import { cn } from '~/shared/lib/utils';

function navItemClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-colors',
    isActive ? 'text-primary' : 'text-foreground/50 hover:text-foreground'
  );
}

/**
 * 모바일 하단 내비게이션 바.
 * md 이상 화면 크기에서는 AppShell이 숨김 처리한다.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="기본 내비게이션"
      className="fixed right-0 bottom-0 left-0 z-50 flex items-center justify-around rounded-t-[32px] bg-surface-container-highest/60 px-6 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0px_-10px_24px_rgba(27,28,28,0.04)] backdrop-blur-[20px] dark:bg-surface-bright/40"
    >
      <NavLink to="/" end className={navItemClass}>
        <span aria-hidden className="material-symbols-outlined text-[20px]">
          home
        </span>
        <span className="text-[10px] font-medium">홈</span>
      </NavLink>
      <NavLink to="/search" className={navItemClass}>
        <span aria-hidden className="material-symbols-outlined text-[20px]">
          search
        </span>
        <span className="text-[10px] font-medium">검색</span>
      </NavLink>
      <NavLink to="/favorites" className={navItemClass}>
        <span aria-hidden className="material-symbols-outlined text-[20px]">
          favorite
        </span>
        <span className="text-[10px] font-medium">즐겨찾기</span>
      </NavLink>
      <NavLink to="/settings" className={navItemClass}>
        <span aria-hidden className="material-symbols-outlined text-[20px]">
          settings
        </span>
        <span className="text-[10px] font-medium">설정</span>
      </NavLink>
    </nav>
  );
}
