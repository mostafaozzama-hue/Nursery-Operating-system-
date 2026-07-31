/**
 * Plain TS interface, not a class-validator DTO - nothing at an HTTP
 * boundary constructs this directly (same reasoning as LineItemDraft).
 * previousValue is explicitly string | null (not optional) - a pure
 * addition (e.g. a new one-time charge) has no previous state to record,
 * per domain-model.md, so callers must state that intent with null rather
 * than silently omitting the field.
 */
export interface RecordOverrideInput {
  overrideType: string;
  reasonCode: string;
  reasonNote?: string;
  relatedEntityType: string;
  relatedEntityId: string;
  previousValue: string | null;
  newValue: string;
}
