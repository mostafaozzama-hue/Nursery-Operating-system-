import {
  RELATIONSHIP_TYPES,
  type CreateChildGuardianRequest,
  type RelationshipType,
  type UpdateChildGuardianRequest,
} from '@nursery-os/contracts';
import { z } from 'zod';

export const linkFormSchema = z.object({
  relationshipType: z.enum(RELATIONSHIP_TYPES, { message: 'Relationship is required' }),
  isPrimaryContact: z.boolean(),
  isEmergencyContact: z.boolean(),
  canPickup: z.boolean(),
});

export type LinkFormValidValues = z.infer<typeof linkFormSchema>;

/** Raw form state - relationshipType starts unselected, which linkFormSchema rejects with a friendly message. */
export interface LinkFormValues {
  relationshipType: RelationshipType | '';
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  canPickup: boolean;
}

export const emptyLinkFormValues: LinkFormValues = {
  relationshipType: '',
  isPrimaryContact: false,
  isEmergencyContact: false,
  canPickup: false,
};

export function toCreateChildGuardianRequest(
  childId: string,
  guardianId: string,
  values: LinkFormValidValues,
): CreateChildGuardianRequest {
  return {
    childId,
    guardianId,
    relationshipType: values.relationshipType,
    isPrimaryContact: values.isPrimaryContact,
    isEmergencyContact: values.isEmergencyContact,
    canPickup: values.canPickup,
  };
}

export function toUpdateChildGuardianRequest(
  values: LinkFormValidValues,
): UpdateChildGuardianRequest {
  return {
    relationshipType: values.relationshipType,
    isPrimaryContact: values.isPrimaryContact,
    isEmergencyContact: values.isEmergencyContact,
    canPickup: values.canPickup,
  };
}
