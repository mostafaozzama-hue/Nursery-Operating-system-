'use client';

import type { GuardianSlotValues } from '@/lib/admissions/schema';
import { GuardianSlotFields } from './guardian-slot-fields';

/**
 * Easy Enrollment wizard, Step 2 (Product Gap H). Mother and Father are each
 * independently include-able (a child may have only one parent on file);
 * Additional guardian defaults excluded. excludeIds prevents picking the
 * same existing guardian into two slots.
 */
export function GuardiansStep({
  mother,
  onMotherChange,
  motherError,
  father,
  onFatherChange,
  fatherError,
  additional,
  onAdditionalChange,
  additionalError,
}: {
  mother: GuardianSlotValues;
  onMotherChange: (partial: Partial<GuardianSlotValues>) => void;
  motherError: string | null;
  father: GuardianSlotValues;
  onFatherChange: (partial: Partial<GuardianSlotValues>) => void;
  fatherError: string | null;
  additional: GuardianSlotValues;
  onAdditionalChange: (partial: Partial<GuardianSlotValues>) => void;
  additionalError: string | null;
}) {
  const excludeIds = [mother, father, additional]
    .map((slot) => slot.existingGuardian?.id)
    .filter((id): id is string => id != null);

  const excludeFor = (current: GuardianSlotValues) =>
    excludeIds.filter((id) => id !== current.existingGuardian?.id);

  return (
    <div className="flex flex-col gap-4">
      <GuardianSlotFields
        label="Mother"
        slot={mother}
        onChange={onMotherChange}
        excludeIds={excludeFor(mother)}
        optional
        relationshipTypeSelectable={false}
        error={motherError}
      />
      <GuardianSlotFields
        label="Father"
        slot={father}
        onChange={onFatherChange}
        excludeIds={excludeFor(father)}
        optional
        relationshipTypeSelectable={false}
        error={fatherError}
      />
      <GuardianSlotFields
        label="Additional guardian (optional)"
        slot={additional}
        onChange={onAdditionalChange}
        excludeIds={excludeFor(additional)}
        optional
        relationshipTypeSelectable
        error={additionalError}
      />
    </div>
  );
}
