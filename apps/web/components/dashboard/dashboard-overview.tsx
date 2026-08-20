'use client';

import { AttentionList } from '@/components/dashboard/attention-list';
import { Birthdays } from '@/components/dashboard/birthdays';
import { FinancialSnapshot } from '@/components/dashboard/financial-snapshot';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { StatCards } from '@/components/dashboard/stat-cards';
import { PageTitle } from '@/components/layout/page-title';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { useDashboardOverview } from '@/lib/dashboard/queries';

/**
 * Dashboard v1 (design-system.md §12) - the Admin Workspace's "control
 * center", replacing the PagePlaceholder tracked as UXD-3. A composition of
 * independent widgets over data already available from existing modules -
 * no charts, no reports, no settings. See useDashboardOverview for exactly
 * which endpoints power each widget and why.
 *
 * FinancialSnapshot (Outstanding/Overdue/Collected/Invoiced) is the one
 * addition from the approved "Owner Dashboard - Financial Snapshot" phase
 * on top of v1 - it's the only widget here backed by two new,
 * OWNER/ADMIN-only summary endpoints (GET /invoices/summary,
 * GET /payments/summary) rather than v1's original client-side-only
 * aggregation; every other widget is unchanged.
 */
export function DashboardOverview() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = useDashboardOverview(canManage);

  if (isLoading) {
    return <p>Loading…</p>;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-destructive">
          {isApiError(error) ? error.message : 'Something went wrong.'}
        </p>
        <Button variant="outline" size="sm" onClick={refetch} className="w-fit">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Overview</PageTitle>

      {canManage && <QuickActions />}

      {canManage && <FinancialSnapshot overview={data} />}

      <StatCards overview={data} />

      <AttentionList overview={data} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentActivity overview={data} />
        <Birthdays overview={data} />
      </div>
    </div>
  );
}
