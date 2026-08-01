/** effectiveFrom/effectiveTo are @db.Date (calendar dates, no time-of-day component) - no UTC handling needed here, unlike Plan.scheduleStartTime/scheduleEndTime's @db.Time wall-clock values. */
function formatPriceDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

export function formatEffectiveRange(effectiveFrom: string, effectiveTo: string | null): string {
  return effectiveTo
    ? `${formatPriceDate(effectiveFrom)} – ${formatPriceDate(effectiveTo)}`
    : `${formatPriceDate(effectiveFrom)} – Present`;
}
