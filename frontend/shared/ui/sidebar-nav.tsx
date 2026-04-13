import { NavLink } from 'react-router';
import { cn } from '~/shared/lib/utils';
import { useTheme } from '~/shared/hooks/use-theme';

function navItemClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center gap-3 rounded-full px-4 py-3 text-sm transition-colors',
    isActive
      ? 'text-primary font-bold'
      : 'text-foreground/60 hover:text-foreground hover:bg-accent'
  );
}

/**
 * 데스크톱 사이드바 내비게이션.
 * md 미만 화면 크기에서는 AppShell이 숨김 처리한다.
 */
export function SidebarNav() {
  const { theme, toggle } = useTheme();

  return (
    <aside
      aria-label="사이드바 내비게이션"
      className="fixed top-0 left-0 z-50 flex h-full w-64 flex-col bg-surface-container-highest/60 px-4 py-8 backdrop-blur-xl dark:bg-surface-bright/40"
    >
      <div className="mb-12 px-4">
        <h1 className="font-display text-xl font-bold tracking-tighter text-primary">
          Weatherpane
        </h1>
        <p className="mt-1 text-xs text-foreground/40">기상창</p>
      </div>

      <nav className="flex-1 space-y-1">
        <NavLink to="/" end className={navItemClass}>
          <span
            aria-hidden
            className="material-symbols-outlined shrink-0 text-[20px]"
          >
            home
          </span>
          홈
        </NavLink>
        <NavLink to="/search" className={navItemClass}>
          <span
            aria-hidden
            className="material-symbols-outlined shrink-0 text-[20px]"
          >
            search
          </span>
          검색
        </NavLink>
        <NavLink to="/favorites" className={navItemClass}>
          <span
            aria-hidden
            className="material-symbols-outlined shrink-0 text-[20px]"
          >
            favorite
          </span>
          즐겨찾기
        </NavLink>
      </nav>

      <div className="border-t border-border/15 px-4 pt-6">
        <button
          aria-label={
            theme === 'light' ? '어두운 모드로 전환' : '밝은 모드로 전환'
          }
          data-theme-toggle={theme === 'light' ? 'dark' : 'light'}
          className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-sm text-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
          onClick={toggle}
        >
          <span
            aria-hidden
            className="material-symbols-outlined shrink-0 text-[20px]"
          >
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
          {theme === 'light' ? '어두운 모드' : '밝은 모드'}
        </button>
      </div>
    </aside>
  );
}
