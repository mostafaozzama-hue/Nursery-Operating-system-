/** effectiveFrom/effectiveTo are @db.Date (calendar dates, no time-of-day component) - no UTC handling needed here, same shape as PlanPrice's. */
function formatTierDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

export function formatEffectiveRange(effectiveFrom: string, effectiveTo: string | null): string {
  return effectiveTo
    ? `${formatTierDate(effectiveFrom)} – ${formatTierDate(effectiveTo)}`
    : `${formatTierDate(effectiveFrom)} – Present`;
}
