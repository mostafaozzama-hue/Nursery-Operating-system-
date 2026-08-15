'use client';

import type { Discount } from '@nursery-os/contracts';
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
import { DISCOUNT_SCOPE_LABEL, DISCOUNT_TYPE_LABEL } from '@/lib/discounts/mapper';
import { useActivateDiscount, useDeactivateDiscount } from '@/lib/discounts/mutations';
import { useDiscountList } from '@/lib/discounts/queries';
import { formatMoney } from '@/lib/money';
import { ConfigurationSectionHeader } from '../configuration-section-header';

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'PERCENTAGE', label: DISCOUNT_TYPE_LABEL.PERCENTAGE },
  { value: 'FIXED_AMOUNT', label: DISCOUNT_TYPE_LABEL.FIXED_AMOUNT },
] as const;

const ACTIVE_FILTER_OPTIONS = [
  { value: 'all', label: 'All discounts' },
  { value: 'true', label: 'Active only' },
  { value: 'false', label: 'Inactive only' },
] as const;

/** amount is a percentage when type is PERCENTAGE, a currency value when FIXED_AMOUNT - formatMoney only applies to the latter. */
function formatDiscountAmount(discount: Discount): string {
  return discount.type === 'PERCENTAGE' ? `${discount.amount}%` : formatMoney(discount.amount);
}

/** No Discount Detail page - same shape as Fee. Adds a secondary link to Sibling Discount Tiers, a low-frequency configuration page deliberately not surfaced on the Configuration Dashboard. */
export function DiscountList() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, total, totalPages, query, isLoading, error, setQuery, refetch } = useDiscountList();
  const { mutate: activateDiscount, isPending: isActivating } = useActivateDiscount();
  const { mutate: deactivateDiscount, isPending: isDeactivating } = useDeactivateDiscount();
  const [pendingDeactivate, setPendingDeactivate] = useState<Discount | null>(null);

  const handleActivate = async (discount: Discount) => {
    try {
      await activateDiscount(discount.id);
      refetch();
    } catch {
      // mutation hook already captured the error; button re-enables for the user to retry
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!pendingDeactivate) return;
    try {
      await deactivateDiscount(pendingDeactivate.id);
      setPendingDeactivate(null);
      refetch();
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  const columns: DataTableColumn<Discount>[] = [
    { header: 'Name', cell: (discount) => discount.name, sortKey: 'name' },
    {
      header: 'Type',
      cell: (discount) => DISCOUNT_TYPE_LABEL[discount.type],
      sortKey: 'type',
    },
    { header: 'Amount', cell: (discount) => formatDiscountAmount(discount), sortKey: 'amount' },
    { header: 'Scope', cell: (discount) => DISCOUNT_SCOPE_LABEL[discount.scope] },
    {
      header: 'Stackable',
      cell: (discount) => (
        <Badge variant={discount.stackable ? 'info' : 'muted'}>
          {discount.stackable ? 'Stackable' : 'Exclusive'}
        </Badge>
      ),
    },
    {
      header: 'Status',
      cell: (discount) => (
        <Badge variant={discount.isActive ? 'success' : 'muted'}>
          {discount.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    ...(canManage
      ? [
          {
            header: 'Actions',
            cell: (discount: Discount) => (
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/configuration/discounts/${discount.id}/edit`}>Edit</Link>
                </Button>
                {discount.isActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDeactivating}
                    onClick={() => setPendingDeactivate(discount)}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isActivating}
                    onClick={() => handleActivate(discount)}
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
        title={`Discounts${total > 0 ? ` · ${total}` : ''}`}
        action={
          canManage
            ? { label: 'Add Discount', href: '/dashboard/configuration/discounts/new' }
            : undefined
        }
      />

      <Button asChild variant="link" size="sm" className="w-fit px-0">
        <Link href="/dashboard/configuration/sibling-discount-tiers">
          Configure sibling discount tiers
        </Link>
      </Button>

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
          rowKey={(discount) => discount.id}
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
            isFiltered
              ? 'No discounts match your search.'
              : 'No discounts yet — add your first one.'
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
        title="Deactivate discount"
        description={`Are you sure you want to deactivate ${pendingDeactivate?.name}? It can no longer be selected for new use, but nothing already relying on it is affected.`}
        confirmLabel="Deactivate"
        isPending={isDeactivating}
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  );
}
