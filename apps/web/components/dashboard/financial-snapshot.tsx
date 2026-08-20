import { CircleDollarSign, HandCoins, Receipt, TriangleAlert, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/common/card';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { DashboardOverview } from '@/lib/dashboard/queries';

/**
 * Owner Dashboard - Financial Snapshot (extends Dashboard v1, does not
 * replace it - approved as its own phase on top of design-system.md §12).
 * Renders above StatCards, same card shape/motion as stat-cards.tsx but
 * money-valued. No --accent-finance token exists yet in globals.css (that
 * file is untouched, unrelated pre-existing work) - reuses the tokens
 * design-system.md §5.16/§13 rule 5 already defines (info/success/
 * destructive) instead of inventing a new one.
 *
 * Labels are deliberately literal: "Collected" is cash actually received
 * (Payment.paidAt basis), "Invoiced" is what was billed (Invoice.createdAt
 * basis) - never called "Revenue," per the approved phase's explicit
 * constraint against implying an accrual/cash figure it isn't.
 */
type Accent = 'info' | 'success' | 'destructive';

const ACCENT_CLASSES: Record<Accent, { border: string; chipBg: string; icon: string }> = {
  info: { border: 'border-t-info', chipBg: 'bg-info/12', icon: 'text-info' },
  success: { border: 'border-t-success', chipBg: 'bg-success/12', icon: 'text-success' },
  destructive: { border: 'border-t-destructive', chipBg: 'bg-destructive/12', icon: 'text-destructive' },
};

function FinancialCard({
  label,
  amount,
  icon: Icon,
  accent,
}: {
  label: string;
  amount: string;
  icon: LucideIcon;
  accent: Accent;
}) {
  const { border, chipBg, icon } = ACCENT_CLASSES[accent];

  return (
    <Card
      className={cn(
        'flex flex-col gap-4 border-t-2 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md',
        border,
      )}
    >
      <span className={cn('flex size-9 items-center justify-center rounded-full', chipBg)}>
        <Icon className={cn('size-4', icon)} />
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-2xl font-bold tracking-tight text-foreground">{formatMoney(amount)}</span>
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      </div>
    </Card>
  );
}

/** null values mean a non-OWNER/ADMIN caller - dashboard-overview.tsx only renders this component when canManage, so null is not expected in practice, but each amount falls back to '0' defensively rather than crashing formatMoney. */
export function FinancialSnapshot({ overview }: { overview: DashboardOverview }) {
  const hasOverdue = Number(overview.overdueAmount ?? '0') > 0;

  return (
    <div className="grid grid-cols-1 gap-4 duration-500 animate-in fade-in slide-in-from-bottom-2 sm:grid-cols-2 lg:grid-cols-4">
      <FinancialCard
        label="Outstanding balance"
        amount={overview.outstandingAmount ?? '0'}
        icon={CircleDollarSign}
        accent="info"
      />
      <FinancialCard
        label="Overdue balance"
        amount={overview.overdueAmount ?? '0'}
        icon={TriangleAlert}
        accent={hasOverdue ? 'destructive' : 'info'}
      />
      <FinancialCard
        label="Collected this month"
        amount={overview.collectedAmountThisMonth ?? '0'}
        icon={HandCoins}
        accent="success"
      />
      <FinancialCard
        label="Invoiced this month"
        amount={overview.invoicedAmountThisMonth ?? '0'}
        icon={Receipt}
        accent="info"
      />
    </div>
  );
}
