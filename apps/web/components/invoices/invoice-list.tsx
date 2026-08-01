'use client';

import type { Invoice, InvoiceStatus } from '@nursery-os/contracts';
import Link from 'next/link';
import { Badge } from '@/components/common/badge';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { PaginationControls } from '@/components/common/pagination-controls';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { fullName as childFullName } from '@/lib/children/mapper';
import { useChildDirectory } from '@/lib/children/queries';
import { fullName as guardianFullName } from '@/lib/guardians/mapper';
import { useGuardianDirectory } from '@/lib/guardians/queries';
import {
  INVOICE_STATUS_BADGE_VARIANT,
  INVOICE_STATUS_LABEL,
  formatInvoiceDate,
} from '@/lib/invoices/mapper';
import { formatMoney } from '@/lib/money';
import { useInvoiceList } from '@/lib/invoices/queries';

const STATUS_OPTIONS: InvoiceStatus[] = [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'VOID',
];

export function InvoiceList() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, total, totalPages, query, isLoading, error, setQuery, refetch } = useInvoiceList();
  const { byId: childrenById, isLoading: childrenLoading } = useChildDirectory();
  const { byId: guardiansById, isLoading: guardiansLoading } = useGuardianDirectory();

  const isLoadingAny = isLoading || childrenLoading || guardiansLoading;

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
      header: 'Billed to',
      cell: (invoice) => {
        const guardian = guardiansById.get(invoice.billedToGuardianId);
        return guardian ? guardianFullName(guardian) : '—';
      },
    },
    {
      header: 'Total',
      cell: (invoice) => formatMoney(invoice.totalAmount),
      sortKey: 'totalAmount',
    },
    {
      header: 'Due date',
      cell: (invoice) => (invoice.dueDate ? formatInvoiceDate(invoice.dueDate) : '—'),
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
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Invoices · {total}</h1>
        {canManage && (
          <Button asChild>
            <Link href="/dashboard/invoices/new">Create invoice</Link>
          </Button>
        )}
      </div>

      <Select
        value={query.status || 'all'}
        onValueChange={(value) =>
          setQuery({ status: value === 'all' ? '' : (value as InvoiceStatus) })
        }
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {INVOICE_STATUS_LABEL[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error ? (
        <div className="flex flex-col gap-2">
          <p className="text-destructive">
            {isApiError(error) ? error.message : 'Something went wrong.'}
          </p>
          <Button variant="outline" size="sm" onClick={refetch} className="w-fit">
            Retry
          </Button>
        </div>
      ) : !isLoadingAny && data.length === 0 ? (
        <EmptyState
          message={query.status ? 'No invoices match this filter.' : 'No invoices yet.'}
          action={
            canManage ? { label: 'Create invoice', href: '/dashboard/invoices/new' } : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(invoice) => invoice.id}
          isLoading={isLoadingAny}
          sortBy={query.sortBy}
          sortOrder={query.sortOrder}
          onSortChange={(field) =>
            setQuery({
              sortBy: field as typeof query.sortBy,
              sortOrder: query.sortBy === field && query.sortOrder === 'asc' ? 'desc' : 'asc',
            })
          }
        />
      )}

      <PaginationControls
        meta={{ total, page: query.page, pageSize: query.pageSize, totalPages }}
        onPageChange={(page) => setQuery({ page })}
      />
    </div>
  );
}
