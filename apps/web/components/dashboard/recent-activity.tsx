import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/common/card';
import { EmptyState } from '@/components/common/empty-state';
import type { DashboardOverview } from '@/lib/dashboard/queries';

const TYPE_LABEL: Record<'child' | 'guardian' | 'staff', string> = {
  child: 'New child',
  guardian: 'New guardian',
  staff: 'New staff',
};

/** design-system.md §5.16 activity feed - one-line description + relative-enough timestamp, from createdAt already captured on every table. No avatar/icon treatment (§12's lower section describes it without one; see stat-cards.tsx's identical scope note). */
export function RecentActivity({ overview }: { overview: DashboardOverview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      {overview.recentActivity.length === 0 ? (
        <EmptyState message="No recent activity yet." />
      ) : (
        <ul className="flex flex-col gap-2">
          {overview.recentActivity.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <Link
                href={item.href}
                className="flex items-center justify-between gap-4 rounded-md p-2 text-sm hover:bg-muted"
              >
                <span>
                  <span className="text-muted-foreground">{TYPE_LABEL[item.type]}: </span>
                  {item.label}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
