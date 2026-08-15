'use client';

import type { Holiday } from '@nursery-os/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { PaginationControls } from '@/components/common/pagination-controls';
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
import { formatEarlyCloseTime, formatHolidayDate, HOLIDAY_TYPE_LABEL } from '@/lib/holidays/mapper';
import { useRemoveHoliday } from '@/lib/holidays/mutations';
import { useHolidayList } from '@/lib/holidays/queries';
import { ConfigurationSectionHeader } from '../configuration-section-header';

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'FULL_CLOSURE', label: HOLIDAY_TYPE_LABEL.FULL_CLOSURE },
  { value: 'PARTIAL_CLOSURE', label: HOLIDAY_TYPE_LABEL.PARTIAL_CLOSURE },
] as const;

/** No Activate/Deactivate - Holiday has no isActive at all, so removal is a real, irreversible Delete behind ConfirmDialog. No name/text search - HolidayQueryDto offers only an exact date match and a type filter. */
export function HolidayList() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, total, totalPages, query, isLoading, error, setQuery, refetch } = useHolidayList();
  const { mutate: removeHoliday, isPending: isRemoving } = useRemoveHoliday();
  const [pendingDelete, setPendingDelete] = useState<Holiday | null>(null);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await removeHoliday(pendingDelete.id);
      setPendingDelete(null);
      refetch();
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  const columns: DataTableColumn<Holiday>[] = [
    { header: 'Date', cell: (holiday) => formatHolidayDate(holiday.date), sortKey: 'date' },
    { header: 'Name', cell: (holiday) => holiday.name, sortKey: 'name' },
    { header: 'Type', cell: (holiday) => HOLIDAY_TYPE_LABEL[holiday.type], sortKey: 'type' },
    {
      header: 'Early close time',
      cell: (holiday) => formatEarlyCloseTime(holiday.earlyCloseTime),
    },
    ...(canManage
      ? [
          {
            header: 'Actions',
            cell: (holiday: Holiday) => (
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/configuration/holidays/${holiday.id}/edit`}>Edit</Link>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isRemoving}
                  onClick={() => setPendingDelete(holiday)}
                >
                  Delete
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const isFiltered = Boolean(query.date) || query.type !== '';

  return (
    <div className="flex flex-col gap-4">
      <ConfigurationSectionHeader
        title={`Holidays${total > 0 ? ` · ${total}` : ''}`}
        action={
          canManage
            ? { label: 'Add Holiday', href: '/dashboard/configuration/holidays/new' }
            : undefined
        }
      />

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={query.date}
          onChange={(event) => setQuery({ date: event.target.value })}
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
          rowKey={(holiday) => holiday.id}
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
            isFiltered ? 'No holidays match your filters.' : 'No holidays yet — add your first one.'
          }
        />
      )}

      <PaginationControls
        meta={{ total, page: query.page, pageSize: query.pageSize, totalPages }}
        onPageChange={(page) => setQuery({ page })}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete holiday"
        description={`Are you sure you want to delete ${pendingDelete?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        isPending={isRemoving}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
