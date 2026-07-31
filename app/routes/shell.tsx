import { Outlet } from 'react-router';
import { AppShell } from '../../frontend/shared/ui/app-shell';

export default function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
