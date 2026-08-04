import type { WaiverReasonCode, WaiverType } from '@nursery-os/contracts';

export const WAIVER_TYPE_LABEL: Record<WaiverType, string> = {
  FULL: 'Full',
  PARTIAL: 'Partial',
};

export const WAIVER_REASON_CODE_LABEL: Record<WaiverReasonCode, string> = {
  OWNER_FAMILY: 'Owner family',
  SCHOLARSHIP: 'Scholarship',
  HARDSHIP: 'Hardship',
  STAFF_BENEFIT: 'Staff benefit',
  OTHER: 'Other',
};

/** effectiveFrom/effectiveTo are @db.Date (calendar dates, no time-of-day component) - no UTC handling needed, same shape as ChildFeeAssignment/ChildDiscountAssignment's. */
function formatWaiverDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

export function formatEffectiveRange(effectiveFrom: string, effectiveTo: string | null): string {
  return effectiveTo
    ? `${formatWaiverDate(effectiveFrom)} – ${formatWaiverDate(effectiveTo)}`
    : `${formatWaiverDate(effectiveFrom)} – Present`;
}
