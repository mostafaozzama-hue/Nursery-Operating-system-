import type { Child, CreateChildRequest } from '../children/types';
import type { Enrollment } from '../enrollments/types';
import type { OpenBillingTermsRequest } from '../enrollment-billing-terms/types';
import type { Guardian } from '../guardians/types';
import type { RelationshipType } from '../child-guardians/types';
import type { WaiverReasonCode, WaiverType } from '../waivers/types';

/**
 * Easy Enrollment (Product Gap H) - a single orchestrated call over the
 * existing Child/Guardian/ChildGuardian/Enrollment endpoints, not a second
 * enrollment concept. Either guardianId (reuse an existing Guardian) or
 * firstName+lastName (create a new one inline) is expected per entry, never
 * both - the wizard's search-existing-vs-create-new choice, not automatic
 * fuzzy matching.
 */
export interface AdmissionGuardianInput {
  guardianId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  relationshipType: RelationshipType;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  canPickup?: boolean;
}

/**
 * A single discount/waiver slot at enrollment time (Easy Enrollment,
 * Product Gap H phase 2) - deliberately not an array, to keep the wizard
 * simple. effectiveFrom is always today, set by the backend - not part of
 * this request. Additional discounts/waivers stay addable later from the
 * Child Detail page's existing sections.
 */
export interface AdmissionDiscountInput {
  discountId: string;
  effectiveTo?: string;
}

export interface AdmissionWaiverInput {
  type: WaiverType;
  percentage: number;
  reasonCode: WaiverReasonCode;
  reasonNote?: string;
  effectiveTo?: string;
  reviewAnnually?: boolean;
}

export interface CreateAdmissionRequest {
  child: CreateChildRequest;
  guardians: AdmissionGuardianInput[];
  classroomId?: string;
  createdReason?: string;
  plannedEndDate?: string;
  billingTerms?: OpenBillingTermsRequest;
  feeIds?: string[];
  discount?: AdmissionDiscountInput;
  waiver?: AdmissionWaiverInput;
}

export interface AdmissionResponse {
  child: Child;
  guardians: Guardian[];
  enrollment: Enrollment;
}
