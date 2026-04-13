import { Home, Moon, Search, Sun } from 'lucide-react';
import { Heart } from 'lucide-react';
import { NavLink } from 'react-router';
import { cn } from '~/shared/lib/utils';
import { useTheme } from '~/shared/hooks/use-theme';

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
  const { theme, toggle } = useTheme();

  return (
    <nav
      aria-label="기본 내비게이션"
      className="fixed right-0 bottom-0 left-0 z-50 flex items-center justify-around rounded-t-[32px] bg-surface-container-highest/60 px-6 pt-3 pb-6 shadow-[0px_-10px_24px_rgba(27,28,28,0.04)] backdrop-blur-[20px] dark:bg-surface-bright/40"
    >
      <NavLink to="/" end className={navItemClass}>
        <Home aria-hidden className="size-5" />
        <span className="text-[10px] font-medium">홈</span>
      </NavLink>
      <NavLink to="/search" className={navItemClass}>
        <Search aria-hidden className="size-5" />
        <span className="text-[10px] font-medium">검색</span>
      </NavLink>
      <NavLink to="/favorites" className={navItemClass}>
        <Heart aria-hidden className="size-5" />
        <span className="text-[10px] font-medium">즐겨찾기</span>
      </NavLink>
      <button
        aria-label={
          theme === 'light' ? '어두운 모드로 전환' : '밝은 모드로 전환'
        }
        className="flex flex-col items-center gap-0.5 rounded-full px-4 py-2 text-foreground/50 transition-colors hover:text-foreground"
        onClick={toggle}
      >
        {theme === 'light' ? (
          <Moon aria-hidden className="size-5" />
        ) : (
          <Sun aria-hidden className="size-5" />
        )}
        <span className="text-[10px] font-medium">테마</span>
      </button>
    </nav>
  );
}
