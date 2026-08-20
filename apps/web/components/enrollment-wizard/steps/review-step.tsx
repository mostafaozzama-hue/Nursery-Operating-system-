'use client';

import { InlineWarning } from '@/components/common/inline-warning';
import { relationshipTypeLabel } from '@/lib/child-guardians/mapper';
import type { EnrollmentStepValues, GuardianSlotValues } from '@/lib/admissions/schema';
import type { ChildFormValues } from '@/lib/children/schema';
import { fullName as guardianFullName } from '@/lib/guardians/mapper';

/** Easy Enrollment wizard, Step 4 (Product Gap H) - read-only summary before "Enroll Child". */
export function ReviewStep({
  child,
  photoFile,
  guardianSlots,
  enrollment,
}: {
  child: ChildFormValues;
  photoFile: File | null;
  guardianSlots: { label: string; slot: GuardianSlotValues }[];
  enrollment: EnrollmentStepValues;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="font-medium">Child</h2>
        <p>
          {child.firstName} {child.lastName}
          {child.nickname ? ` (“${child.nickname}”)` : ''}
        </p>
        <p className="text-sm text-muted-foreground">Born {child.dateOfBirth || '—'}</p>
        <p className="text-sm text-muted-foreground">
          Photo: {photoFile ? photoFile.name : 'None selected'}
        </p>
      </section>

      <section>
        <h2 className="font-medium">Parents & guardians</h2>
        <ul className="flex flex-col gap-2">
          {guardianSlots
            .filter(({ slot }) => slot.included)
            .map(({ label, slot }) => (
              <li key={label} className="text-sm">
                <span className="font-medium">{label}</span> —{' '}
                {slot.mode === 'existing'
                  ? slot.existingGuardian
                    ? guardianFullName(slot.existingGuardian)
                    : '—'
                  : `${slot.newGuardian.firstName} ${slot.newGuardian.lastName} (new)`}{' '}
                <span className="text-muted-foreground">
                  ({relationshipTypeLabel(slot.relationshipType)}
                  {slot.canPickup ? ', can pick up' : ''})
                </span>
              </li>
            ))}
        </ul>
      </section>

      <section>
        <h2 className="font-medium">Enrollment</h2>
        <p className="text-sm">
          {enrollment.classroomId ? 'Classroom selected' : 'Waitlisted (no classroom)'}
        </p>
        <p className="text-sm text-muted-foreground">
          Planned end date: {enrollment.plannedEndDate || '—'}
        </p>
        {!enrollment.plannedEndDate && (
          <InlineWarning>Enrollment end date is missing. Please complete this information.</InlineWarning>
        )}
        {enrollment.showBillingTerms && (
          <p className="text-sm text-muted-foreground">Billing terms will be set on enrollment.</p>
        )}
        <p className="text-sm text-muted-foreground">
          Fees: {enrollment.feeIds.length > 0 ? `${enrollment.feeIds.length} selected` : 'None'}
        </p>
        <p className="text-sm text-muted-foreground">
          Discount: {enrollment.discount.included ? 'Will be assigned' : 'None'}
        </p>
        <p className="text-sm text-muted-foreground">
          Waiver: {enrollment.waiver.included ? 'Will be added' : 'None'}
        </p>
      </section>
    </div>
  );
}
