'use client';

import type { Fee } from '@nursery-os/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { PaginationControls } from '@/components/common/pagination-controls';
import { Badge } from '@/components/common/badge';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { FEE_TYPE_LABEL } from '@/lib/fees/mapper';
import { useActivateFee, useDeactivateFee } from '@/lib/fees/mutations';
import { useFeeList } from '@/lib/fees/queries';
import { formatMoney } from '@/lib/money';
import { ConfigurationSectionHeader } from '../configuration-section-header';

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'RECURRING', label: 'Recurring' },
  { value: 'ONE_TIME', label: 'One-time' },
] as const;

const ACTIVE_FILTER_OPTIONS = [
  { value: 'all', label: 'All fees' },
  { value: 'true', label: 'Active only' },
  { value: 'false', label: 'Inactive only' },
] as const;

/** No Fee Detail page - Fee has no sub-resource comparable to Plan Prices, so Activate/Deactivate stay row actions here rather than earning their own route. */
export function FeeList() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, total, totalPages, query, isLoading, error, setQuery, refetch } = useFeeList();
  const { mutate: activateFee, isPending: isActivating } = useActivateFee();
  const { mutate: deactivateFee, isPending: isDeactivating } = useDeactivateFee();
  const [pendingDeactivate, setPendingDeactivate] = useState<Fee | null>(null);

  const handleActivate = async (fee: Fee) => {
    try {
      await activateFee(fee.id);
      refetch();
    } catch {
      // mutation hook already captured the error; button re-enables for the user to retry
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!pendingDeactivate) return;
    try {
      await deactivateFee(pendingDeactivate.id);
      setPendingDeactivate(null);
      refetch();
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  const columns: DataTableColumn<Fee>[] = [
    { header: 'Name', cell: (fee) => fee.name, sortKey: 'name' },
    { header: 'Type', cell: (fee) => FEE_TYPE_LABEL[fee.type], sortKey: 'type' },
    { header: 'Amount', cell: (fee) => formatMoney(fee.amount), sortKey: 'amount' },
    {
      header: 'Status',
      cell: (fee) => (
        <Badge variant={fee.isActive ? 'success' : 'muted'}>
          {fee.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    ...(canManage
      ? [
          {
            header: 'Actions',
            cell: (fee: Fee) => (
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/configuration/fees/${fee.id}/edit`}>Edit</Link>
                </Button>
                {fee.isActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDeactivating}
                    onClick={() => setPendingDeactivate(fee)}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isActivating}
                    onClick={() => handleActivate(fee)}
                  >
                    Activate
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  const isFiltered = Boolean(query.search) || query.type !== '' || query.isActive !== '';

  return (
    <div className="flex flex-col gap-4">
      <ConfigurationSectionHeader
        title={`Fees${total > 0 ? ` · ${total}` : ''}`}
        action={
          canManage ? { label: 'Add Fee', href: '/dashboard/configuration/fees/new' } : undefined
        }
      />

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by name…"
          defaultValue={query.search}
          onChange={(event) => setQuery({ search: event.target.value })}
          className="max-w-xs"
        />
        <Select
          value={query.type === '' ? 'all' : query.type}
          onValueChange={(value) =>
            setQuery({ type: value === 'all' ? '' : (value as typeof query.type) })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={query.isActive === '' ? 'all' : String(query.isActive)}
          onValueChange={(value) => setQuery({ isActive: value === 'all' ? '' : value === 'true' })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
          rowKey={(fee) => fee.id}
          isLoading={isLoading}
          sortBy={query.sortBy}
          sortOrder={query.sortOrder}
          onSortChange={(field) =>
            setQuery({
              sortBy: field as typeof query.sortBy,
              sortOrder: query.sortBy === field && query.sortOrder === 'asc' ? 'desc' : 'asc',
            })
          }
          emptyMessage={
            isFiltered ? 'No fees match your search.' : 'No fees yet — add your first one.'
          }
        />
      )}

      <PaginationControls
        meta={{ total, page: query.page, pageSize: query.pageSize, totalPages }}
        onPageChange={(page) => setQuery({ page })}
      />

      <ConfirmDialog
        open={pendingDeactivate !== null}
        onOpenChange={(open) => !open && setPendingDeactivate(null)}
        title="Deactivate fee"
        description={`Are you sure you want to deactivate ${pendingDeactivate?.name}? It can no longer be selected for new use, but nothing already relying on it is affected.`}
        confirmLabel="Deactivate"
        isPending={isDeactivating}
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  );
}
