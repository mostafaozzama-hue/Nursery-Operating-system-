import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/common/card';
import { EmptyState } from '@/components/common/empty-state';
import { cn } from '@/lib/utils';
import { staffFullName } from '@/lib/staff/mapper';
import type { DashboardOverview } from '@/lib/dashboard/queries';

interface AttentionItem {
  key: string;
  severity: 'destructive' | 'warning' | 'info';
  message: string;
  href: string;
}

const SEVERITY_DOT_CLASS: Record<AttentionItem['severity'], string> = {
  destructive: 'bg-destructive',
  warning: 'bg-warning',
  info: 'bg-info',
};

/**
 * design-system.md §12/§5.16 alert list - severity dot (here, a Badge,
 * since that's the primitive this codebase already has for exactly this
 * purpose) + direct link to resolve. Ordered most-severe first.
 *
 * The two Payroll-derived items (`staffWithoutPayroll`/
 * `staffWithoutPortalAccess`) are only ever populated for a canManage
 * caller - see useDashboardOverview's own doc comment for why.
 */
export function AttentionList({ overview }: { overview: DashboardOverview }) {
  const items: AttentionItem[] = [];

  if (overview.overdueInvoicesCount > 0) {
    items.push({
      key: 'overdue-invoices',
      severity: 'destructive',
      message: `${overview.overdueInvoicesCount} overdue ${overview.overdueInvoicesCount === 1 ? 'invoice' : 'invoices'}`,
      href: '/dashboard/invoices?status=OVERDUE',
    });
  }

  for (const { classroom, occupied } of overview.classroomsOverCapacity) {
    items.push({
      key: `over-capacity-${classroom.id}`,
      severity: 'destructive',
      message: `${classroom.name} is over capacity (${occupied}/${classroom.capacity})`,
      href: `/dashboard/classrooms/${classroom.id}`,
    });
  }

  if (overview.noPlansConfigured) {
    items.push({
      key: 'no-plans',
      severity: 'warning',
      message: 'No active Plans configured - recurring billing cannot run yet',
      href: '/dashboard/configuration/plans',
    });
  }

  for (const staff of overview.staffWithoutPayroll) {
    items.push({
      key: `no-payroll-${staff.id}`,
      severity: 'warning',
      message: `${staffFullName(staff)} has no payroll record`,
      href: `/dashboard/staff/${staff.id}`,
    });
  }

  for (const staff of overview.staffWithoutPortalAccess) {
    items.push({
      key: `no-portal-${staff.id}`,
      severity: 'info',
      message: `${staffFullName(staff)} has no portal access`,
      href: `/dashboard/staff/${staff.id}`,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
      </CardHeader>
      {items.length === 0 ? (
        <EmptyState message="Nothing needs attention right now." />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted"
              >
                <span
                  aria-hidden="true"
                  className={cn('size-2 shrink-0 rounded-full', SEVERITY_DOT_CLASS[item.severity])}
                />
                <span>{item.message}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
