import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AuthGuard } from '@/lib/auth';
import { NAV_ITEMS } from '@/lib/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell navItems={NAV_ITEMS}>{children}</DashboardShell>
    </AuthGuard>
  );
}
