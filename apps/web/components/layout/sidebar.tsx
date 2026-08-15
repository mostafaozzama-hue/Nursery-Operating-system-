import type { NavItem } from '@/lib/navigation';
import { SidebarNav } from './sidebar-nav';

export function Sidebar({ items }: { items: NavItem[] }) {
  return (
    <div className="hidden w-64 shrink-0 flex-col border-r bg-background p-4 md:flex">
      <SidebarNav items={items} />
    </div>
  );
}
