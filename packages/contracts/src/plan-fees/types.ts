import type { Fee } from '../fees/types';

/**
 * GET /plans/:planId/fees returns a plain array, not Paginated<T> - a Plan's
 * attached Fees are expected to stay small, same reasoning as PlanPrice's
 * history never needing real pagination. The nested `fee` object is not
 * declared in the backend's own Swagger DTO, but the actual repository does
 * `include: { fee: true }` - confirmed directly against plan-fee.repository.ts -
 * so the runtime response is genuinely richer than the documented DTO, the
 * same pattern already established for other response DTOs in this codebase.
 */
export interface PlanFee {
  id: string;
  planId: string;
  feeId: string;
  isMandatory: boolean;
  fee: Fee;
  createdAt: string;
  updatedAt: string;
}

export interface AttachPlanFeeRequest {
  feeId: string;
  isMandatory?: boolean;
}
