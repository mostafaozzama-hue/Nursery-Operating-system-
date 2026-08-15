import type { PaginationQuery } from '../common/pagination';

export const RELATIONSHIP_TYPES = [
  'MOTHER',
  'FATHER',
  'GRANDPARENT',
  'LEGAL_GUARDIAN',
  'RELATIVE',
  'OTHER',
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export interface ChildGuardian {
  id: string;
  childId: string;
  guardianId: string;
  relationshipType: RelationshipType;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  canPickup: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChildGuardianQuery extends PaginationQuery {
  childId?: string;
  guardianId?: string;
}

export interface CreateChildGuardianRequest {
  childId: string;
  guardianId: string;
  relationshipType: RelationshipType;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  canPickup?: boolean;
}

export type UpdateChildGuardianRequest = Partial<
  Omit<CreateChildGuardianRequest, 'childId' | 'guardianId'>
>;
