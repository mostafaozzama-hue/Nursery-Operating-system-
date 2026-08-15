/** effectiveFrom/effectiveTo are @db.Date (calendar dates, no time-of-day component) - no UTC handling needed, same shape as PlanPrice/SiblingDiscountTier's. */
function formatAssignmentDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

export function formatEffectiveRange(effectiveFrom: string, effectiveTo: string | null): string {
  return effectiveTo
    ? `${formatAssignmentDate(effectiveFrom)} – ${formatAssignmentDate(effectiveTo)}`
    : `${formatAssignmentDate(effectiveFrom)} – Present`;
}
