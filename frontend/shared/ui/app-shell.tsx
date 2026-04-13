import { BottomNav } from './bottom-nav';
import { SidebarNav } from './sidebar-nav';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * 반응형 크롬 레이아웃.
 * - 모바일 (< md): BottomNav 표시, 하단 패딩으로 콘텐츠 가림 방지
 * - 데스크톱 (≥ md): SidebarNav 표시, 왼쪽 마진으로 콘텐츠 이동
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <>
      {/* 데스크톱 사이드바: md 미만에서 숨김 */}
      <div className="hidden md:block">
        <SidebarNav />
      </div>

      {/* 콘텐츠 영역: 모바일은 pb-24(하단 내비 높이), 데스크톱은 pl-64(사이드바 폭) */}
      <div className="pb-24 md:pb-0 md:pl-64">{children}</div>

      {/* 모바일 하단 내비: md 이상에서 숨김 */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </>
  );
}
