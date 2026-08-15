import { Card } from '@/components/common/card';
import type { DashboardOverview } from '@/lib/dashboard/queries';

/**
 * design-system.md §5.16 stat card spec ("large number + label + optional
 * trend delta + module accent-colored icon") - trend delta and icon are
 * both skipped here: no historical data exists yet to compute a delta, and
 * an icon/accent-color treatment would mean introducing new design-system
 * surface this milestone deliberately doesn't touch (UXD-10's palette
 * rollout is separate, tracked work). Large number + label satisfies the
 * functional requirement (§12: "what's happening at a glance").
 */
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-3xl font-semibold text-foreground">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </Card>
  );
}

/**
 * §12: "Children present today" leads (Attendance's own "future-ready" note
 * - the single most important stat once Dashboard v1 ships), followed by
 * the four originally-specified cards. 4-up desktop / 2-up tablet / 1-up
 * mobile grid, per §5.16.
 */
export function StatCards({ overview }: { overview: DashboardOverview }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard label="Children present today" value={overview.childrenPresentTodayCount} />
      <StatCard label="Active children" value={overview.activeChildrenCount} />
      <StatCard label="Waitlisted" value={overview.waitlistedCount} />
      <StatCard label="Staff" value={overview.staffHeadcount} />
      <StatCard
        label="Classrooms near/at capacity"
        value={overview.classroomsNearOrAtCapacityCount}
      />
    </div>
  );
}
