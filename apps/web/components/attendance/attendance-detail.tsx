'use client';

import Link from 'next/link';
import { Badge } from '@/components/common/badge';
import { Card, CardHeader, CardTitle } from '@/components/common/card';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { fullName } from '@/lib/children/mapper';
import { useChildDirectory } from '@/lib/children/queries';
import { useClassroomDirectory } from '@/lib/classrooms/queries';
import { useMembershipDirectory } from '@/lib/memberships/queries';
import {
  ATTENDANCE_STATUS_BADGE_VARIANT,
  ATTENDANCE_STATUS_LABEL,
  formatAttendanceDate,
  formatAttendanceTime,
} from '@/lib/attendance/mapper';
import { useAttendanceRecord } from '@/lib/attendance/queries';

export function AttendanceDetail({ attendanceId }: { attendanceId: string }) {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = useAttendanceRecord(attendanceId);
  const { byId: childrenById, isLoading: childrenLoading } = useChildDirectory();
  const { byId: classroomsById, isLoading: classroomsLoading } = useClassroomDirectory();
  // Gated behind canManage, same reasoning as StaffDetail - GET /memberships 403s for STAFF.
  const { byId: membershipsById, isLoading: membershipsLoading } =
    useMembershipDirectory(canManage);

  const breadcrumbChild = data ? childrenById.get(data.childId) : undefined;
  useBreadcrumbLabel(
    attendanceId,
    data
      ? `${breadcrumbChild ? fullName(breadcrumbChild) : 'Attendance record'} · ${formatAttendanceDate(data.date)}`
      : undefined,
  );

  const isLoadingAny =
    isLoading || childrenLoading || classroomsLoading || (canManage && membershipsLoading);

  if (isLoadingAny) {
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

  const child = childrenById.get(data.childId);
  const classroomName = data.classroomId
    ? (classroomsById.get(data.classroomId)?.name ?? 'Unknown classroom')
    : null;
  const checkedInByEmail = data.checkedInBy ? membershipsById.get(data.checkedInBy)?.email : null;
  const checkedOutByEmail = data.checkedOutBy
    ? membershipsById.get(data.checkedOutBy)?.email
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          {child ? fullName(child) : 'Attendance record'} · {formatAttendanceDate(data.date)}
        </h1>
        {canManage && (
          <Button asChild variant="outline">
            <Link href={`/dashboard/attendance/${attendanceId}/edit`}>Correct record</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <Badge variant={ATTENDANCE_STATUS_BADGE_VARIANT[data.status]}>
            {ATTENDANCE_STATUS_LABEL[data.status]}
          </Badge>
        </CardHeader>
        <dl className="grid max-w-md grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Child</dt>
          <dd>
            {child ? (
              <Link href={`/dashboard/children/${data.childId}`} className="hover:underline">
                {fullName(child)}
              </Link>
            ) : (
              '—'
            )}
          </dd>
          <dt className="text-muted-foreground">Classroom</dt>
          <dd>
            {data.classroomId ? (
              <Link href={`/dashboard/classrooms/${data.classroomId}`} className="hover:underline">
                {classroomName}
              </Link>
            ) : (
              '—'
            )}
          </dd>
          <dt className="text-muted-foreground">Check-in</dt>
          <dd>{data.checkInTime ? formatAttendanceTime(data.checkInTime) : '—'}</dd>
          <dt className="text-muted-foreground">Check-out</dt>
          <dd>{data.checkOutTime ? formatAttendanceTime(data.checkOutTime) : '—'}</dd>
          {canManage && (
            <>
              <dt className="text-muted-foreground">Checked in by</dt>
              <dd>{checkedInByEmail ?? (data.checkedInBy ? 'Unknown user' : '—')}</dd>
              <dt className="text-muted-foreground">Checked out by</dt>
              <dd>{checkedOutByEmail ?? (data.checkedOutBy ? 'Unknown user' : '—')}</dd>
            </>
          )}
        </dl>
      </Card>
    </div>
  );
}
