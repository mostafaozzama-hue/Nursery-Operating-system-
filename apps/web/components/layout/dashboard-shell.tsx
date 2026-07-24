import type { NavItem } from '@/lib/navigation';
import { Sidebar } from './sidebar';
import { TopNav } from './top-nav';

export function DashboardShell({
  navItems,
  children,
}: {
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar items={navItems} />
      <div className="flex flex-1 flex-col">
        <TopNav items={navItems} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
