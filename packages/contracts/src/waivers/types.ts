import type { PaginationQuery } from '../common/pagination';

export const WAIVER_TYPES = ['FULL', 'PARTIAL'] as const;
export type WaiverType = (typeof WAIVER_TYPES)[number];

export const WAIVER_REASON_CODES = [
  'OWNER_FAMILY',
  'SCHOLARSHIP',
  'HARDSHIP',
  'STAFF_BENEFIT',
  'OTHER',
] as const;
export type WaiverReasonCode = (typeof WAIVER_REASON_CODES)[number];

export const WAIVER_SORT_FIELDS = ['effectiveFrom', 'createdAt'] as const;
export type WaiverSortField = (typeof WAIVER_SORT_FIELDS)[number];

/** percentage is a string - Waiver.percentage is a Prisma Decimal column, which serializes as a JSON string over the wire, same as Discount.amount. effectiveFrom/effectiveTo are @db.Date. */
export interface Waiver {
  id: string;
  childId: string;
  type: WaiverType;
  percentage: string;
  reasonCode: WaiverReasonCode;
  reasonNote: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  reviewAnnually: boolean;
  approvedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaiverQuery extends PaginationQuery {
  sortBy?: WaiverSortField;
}

export interface CreateWaiverRequest {
  type: WaiverType;
  percentage: number;
  reasonCode: WaiverReasonCode;
  /** Required when reasonCode is 'OTHER' - a server-state rule, not enforced by this type. */
  reasonNote?: string;
  effectiveFrom: string;
  /** Required unless reviewAnnually is true - a server-state rule, not enforced by this type. */
  effectiveTo?: string;
  reviewAnnually?: boolean;
}

/** type, effectiveFrom, and approvedBy are not patchable - matches update-waiver.dto.ts exactly. */
export interface UpdateWaiverRequest {
  percentage?: number;
  reasonCode?: WaiverReasonCode;
  reasonNote?: string;
  effectiveTo?: string | null;
  reviewAnnually?: boolean;
}
