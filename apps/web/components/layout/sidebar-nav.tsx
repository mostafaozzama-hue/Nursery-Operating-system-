import type { NavItem } from '@/lib/navigation';
import { NavLink } from './nav-link';

export function SidebarNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink key={item.href} href={item.href} label={item.label} />
      ))}
    </nav>
  );
}
