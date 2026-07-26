'use client';

import type { NavItem } from '@/lib/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from './sidebar';
import { TopNav } from './top-nav';

export function DashboardShell({
  navItems,
  children,
}: {
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const visibleItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <div className="flex h-screen">
      <Sidebar items={visibleItems} />
      <div className="flex flex-1 flex-col">
        <TopNav items={visibleItems} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
