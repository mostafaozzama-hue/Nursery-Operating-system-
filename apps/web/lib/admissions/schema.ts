import type {
  AdmissionDiscountInput,
  AdmissionGuardianInput,
  AdmissionWaiverInput,
  CreateAdmissionRequest,
  Guardian,
  RelationshipType,
} from '@nursery-os/contracts';
import {
  childFormSchema,
  emptyChildFormValues,
  toCreateChildRequest,
  type ChildFormValues,
} from '@/lib/children/schema';
import {
  emptyOpenBillingTermsFormValues,
  toOpenBillingTermsRequest,
  type OpenBillingTermsFormValues,
} from '@/lib/enrollment-billing-terms/schema';
import { emptyGuardianFormValues, guardianFormSchema, toCreateGuardianRequest, type GuardianFormValues } from '@/lib/guardians/schema';
import { emptyWaiverFormValues, type WaiverFormValues } from '@/lib/waivers/schema';

export { childFormSchema, type ChildFormValues, emptyChildFormValues };

export type GuardianSlotMode = 'existing' | 'new';

/**
 * One of the wizard's three guardian slots (Mother/Father/Additional). Not a
 * new domain concept - relationshipType is the same field ChildGuardian
 * already carries; "existing vs new" is the search-and-select UI decision
 * the product explicitly wants, not automatic matching.
 */
export interface GuardianSlotValues {
  included: boolean;
  mode: GuardianSlotMode;
  existingGuardian: Guardian | null;
  newGuardian: GuardianFormValues;
  relationshipType: RelationshipType;
  isEmergencyContact: boolean;
  canPickup: boolean;
}

export function emptyGuardianSlot(
  relationshipType: RelationshipType,
  included: boolean,
  defaults: { isEmergencyContact?: boolean; canPickup?: boolean } = {},
): GuardianSlotValues {
  return {
    included,
    mode: 'existing',
    existingGuardian: null,
    newGuardian: emptyGuardianFormValues,
    relationshipType,
    isEmergencyContact: defaults.isEmergencyContact ?? false,
    canPickup: defaults.canPickup ?? false,
  };
}

/** null = valid. Mirrors link-guardian-form.tsx's existing-guardian gate and guardianFormSchema's new-guardian validation, just combined per slot. */
export function validateGuardianSlot(slot: GuardianSlotValues): string | null {
  if (!slot.included) return null;
  if (slot.mode === 'existing') {
    return slot.existingGuardian ? null : 'Select an existing guardian, or switch to “Create new”';
  }
  return guardianFormSchema.safeParse(slot.newGuardian).success
    ? null
    : 'Check the new guardian’s details below';
}

function toAdmissionGuardianInput(
  slot: GuardianSlotValues,
  isPrimaryContact: boolean,
): AdmissionGuardianInput {
  const shared = {
    relationshipType: slot.relationshipType,
    isPrimaryContact,
    isEmergencyContact: slot.isEmergencyContact,
    canPickup: slot.canPickup,
  };

  if (slot.mode === 'existing' && slot.existingGuardian) {
    return { guardianId: slot.existingGuardian.id, ...shared };
  }

  const newGuardian = toCreateGuardianRequest(slot.newGuardian);
  return { ...newGuardian, ...shared };
}

/** The wizard's single, optional discount slot - see AdmissionDiscountInput's doc comment for why it's not an array. */
export interface DiscountSlotValues {
  included: boolean;
  discountId: string;
  effectiveTo: string;
}

export const emptyDiscountSlotValues: DiscountSlotValues = {
  included: false,
  discountId: '',
  effectiveTo: '',
};

/** The wizard's single, optional waiver slot - reuses WaiverFormValues minus effectiveFrom (always today here, set by the backend). */
export type WaiverSlotValues = { included: boolean } & Omit<WaiverFormValues, 'effectiveFrom'>;

export const emptyWaiverSlotValues: WaiverSlotValues = {
  included: false,
  ...emptyWaiverFormValues,
};

export interface EnrollmentStepValues {
  classroomId: string | null;
  createdReason: string;
  // Easy Enrollment (Product Gap H, phase 2). Purely informational,
  // optional - '' means "not set," never auto-filled. Distinct from
  // Enrollment.endDate (system-managed, set only by transfer/withdraw).
  plannedEndDate: string;
  showBillingTerms: boolean;
  billingTerms: OpenBillingTermsFormValues;
  feeIds: string[];
  discount: DiscountSlotValues;
  waiver: WaiverSlotValues;
}

export const emptyEnrollmentStepValues: EnrollmentStepValues = {
  classroomId: null,
  createdReason: '',
  plannedEndDate: '',
  showBillingTerms: false,
  billingTerms: emptyOpenBillingTermsFormValues,
  feeIds: [],
  discount: emptyDiscountSlotValues,
  waiver: emptyWaiverSlotValues,
};

/**
 * Composes the final CreateAdmissionRequest from the wizard's four steps.
 * Primary contact defaults to Mother if included, else Father, else
 * unset - the DB only enforces *at most one* primary per child, so leaving
 * it unset for an additional-guardian-only enrollment is safe. This is a UX
 * default, not a business rule - the backend never assumes it.
 */
export function toCreateAdmissionRequest(
  child: ChildFormValues,
  mother: GuardianSlotValues,
  father: GuardianSlotValues,
  additional: GuardianSlotValues,
  enrollment: EnrollmentStepValues,
): CreateAdmissionRequest {
  const primarySlot = mother.included ? mother : father.included ? father : null;

  const guardians: AdmissionGuardianInput[] = [mother, father, additional]
    .filter((slot) => slot.included)
    .map((slot) => toAdmissionGuardianInput(slot, slot === primarySlot));

  const discount: AdmissionDiscountInput | undefined = enrollment.discount.included
    ? {
        discountId: enrollment.discount.discountId,
        effectiveTo: enrollment.discount.effectiveTo || undefined,
      }
    : undefined;

  const waiver: AdmissionWaiverInput | undefined = enrollment.waiver.included
    ? {
        type: enrollment.waiver.type,
        percentage: Number(enrollment.waiver.percentage),
        reasonCode: enrollment.waiver.reasonCode,
        reasonNote: enrollment.waiver.reasonNote.trim() || undefined,
        effectiveTo: enrollment.waiver.effectiveTo || undefined,
        reviewAnnually: enrollment.waiver.reviewAnnually,
      }
    : undefined;

  return {
    child: toCreateChildRequest(child),
    guardians,
    classroomId: enrollment.classroomId ?? undefined,
    createdReason: enrollment.createdReason.trim() || undefined,
    plannedEndDate: enrollment.plannedEndDate || undefined,
    billingTerms: enrollment.showBillingTerms
      ? toOpenBillingTermsRequest(enrollment.billingTerms)
      : undefined,
    feeIds: enrollment.feeIds.length > 0 ? enrollment.feeIds : undefined,
    discount,
    waiver,
  };
}

/** null = valid. Only meaningful when the slot is included - mirrors validateGuardianSlot's shape. */
export function validateDiscountSlot(slot: DiscountSlotValues): string | null {
  if (!slot.included) return null;
  return slot.discountId ? null : 'Select a discount';
}

export function validateWaiverSlot(slot: WaiverSlotValues): string | null {
  if (!slot.included) return null;
  if (!slot.type) return 'Select a waiver type';
  if (!slot.percentage || Number.isNaN(Number(slot.percentage))) return 'Enter a percentage';
  if (!slot.reasonCode) return 'Select a reason';
  if (slot.reasonCode === 'OTHER' && !slot.reasonNote.trim()) return 'Reason note is required for "Other"';
  if (!slot.effectiveTo && !slot.reviewAnnually) return 'Set an effective-to date, or mark "Review annually"';
  return null;
}

/** The wizard's own known-empty default for a given slot (mirrors its initial useState value exactly), used only to detect "nothing entered yet" for Cancel's confirm-or-not decision below. */
function defaultGuardianSlotFor(slot: GuardianSlotValues): GuardianSlotValues {
  return slot.relationshipType === 'MOTHER'
    ? emptyGuardianSlot('MOTHER', true, { isEmergencyContact: true, canPickup: true })
    : slot.relationshipType === 'FATHER'
      ? emptyGuardianSlot('FATHER', true, { isEmergencyContact: true, canPickup: true })
      : emptyGuardianSlot(slot.relationshipType, false);
}

/**
 * Cancel behavior (Enrollment Wizard): true only if every step is still at
 * its untouched initial value - compared by structural equality against
 * each step's own known-empty defaults, not a fresh heuristic. A photoFile
 * counts as entered data the moment one is selected. Deliberately a plain,
 * pure function (no component/render dependency) so it's directly
 * unit-testable and the wizard doesn't need its own ad hoc "dirty" tracking
 * duplicated per field.
 */
export function isWizardEmpty(
  child: ChildFormValues,
  mother: GuardianSlotValues,
  father: GuardianSlotValues,
  additional: GuardianSlotValues,
  enrollment: EnrollmentStepValues,
  photoFile: File | null,
): boolean {
  if (photoFile !== null) return false;
  if (JSON.stringify(child) !== JSON.stringify(emptyChildFormValues)) return false;
  if (JSON.stringify(mother) !== JSON.stringify(defaultGuardianSlotFor(mother))) return false;
  if (JSON.stringify(father) !== JSON.stringify(defaultGuardianSlotFor(father))) return false;
  if (JSON.stringify(additional) !== JSON.stringify(defaultGuardianSlotFor(additional))) return false;
  if (JSON.stringify(enrollment) !== JSON.stringify(emptyEnrollmentStepValues)) return false;
  return true;
}
