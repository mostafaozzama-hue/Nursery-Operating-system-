import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/common/card';
import { EmptyState } from '@/components/common/empty-state';
import { formatDateOfBirth, fullName } from '@/lib/children/mapper';
import type { DashboardOverview } from '@/lib/dashboard/queries';

/** design-system.md §12's lower section, second column - from Child.dateOfBirth, already fetched for Recent activity's own children list (see useDashboardOverview). */
export function Birthdays({ overview }: { overview: DashboardOverview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Birthdays this month</CardTitle>
      </CardHeader>
      {overview.birthdaysThisMonth.length === 0 ? (
        <EmptyState message="No birthdays this month." />
      ) : (
        <ul className="flex flex-col gap-2">
          {overview.birthdaysThisMonth.map((child) => (
            <li key={child.id}>
              <Link
                href={`/dashboard/children/${child.id}`}
                className="flex items-center justify-between gap-4 rounded-md p-2 text-sm hover:bg-muted"
              >
                <span>{fullName(child)}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDateOfBirth(child.dateOfBirth)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
