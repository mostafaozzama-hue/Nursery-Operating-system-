'use client';

import type { BillingRun } from '@nursery-os/contracts';
import Link from 'next/link';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { PaginationControls } from '@/components/common/pagination-controls';
import { Badge } from '@/components/common/badge';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import {
  BILLING_RUN_STATUS_BADGE_VARIANT,
  BILLING_RUN_STATUS_LABEL,
  formatBillingRunDate,
  formatBillingRunTimestamp,
} from '@/lib/billing-runs/mapper';
import { useBillingRunList } from '@/lib/billing-runs/queries';
import { ConfigurationSectionHeader } from '../configuration-section-header';

/**
 * OWNER/ADMIN only, for both read and write - GET /billing-runs 403s for STAFF, same standard as
 * PayrollList's canManage gating (fetch skipped entirely, not just the UI hidden). No filters -
 * BillingRunQueryDto offers only pagination/sort. No edit/delete of any kind - a BillingRun is
 * immutable once triggered; re-running the same period is itself idempotent (POST /billing-runs
 * again), not an edit action on an existing row.
 */
export function BillingRunList() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, total, totalPages, query, isLoading, error, setQuery, refetch } =
    useBillingRunList(canManage);

  if (!canManage) {
    return <p className="text-muted-foreground">You don&apos;t have access to billing runs.</p>;
  }

  const columns: DataTableColumn<BillingRun>[] = [
    {
      header: 'Period',
      cell: (billingRun) =>
        `${formatBillingRunDate(billingRun.periodStart)} – ${formatBillingRunDate(billingRun.periodEnd)}`,
      sortKey: 'periodStart',
    },
    {
      header: 'Status',
      cell: (billingRun) => (
        <Badge variant={BILLING_RUN_STATUS_BADGE_VARIANT[billingRun.status]}>
          {BILLING_RUN_STATUS_LABEL[billingRun.status]}
        </Badge>
      ),
    },
    {
      header: 'Run at',
      cell: (billingRun) => formatBillingRunTimestamp(billingRun.runAt),
      sortKey: 'runAt',
    },
    {
      header: 'Actions',
      cell: (billingRun) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/configuration/billing-runs/${billingRun.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <ConfigurationSectionHeader
        title={`Billing Runs${total > 0 ? ` · ${total}` : ''}`}
        action={{
          label: 'Trigger billing run',
          href: '/dashboard/configuration/billing-runs/new',
        }}
      />

      <p className="text-sm text-muted-foreground">
        A &quot;Partial failure&quot; run means at least one child could not be billed for this
        period - the run itself does not record which child, why, or how many.
      </p>

      {error ? (
        <div className="flex flex-col gap-2">
          <p className="text-destructive">
            {isApiError(error) ? error.message : 'Something went wrong.'}
          </p>
          <Button variant="outline" size="sm" onClick={refetch} className="w-fit">
            Retry
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(billingRun) => billingRun.id}
          isLoading={isLoading}
          sortBy={query.sortBy}
          sortOrder={query.sortOrder}
          onSortChange={(field) =>
            setQuery({
              sortBy: field as typeof query.sortBy,
              sortOrder: query.sortBy === field && query.sortOrder === 'asc' ? 'desc' : 'asc',
            })
          }
          emptyMessage="No billing runs yet - trigger your first one."
        />
      )}

      <PaginationControls
        meta={{ total, page: query.page, pageSize: query.pageSize, totalPages }}
        onPageChange={(page) => setQuery({ page })}
      />
    </div>
  );
}
