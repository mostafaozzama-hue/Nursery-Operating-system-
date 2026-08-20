'use client';

import type { Child, Classroom, Staff } from '@nursery-os/contracts';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { todayLocalDate } from '@/lib/attendance/mapper';
import { fullName as childFullName } from '@/lib/children/mapper';
import { fullName as guardianFullName } from '@/lib/guardians/mapper';
import { staffFullName } from '@/lib/staff/mapper';

export interface ClassroomOccupancy {
  classroom: Classroom;
  occupied: number;
}

export interface RecentActivityItem {
  type: 'child' | 'guardian' | 'staff';
  id: string;
  label: string;
  createdAt: string;
  href: string;
}

export interface DashboardOverview {
  activeChildrenCount: number;
  waitlistedCount: number;
  staffHeadcount: number;
  classroomsNearOrAtCapacityCount: number;
  childrenPresentTodayCount: number;
  overdueInvoicesCount: number;
  classroomsOverCapacity: ClassroomOccupancy[];
  staffWithoutPayroll: Staff[];
  staffWithoutPortalAccess: Staff[];
  noPlansConfigured: boolean;
  recentActivity: RecentActivityItem[];
  birthdaysThisMonth: Child[];
  /**
   * Owner Dashboard financial snapshot (extends Dashboard v1, does not
   * replace it - see design-system.md §12 and the approved
   * "Owner Dashboard - Financial Snapshot" phase). canManage-only, same
   * gating as the Payroll-derived attention items above - all four amounts
   * are OWNER/ADMIN-only on the backend. outstandingAmount/overdueAmount
   * are as-of-now snapshots; collectedAmountThisMonth/
   * invoicedAmountThisMonth are scoped to the current tenant-local-ish
   * calendar month (browser-local, same approximation as todayLocalDate
   * elsewhere in this file). null for a non-canManage caller.
   */
  outstandingAmount: string | null;
  overdueAmount: string | null;
  collectedAmountThisMonth: string | null;
  invoicedAmountThisMonth: string | null;
}

/** "This month" as [from, to) - browser-local calendar month, same approximation todayLocalDate already uses elsewhere in this file (no tenant-timezone endpoint exists on the frontend). */
function thisMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from: from.toLocaleDateString('en-CA'), to: to.toLocaleDateString('en-CA') };
}

export interface DashboardOverviewResult {
  data: DashboardOverview | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Dashboard v1 (design-system.md §12) - pure client-side aggregation over
 * already-existing list endpoints, zero new backend surface. Each fetch
 * below is reused across every widget it can serve (e.g. the single ACTIVE
 * enrollments fetch powers both the "Active children" stat card and the
 * classroom-occupancy calculation) rather than re-fetching per widget.
 *
 * `canManage` gates only the two Payroll-derived attention items -
 * GET /payroll is OWNER/ADMIN-only on the backend (unlike every other list
 * endpoint used here, which STAFF can already read) - matching the
 * precedent already established by useMembershipDirectory/usePayrollList
 * elsewhere in this app. The Quick Actions row applies the same gating for
 * the same reason (POST /children, /staff, /payroll are all OWNER/ADMIN-only,
 * matching the "Add X" buttons already gated identically on each List page).
 */
export function useDashboardOverview(canManage: boolean): DashboardOverviewResult {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const today = todayLocalDate();
    const { from: monthStart, to: monthEnd } = thisMonthRange();

    Promise.all([
      api.enrollments.list({ status: 'ACTIVE', open: true, pageSize: 100 }),
      api.enrollments.list({ status: 'WAITLISTED', pageSize: 1 }),
      api.staff.list({ pageSize: 100 }),
      api.classrooms.list({ pageSize: 100 }),
      api.attendance.list({ date: today, status: 'CHECKED_IN', pageSize: 1 }),
      api.attendance.list({ date: today, status: 'CHECKED_OUT', pageSize: 1 }),
      api.invoices.list({ status: 'OVERDUE', pageSize: 1 }),
      api.plans.list({ isActive: true, pageSize: 1 }),
      api.children.list({ pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
      api.guardians.list({ pageSize: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
      canManage ? api.payroll.list({ pageSize: 100 }) : Promise.resolve(null),
      // Owner Dashboard financial snapshot - OWNER/ADMIN-only on the
      // backend (@Roles('OWNER','ADMIN') on both summary endpoints),
      // matching the canManage gating already established for payroll
      // above.
      canManage ? api.invoices.getSummary({ from: monthStart, to: monthEnd }) : Promise.resolve(null),
      canManage ? api.payments.getSummary({ from: monthStart, to: monthEnd }) : Promise.resolve(null),
    ])
      .then(
        ([
          activeEnrollments,
          waitlisted,
          staffList,
          classroomList,
          checkedIn,
          checkedOut,
          overdueInvoices,
          activePlans,
          childList,
          guardianList,
          payrollList,
          invoiceSummary,
          paymentSummary,
        ]) => {
          if (cancelled) return;

          // ---- Classroom occupancy (shared by the stat card and the attention list) ----
          const occupancyByClassroom = new Map<string, number>();
          for (const enrollment of activeEnrollments.data) {
            if (!enrollment.classroomId) continue;
            occupancyByClassroom.set(
              enrollment.classroomId,
              (occupancyByClassroom.get(enrollment.classroomId) ?? 0) + 1,
            );
          }
          const occupancies: ClassroomOccupancy[] = classroomList.data.map((classroom) => ({
            classroom,
            occupied: occupancyByClassroom.get(classroom.id) ?? 0,
          }));
          // "Near/at capacity" (stat card): no document defines an exact
          // percentage threshold for "near" - one seat remaining is the
          // most conservative, least-invented reading, deliberately kept
          // narrow rather than picking an arbitrary percentage.
          const nearOrAtCapacity = occupancies.filter(
            (o) => o.occupied >= o.classroom.capacity - 1,
          );
          // "Over capacity" (attention list): a real, unambiguous problem -
          // only reachable if capacity was reduced after children were
          // already enrolled, since CapacityService blocks new enrollment
          // past capacity in the first place.
          const overCapacity = occupancies.filter((o) => o.occupied > o.classroom.capacity);

          // ---- Staff attention items (canManage only - see doc comment above) ----
          // Both filtered to [] for a STAFF caller, not just staffWithoutPayroll -
          // GET /payroll would 403 for STAFF (hence payrollList itself being
          // null), but staffWithoutPortalAccess reads Staff.userId, which STAFF
          // *can* read - it needs its own explicit canManage gate here, since
          // nothing about its data source enforces that gating automatically.
          const staffWithoutPortalAccess = canManage ? staffList.data.filter((s) => !s.userId) : [];
          const staffWithoutPayroll = payrollList
            ? staffList.data.filter((s) => !payrollList.data.some((p) => p.staffId === s.id))
            : [];

          // ---- Recent activity: merge Children/Guardians/Staff by createdAt ----
          const recentActivity: RecentActivityItem[] = [
            ...childList.data.map((c) => ({
              type: 'child' as const,
              id: c.id,
              label: childFullName(c),
              createdAt: c.createdAt,
              href: `/dashboard/children/${c.id}`,
            })),
            ...guardianList.data.map((g) => ({
              type: 'guardian' as const,
              id: g.id,
              label: guardianFullName(g),
              createdAt: g.createdAt,
              href: `/dashboard/guardians/${g.id}`,
            })),
            ...staffList.data.map((s) => ({
              type: 'staff' as const,
              id: s.id,
              label: staffFullName(s),
              createdAt: s.createdAt,
              href: `/dashboard/staff/${s.id}`,
            })),
          ]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 5);

          // ---- Birthdays this month ----
          // "This month", not "this week": avoids the cross-month-boundary
          // edge case (e.g. late Feb into early March) for a v1 widget,
          // narrower but unambiguous - see design-system.md §12. Uses local
          // Date methods (not UTC) to match formatDateOfBirth's own existing
          // convention (lib/children/mapper.ts) rather than fix the
          // inherited timezone approximation only here and create a fresh
          // inconsistency (same reasoning Sprint 6 documented for the
          // identical, already-accepted quirk elsewhere in this app).
          const now = new Date();
          const birthdaysThisMonth = childList.data
            .filter((c) => new Date(c.dateOfBirth).getMonth() === now.getMonth())
            .sort((a, b) => new Date(a.dateOfBirth).getDate() - new Date(b.dateOfBirth).getDate());

          setData({
            activeChildrenCount: activeEnrollments.meta.total,
            waitlistedCount: waitlisted.meta.total,
            staffHeadcount: staffList.meta.total,
            classroomsNearOrAtCapacityCount: nearOrAtCapacity.length,
            childrenPresentTodayCount: checkedIn.meta.total + checkedOut.meta.total,
            overdueInvoicesCount: overdueInvoices.meta.total,
            classroomsOverCapacity: overCapacity,
            staffWithoutPayroll,
            staffWithoutPortalAccess,
            noPlansConfigured: activePlans.meta.total === 0,
            recentActivity,
            birthdaysThisMonth,
            outstandingAmount: invoiceSummary?.outstandingAmount ?? null,
            overdueAmount: invoiceSummary?.overdueAmount ?? null,
            collectedAmountThisMonth: paymentSummary?.collectedAmount ?? null,
            invoicedAmountThisMonth: invoiceSummary?.invoicedAmount ?? null,
          });
        },
      )
      .catch((err: unknown) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canManage, reloadToken]);

  return { data, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}
