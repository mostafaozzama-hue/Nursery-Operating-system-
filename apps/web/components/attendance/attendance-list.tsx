'use client';

import type { Attendance, AttendanceStatus } from '@nursery-os/contracts';
import Link from 'next/link';
import { Badge } from '@/components/common/badge';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { PaginationControls } from '@/components/common/pagination-controls';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useChildDirectory } from '@/lib/children/queries';
import { fullName } from '@/lib/children/mapper';
import { useClassroomDirectory } from '@/lib/classrooms/queries';
import {
  ATTENDANCE_STATUS_BADGE_VARIANT,
  ATTENDANCE_STATUS_LABEL,
  formatAttendanceDate,
  formatAttendanceTime,
} from '@/lib/attendance/mapper';
import { useAttendanceList } from '@/lib/attendance/queries';

const STATUS_OPTIONS: AttendanceStatus[] = ['CHECKED_IN', 'CHECKED_OUT', 'ABSENT'];

export function AttendanceList() {
  const { data, total, totalPages, query, isLoading, error, setQuery, refetch } =
    useAttendanceList();
  const { byId: childrenById, isLoading: childrenLoading } = useChildDirectory();
  const { byId: classroomsById, isLoading: classroomsLoading } = useClassroomDirectory();

  const isLoadingAny = isLoading || childrenLoading || classroomsLoading;

  const columns: DataTableColumn<Attendance>[] = [
    {
      header: 'Child',
      cell: (record) => {
        const child = childrenById.get(record.childId);
        return (
          <Link href={`/dashboard/attendance/${record.id}`} className="hover:underline">
            {child ? fullName(child) : '—'}
          </Link>
        );
      },
    },
    {
      header: 'Classroom',
      cell: (record) =>
        record.classroomId ? (classroomsById.get(record.classroomId)?.name ?? '—') : '—',
    },
    { header: 'Date', cell: (record) => formatAttendanceDate(record.date), sortKey: 'date' },
    {
      header: 'Check-in',
      cell: (record) => (record.checkInTime ? formatAttendanceTime(record.checkInTime) : '—'),
    },
    {
      header: 'Check-out',
      cell: (record) => (record.checkOutTime ? formatAttendanceTime(record.checkOutTime) : '—'),
    },
    {
      header: 'Status',
      cell: (record) => (
        <Badge variant={ATTENDANCE_STATUS_BADGE_VARIANT[record.status]}>
          {ATTENDANCE_STATUS_LABEL[record.status]}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Attendance history · {total}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={query.date}
          onChange={(event) => setQuery({ date: event.target.value })}
          className="w-40"
        />
        <Select
          value={query.classroomId || 'all'}
          onValueChange={(value) => setQuery({ classroomId: value === 'all' ? '' : value })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All classrooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classrooms</SelectItem>
            {[...classroomsById.values()].map((classroom) => (
              <SelectItem key={classroom.id} value={classroom.id}>
                {classroom.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={query.status || 'all'}
          onValueChange={(value) =>
            setQuery({ status: value === 'all' ? '' : (value as AttendanceStatus) })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {ATTENDANCE_STATUS_LABEL[status]}
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
      ) : !isLoadingAny && data.length === 0 ? (
        <EmptyState message="No attendance records match these filters." />
      ) : (
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(record) => record.id}
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
