'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/navigation';

export function NavLink({ href, label }: NavItem) {
  const pathname = usePathname();
  const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {label}
    </Link>
  );
}
