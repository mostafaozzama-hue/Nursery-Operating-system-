'use client';

import Link from 'next/link';
import { Badge } from '@/components/common/badge';
import { Card, CardHeader, CardTitle } from '@/components/common/card';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import {
  BILLING_RUN_STATUS_BADGE_VARIANT,
  BILLING_RUN_STATUS_LABEL,
  formatBillingRunDate,
  formatBillingRunTimestamp,
} from '@/lib/billing-runs/mapper';
import { useBillingRun } from '@/lib/billing-runs/queries';
import { fullName as childFullName } from '@/lib/children/mapper';
import { useChildDirectory } from '@/lib/children/queries';
import { INVOICE_STATUS_BADGE_VARIANT, INVOICE_STATUS_LABEL } from '@/lib/invoices/mapper';
import { useInvoicesForBillingRun } from '@/lib/invoices/queries';
import { formatMoney } from '@/lib/money';
import { PageTitle } from '@/components/layout/page-title';
import type { Invoice } from '@nursery-os/contracts';

/**
 * Milestone 3 adds the generated-invoices drill-down (billingRunId now exposed over HTTP - the one
 * backend DTO addition approved as part of this milestone). No new Invoice UI here - each row links
 * to the already-existing Invoice Detail page rather than duplicating any of its line-item/payment
 * logic. A "Partial failure" status still cannot be broken down further, deliberately, per ADR-0017's
 * rejection of a BillingRunEvent audit entity - this table shows what the run *produced*, never why
 * a specific child is missing from it.
 */
export function BillingRunDetail({ billingRunId }: { billingRunId: string }) {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = useBillingRun(canManage ? billingRunId : null);
  const invoices = useInvoicesForBillingRun(canManage ? billingRunId : null);
  const { byId: childrenById, isLoading: childrenLoading } = useChildDirectory();

  if (!canManage) {
    return <p className="text-muted-foreground">You don&apos;t have access to billing runs.</p>;
  }

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

  const columns: DataTableColumn<Invoice>[] = [
    {
      header: 'Child',
      cell: (invoice) => {
        const child = childrenById.get(invoice.childId);
        return (
          <Link href={`/dashboard/invoices/${invoice.id}`} className="hover:underline">
            {child ? childFullName(child) : '—'}
          </Link>
        );
      },
    },
    {
      header: 'Total',
      cell: (invoice) => formatMoney(invoice.totalAmount),
    },
    {
      header: 'Status',
      cell: (invoice) => (
        <Badge variant={INVOICE_STATUS_BADGE_VARIANT[invoice.status]}>
          {INVOICE_STATUS_LABEL[invoice.status]}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>
        Billing run · {formatBillingRunDate(data.periodStart)} –{' '}
        {formatBillingRunDate(data.periodEnd)}
      </PageTitle>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <Badge variant={BILLING_RUN_STATUS_BADGE_VARIANT[data.status]}>
            {BILLING_RUN_STATUS_LABEL[data.status]}
          </Badge>
        </CardHeader>
        <dl className="grid max-w-md grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Period start</dt>
          <dd>{formatBillingRunDate(data.periodStart)}</dd>
          <dt className="text-muted-foreground">Period end</dt>
          <dd>{formatBillingRunDate(data.periodEnd)}</dd>
          <dt className="text-muted-foreground">Run at</dt>
          <dd>{formatBillingRunTimestamp(data.runAt)}</dd>
        </dl>
        {data.status === 'PARTIAL_FAILURE' && (
          <p className="mt-4 text-sm text-muted-foreground">
            At least one child could not be billed for this period. This run does not record which
            child, why, or how many.
          </p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated invoices</CardTitle>
        </CardHeader>

        {invoices.error ? (
          <div className="flex flex-col gap-2">
            <p className="text-destructive">
              {isApiError(invoices.error) ? invoices.error.message : 'Something went wrong.'}
            </p>
            <Button variant="outline" size="sm" onClick={invoices.refetch} className="w-fit">
              Retry
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={invoices.data}
            rowKey={(invoice) => invoice.id}
            isLoading={invoices.isLoading || childrenLoading}
            emptyMessage="This run did not produce any invoices."
          />
        )}
      </Card>
    </div>
  );
}
