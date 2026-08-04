import type { BillingRunStatus } from '@nursery-os/contracts';

export const BILLING_RUN_STATUS_LABEL: Record<BillingRunStatus, string> = {
  COMPLETED: 'Completed',
  PARTIAL_FAILURE: 'Partial failure',
};

export const BILLING_RUN_STATUS_BADGE_VARIANT: Record<BillingRunStatus, 'success' | 'warning'> = {
  COMPLETED: 'success',
  PARTIAL_FAILURE: 'warning',
};

/** periodStart/periodEnd are @db.Date (plain calendar dates) - no UTC handling needed. */
export function formatBillingRunDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

/** runAt is a plain DateTime (not @db.Time) - a genuine real-world timestamp, shown with its time component. */
export function formatBillingRunTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}
