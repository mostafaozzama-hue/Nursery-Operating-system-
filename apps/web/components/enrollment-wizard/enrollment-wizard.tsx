'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import {
  childFormSchema,
  emptyChildFormValues,
  emptyEnrollmentStepValues,
  emptyGuardianSlot,
  isWizardEmpty,
  toCreateAdmissionRequest,
  validateDiscountSlot,
  validateGuardianSlot,
  validateWaiverSlot,
  type ChildFormValues,
  type EnrollmentStepValues,
  type GuardianSlotValues,
} from '@/lib/admissions/schema';
import { useCreateAdmission } from '@/lib/admissions/mutations';
import { useUploadChildPhoto } from '@/lib/children/mutations';
import { ChildStep } from './steps/child-step';
import { EnrollmentStep } from './steps/enrollment-step';
import { GuardiansStep } from './steps/guardians-step';
import { ReviewStep } from './steps/review-step';

const STEPS = ['Child', 'Parents & Guardians', 'Enrollment', 'Review'] as const;

/**
 * Easy Enrollment (Product Gap H) - a single 4-step flow over the existing
 * Child/Guardian/ChildGuardian/Enrollment primitives (see AdmissionModule on
 * the API side). All step state lives here so Back/Next preserves entered
 * values, matching the task's explicit requirement.
 */
export function EnrollmentWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [child, setChild] = useState<ChildFormValues>(emptyChildFormValues);
  const [childErrors, setChildErrors] = useState<Partial<Record<keyof ChildFormValues, string>>>(
    {},
  );

  const [mother, setMother] = useState<GuardianSlotValues>(
    emptyGuardianSlot('MOTHER', true, { isEmergencyContact: true, canPickup: true }),
  );
  const [father, setFather] = useState<GuardianSlotValues>(
    emptyGuardianSlot('FATHER', true, { isEmergencyContact: true, canPickup: true }),
  );
  const [additional, setAdditional] = useState<GuardianSlotValues>(
    emptyGuardianSlot('OTHER', false),
  );
  const [guardianErrors, setGuardianErrors] = useState<{
    mother: string | null;
    father: string | null;
    additional: string | null;
  }>({ mother: null, father: null, additional: null });

  const [enrollment, setEnrollment] = useState<EnrollmentStepValues>(emptyEnrollmentStepValues);
  const [enrollmentErrors, setEnrollmentErrors] = useState<{
    discount: string | null;
    waiver: string | null;
  }>({ discount: null, waiver: null });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const { mutate: createAdmission, isPending, error: submitError } = useCreateAdmission();
  const { mutate: uploadPhoto, isPending: isUploadingPhoto } = useUploadChildPhoto();

  const existingGuardians = [mother, father, additional]
    .filter((slot) => slot.included && slot.mode === 'existing' && slot.existingGuardian)
    .map((slot) => slot.existingGuardian!);

  const validateChildStep = (): boolean => {
    const result = childFormSchema.safeParse(child);
    if (!result.success) {
      const errors: Partial<Record<keyof ChildFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof ChildFormValues] = issue.message;
      }
      setChildErrors(errors);
      return false;
    }
    setChildErrors({});
    return true;
  };

  const validateGuardiansStep = (): boolean => {
    const motherError = validateGuardianSlot(mother);
    const fatherError = validateGuardianSlot(father);
    const additionalError = validateGuardianSlot(additional);
    setGuardianErrors({ mother: motherError, father: fatherError, additional: additionalError });

    if (motherError || fatherError || additionalError) return false;
    if (!mother.included && !father.included && !additional.included) {
      setGuardianErrors({
        mother: 'Add at least one parent or guardian',
        father: null,
        additional: null,
      });
      return false;
    }
    return true;
  };

  const validateEnrollmentStep = (): boolean => {
    const discountError = validateDiscountSlot(enrollment.discount);
    const waiverError = validateWaiverSlot(enrollment.waiver);
    setEnrollmentErrors({ discount: discountError, waiver: waiverError });
    return !discountError && !waiverError;
  };

  const goNext = () => {
    if (step === 0 && !validateChildStep()) return;
    if (step === 1 && !validateGuardiansStep()) return;
    if (step === 2 && !validateEnrollmentStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  /**
   * Cancel: no confirmation needed if nothing has actually been entered
   * (a fresh wizard, or the user immediately changed their mind) - goes
   * straight back to the Children list. Otherwise, confirm first so a
   * stray click never silently discards real work. Either way, no API
   * call ever happens here - navigating away just unmounts this component
   * and its local state with it; nothing was ever created to undo.
   */
  const handleCancelClick = () => {
    if (isWizardEmpty(child, mother, father, additional, enrollment, photoFile)) {
      router.push('/dashboard/children');
      return;
    }
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    setCancelDialogOpen(false);
    router.push('/dashboard/children');
  };

  const handleEnroll = async () => {
    if (!validateChildStep() || !validateGuardiansStep() || !validateEnrollmentStep()) return;
    try {
      const result = await createAdmission(
        toCreateAdmissionRequest(child, mother, father, additional, enrollment),
      );

      if (photoFile) {
        // Best-effort follow-up, same as the standalone ChildForm - the
        // admission itself is already fully committed at this point, so a
        // photo-upload failure here is never a half-created enrollment,
        // just a missing photo, fixable later from the child's Edit page.
        await uploadPhoto(result.child.id, photoFile).catch(() => undefined);
      }

      router.push(`/dashboard/children/${result.child.id}`);
    } catch {
      // surfaced via submitError below
    }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Enroll Child</h1>
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </div>

      {step === 0 && (
        <ChildStep
          values={child}
          onChange={(p) => setChild((v) => ({ ...v, ...p }))}
          fieldErrors={childErrors}
          onPhotoFileSelected={setPhotoFile}
        />
      )}

      {step === 1 && (
        <GuardiansStep
          mother={mother}
          onMotherChange={(p) => setMother((v) => ({ ...v, ...p }))}
          motherError={guardianErrors.mother}
          father={father}
          onFatherChange={(p) => setFather((v) => ({ ...v, ...p }))}
          fatherError={guardianErrors.father}
          additional={additional}
          onAdditionalChange={(p) => setAdditional((v) => ({ ...v, ...p }))}
          additionalError={guardianErrors.additional}
        />
      )}

      {step === 2 && (
        <EnrollmentStep
          values={enrollment}
          onChange={(p) => setEnrollment((v) => ({ ...v, ...p }))}
          existingGuardians={existingGuardians}
          billingTermsFieldErrors={{}}
          discountError={enrollmentErrors.discount}
          waiverError={enrollmentErrors.waiver}
        />
      )}

      {step === 3 && (
        <ReviewStep
          child={child}
          photoFile={photoFile}
          guardianSlots={[
            { label: 'Mother', slot: mother },
            { label: 'Father', slot: father },
            { label: 'Additional guardian', slot: additional },
          ]}
          enrollment={enrollment}
        />
      )}

      {submitError != null && (
        <p className="text-sm text-destructive">
          {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
        </p>
      )}

      <div className="flex justify-between">
        <div>
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={isPending || isUploadingPhoto}
            >
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancelClick}
            disabled={isPending || isUploadingPhoto}
          >
            Cancel
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext} disabled={isPending || isUploadingPhoto}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={handleEnroll} disabled={isPending || isUploadingPhoto}>
              {isPending || isUploadingPhoto ? 'Enrolling…' : 'Enroll Child'}
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel enrollment?"
        description="Your entered information will be lost."
        cancelLabel="Keep editing"
        confirmLabel="Cancel enrollment"
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
