import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * design-system.md §12/§5.16: Enroll Child / Add Staff / Add Payroll Record -
 * "(future) Check In" is explicitly future-scoped there, not built here.
 * Enroll Child replaces the former "Add Child" quick action (Easy
 * Enrollment, Product Gap H phase 2) - /dashboard/children/new still exists
 * as an internal/admin fallback, just no longer linked from here. All three
 * actions are OWNER/ADMIN-only, matching the identical gating already on
 * each action's own List page - a STAFF viewer sees no quick actions row at
 * all, per canManage gating one level up in DashboardOverview.
 */
export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild>
        <Link href="/dashboard/children/enroll">
          <Plus data-icon="inline-start" className="size-4" aria-hidden="true" />
          Enroll Child
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/dashboard/staff/new">
          <Plus data-icon="inline-start" className="size-4" aria-hidden="true" />
          Add Staff
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/dashboard/payroll/new">
          <Plus data-icon="inline-start" className="size-4" aria-hidden="true" />
          Add Payroll Record
        </Link>
      </Button>
    </div>
  );
}
