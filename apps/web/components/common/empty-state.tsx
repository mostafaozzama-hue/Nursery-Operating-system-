import type { LucideIcon } from 'lucide-react';
import { InboxIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/** Per design-system.md §5.8 - icon + one-line message + optional direct primary action, replacing bare "No X found." text. */
export function EmptyState({
  icon: Icon = InboxIcon,
  message,
  action,
}: {
  icon?: LucideIcon;
  message: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Icon className="size-8 text-muted-foreground/60" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && (
        <Button asChild size="sm">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
