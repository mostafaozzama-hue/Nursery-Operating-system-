'use client';

import type { Plan } from '@nursery-os/contracts';
import Link from 'next/link';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { PaginationControls } from '@/components/common/pagination-controls';
import { Badge } from '@/components/common/badge';
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
import {
  PLAN_BILLING_CYCLE_LABEL,
  formatScheduleDays,
  formatScheduleWindow,
} from '@/lib/plans/mapper';
import { usePlanList } from '@/lib/plans/queries';
import { ConfigurationSectionHeader } from '../configuration-section-header';

const ACTIVE_FILTER_OPTIONS = [
  { value: 'all', label: 'All plans' },
  { value: 'true', label: 'Active only' },
  { value: 'false', label: 'Inactive only' },
] as const;

export function PlanList() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, total, totalPages, query, isLoading, error, setQuery, refetch } = usePlanList();

  const columns: DataTableColumn<Plan>[] = [
    { header: 'Name', cell: (plan) => plan.name, sortKey: 'name' },
    {
      header: 'Billing cycle',
      cell: (plan) => PLAN_BILLING_CYCLE_LABEL[plan.billingCycle],
      sortKey: 'billingCycle',
    },
    { header: 'Schedule', cell: (plan) => formatScheduleDays(plan.scheduleDaysOfWeek) },
    {
      header: 'Time',
      cell: (plan) => formatScheduleWindow(plan.scheduleStartTime, plan.scheduleEndTime),
    },
    {
      header: 'Status',
      cell: (plan) => (
        <Badge variant={plan.isActive ? 'success' : 'muted'}>
          {plan.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    ...(canManage
      ? [
          {
            header: 'Actions',
            cell: (plan: Plan) => (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/configuration/plans/${plan.id}/edit`}>Edit</Link>
              </Button>
            ),
          },
        ]
      : []),
  ];

  const isFiltered = Boolean(query.search) || query.isActive !== '';

  return (
    <div className="flex flex-col gap-4">
      <ConfigurationSectionHeader
        title={`Plans${total > 0 ? ` · ${total}` : ''}`}
        action={
          canManage ? { label: 'Add Plan', href: '/dashboard/configuration/plans/new' } : undefined
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
          rowKey={(plan) => plan.id}
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
            isFiltered ? 'No plans match your search.' : 'No plans yet — add your first one.'
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
