'use client';

import type { Classroom, Guardian } from '@nursery-os/contracts';
import { ClassroomPicker } from '@/components/classrooms/classroom-picker';
import { InlineWarning } from '@/components/common/inline-warning';
import { BillingTermsFields } from '@/components/enrollments/billing-terms-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EnrollmentStepValues } from '@/lib/admissions/schema';
import type { OpenBillingTermsFormValues } from '@/lib/enrollment-billing-terms/schema';
import { cn } from '@/lib/utils';
import { FeesDiscountWaiverFields } from './fees-discount-waiver-fields';

/**
 * Easy Enrollment wizard, Step 3 (Product Gap H). No editable start date -
 * CreateEnrollmentDto deliberately has none (enrollment always starts today,
 * a documented MVP decision); changing that would be enrollment business
 * logic, out of scope for this orchestration-only feature. Billing guardian
 * choices are limited to already-resolved guardians (existingGuardians,
 * i.e. slots using "search existing") - a guardian being created fresh in
 * this same request has no id yet to bill against, and OpenBillingTermsDto's
 * billingGuardianId is intentionally left untouched (no new billing
 * functionality). To bill a brand-new guardian, finish enrollment first,
 * then set billing terms from the child's page as today.
 */
export function EnrollmentStep({
  values,
  onChange,
  existingGuardians,
  billingTermsFieldErrors,
  discountError,
  waiverError,
}: {
  values: EnrollmentStepValues;
  onChange: (partial: Partial<EnrollmentStepValues>) => void;
  existingGuardians: Guardian[];
  billingTermsFieldErrors: Partial<Record<keyof OpenBillingTermsFormValues, string>>;
  discountError: string | null;
  waiverError: string | null;
}) {
  const selectClassroom = (classroom: Classroom) => onChange({ classroomId: classroom.id });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Classroom</p>
        {values.classroomId ? (
          <div>
            <p className="font-medium">Classroom selected</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange({ classroomId: null })}
            >
              Change
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => onChange({ classroomId: null })}
            >
              Waitlist without a classroom
            </Button>
            <ClassroomPicker onSelect={selectClassroom} />
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">Enrollment starts today.</p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="plannedEndDate">Planned end date (optional)</Label>
        <Input
          id="plannedEndDate"
          type="date"
          value={values.plannedEndDate}
          onChange={(event) => onChange({ plannedEndDate: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          The expected/target withdrawal date, if known - purely informational, never used to close
          the enrollment.
        </p>
        {!values.plannedEndDate && (
          <InlineWarning>Enrollment end date is missing. Please complete this information.</InlineWarning>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="createdReason">Reason (optional)</Label>
        <textarea
          id="createdReason"
          value={values.createdReason}
          onChange={(event) => onChange({ createdReason: event.target.value })}
          rows={3}
          className={cn(
            'w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30',
          )}
        />
      </div>

      {!values.showBillingTerms ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => onChange({ showBillingTerms: true })}
        >
          More options (billing terms)
        </Button>
      ) : (
        <BillingTermsFields
          guardians={existingGuardians}
          values={values.billingTerms}
          onChange={(partial) => onChange({ billingTerms: { ...values.billingTerms, ...partial } })}
          fieldErrors={billingTermsFieldErrors}
        />
      )}

      <FeesDiscountWaiverFields
        values={values}
        onChange={onChange}
        discountError={discountError}
        waiverError={waiverError}
      />
    </div>
  );
}
