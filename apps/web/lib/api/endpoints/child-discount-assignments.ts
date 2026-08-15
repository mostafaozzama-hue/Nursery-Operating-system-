import type {
  AssignChildDiscountRequest,
  ChildDiscountAssignment,
  ChildDiscountAssignmentQuery,
  ExpireChildDiscountRequest,
  Paginated,
} from '@nursery-os/contracts';
import { get, post } from '../client';

/** Nested under Child - no top-level ChildDiscountAssignment resource. discountId is a URL param on assign, not a body field. No update/get-by-id: historized only. expire is a POST action (not DELETE) since it carries a business date (effectiveTo), returning no body. */
export const childDiscountAssignments = {
  assign: (childId: string, discountId: string, body: AssignChildDiscountRequest) =>
    post<ChildDiscountAssignment>(`/children/${childId}/discount-assignments/${discountId}`, body),
  expire: (childId: string, discountId: string, body: ExpireChildDiscountRequest) =>
    post<void>(`/children/${childId}/discount-assignments/${discountId}/expire`, body),
  list: (childId: string, query?: ChildDiscountAssignmentQuery) =>
    get<Paginated<ChildDiscountAssignment>>(`/children/${childId}/discount-assignments`, query),
};
