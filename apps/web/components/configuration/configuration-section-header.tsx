import Link from 'next/link';
import { Button } from '@/components/ui/button';

/** Shared title + optional trailing action, used by every screen under the Configuration layout instead of each hand-rolling its own header row. Mirrors design-system.md §10.1's target EntityHeader spec in miniature, scoped to this module only. */
export function ConfigurationSectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {action && (
        <Button asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
