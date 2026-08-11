import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * design-system.md §12/§5.16: Add Child / Add Staff / Add Payroll Record -
 * "(future) Check In" is explicitly future-scoped there, not built here.
 * All three actions are OWNER/ADMIN-only, matching the identical gating
 * already on each action's own List page (ChildrenList/StaffList/
 * PayrollList's "Add X" buttons) - a STAFF viewer sees no quick actions row
 * at all, per canManage gating one level up in DashboardOverview.
 */
export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild>
        <Link href="/dashboard/children/new">Add Child</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/dashboard/staff/new">Add Staff</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/dashboard/payroll/new">Add Payroll Record</Link>
      </Button>
    </div>
  );
}
