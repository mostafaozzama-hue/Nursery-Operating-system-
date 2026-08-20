import type {
  AssignChildDiscountRequest,
  ChildDiscountAssignment,
  ChildDiscountAssignmentQuery,
  ExpireChildDiscountRequest,
  Paginated,
} from '@nursery-os/contracts';
import { del, get, post } from '../client';

/** Nested under Child - no top-level ChildDiscountAssignment resource. discountId is a URL param on assign, not a body field. No update/get-by-id: historized only. expire is a POST action (not DELETE) since it carries a business date (effectiveTo), returning no body. remove is a real DELETE (Easy Enrollment, Product Gap H phase 2 discount bug fix) - soft-deletes the currently-open assignment outright, no date involved. */
export const childDiscountAssignments = {
  assign: (childId: string, discountId: string, body: AssignChildDiscountRequest) =>
    post<ChildDiscountAssignment>(`/children/${childId}/discount-assignments/${discountId}`, body),
  expire: (childId: string, discountId: string, body: ExpireChildDiscountRequest) =>
    post<void>(`/children/${childId}/discount-assignments/${discountId}/expire`, body),
  remove: (childId: string, discountId: string) =>
    del<void>(`/children/${childId}/discount-assignments/${discountId}`),
  list: (childId: string, query?: ChildDiscountAssignmentQuery) =>
    get<Paginated<ChildDiscountAssignment>>(`/children/${childId}/discount-assignments`, query),
};
