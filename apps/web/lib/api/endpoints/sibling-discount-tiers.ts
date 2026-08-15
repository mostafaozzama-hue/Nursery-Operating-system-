import type {
  Paginated,
  SetSiblingDiscountTierRequest,
  SiblingDiscountTier,
  SiblingDiscountTierQuery,
} from '@nursery-os/contracts';
import { get, post } from '../client';

/** Flat, top-level resource - no parent scope, unlike PlanPrice's nested /plans/:planId/prices. No update/remove: historized only, setTier always appends. */
export const siblingDiscountTiers = {
  list: (query?: SiblingDiscountTierQuery) =>
    get<Paginated<SiblingDiscountTier>>('/sibling-discount-tiers', query),
  setTier: (body: SetSiblingDiscountTierRequest) =>
    post<SiblingDiscountTier>('/sibling-discount-tiers', body),
};
