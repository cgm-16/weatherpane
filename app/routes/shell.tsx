import { Outlet } from 'react-router';
import { useTheme } from '../../frontend/features/settings';
import { AppShell } from '../../frontend/shared/ui/app-shell';

export default function ShellLayout() {
  const { theme, toggle } = useTheme();

  return (
    <AppShell theme={theme} onThemeToggle={toggle}>
      <Outlet />
    </AppShell>
  );
}
