import type { NavItem } from '@/lib/navigation';
import { Breadcrumbs } from './breadcrumbs';
import { MobileSidebar } from './mobile-sidebar';
import { UserMenu } from './user-menu';

export function TopNav({ items }: { items: NavItem[] }) {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
      <div className="flex items-center gap-4">
        <MobileSidebar items={items} />
        <Breadcrumbs items={items} />
      </div>
      <UserMenu />
    </header>
  );
}
