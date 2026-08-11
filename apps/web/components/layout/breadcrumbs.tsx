'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/navigation';
import { useBreadcrumbLabels } from './breadcrumb-context';

function labelFor(segment: string): string {
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumbs({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const resolvedLabels = useBreadcrumbLabels();

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const match = items.find((item) => item.href === href);
    // Static nav entries (e.g. "Guardians") win first, exactly as before -
    // a dynamic segment (an entity ID) never matches a NavItem, so this only
    // ever changes what a *previously raw* segment falls back to: the
    // resolved entity name when a detail/edit page has registered one
    // (ux-debt.md UXD-2), otherwise the same capitalized-segment guess this
    // component always used.
    return { href, label: match?.label ?? resolvedLabels[segment] ?? labelFor(segment) };
  });

  if (crumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden="true">/</span>}
              {isLast ? (
                <span className="font-medium text-foreground">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-foreground">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
