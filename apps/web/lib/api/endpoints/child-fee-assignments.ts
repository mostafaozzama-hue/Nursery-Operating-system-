import type {
  AssignChildFeeRequest,
  ChildFeeAssignment,
  ChildFeeAssignmentQuery,
  Paginated,
  UnassignChildFeeRequest,
} from '@nursery-os/contracts';
import { get, post } from '../client';

/** Nested under Child - no top-level ChildFeeAssignment resource. No update/get-by-id: historized only. unassign is a POST action (not DELETE) since it carries a business date (effectiveTo), returning no body. */
export const childFeeAssignments = {
  assign: (childId: string, body: AssignChildFeeRequest) =>
    post<ChildFeeAssignment>(`/children/${childId}/fee-assignments`, body),
  unassign: (childId: string, feeId: string, body: UnassignChildFeeRequest) =>
    post<void>(`/children/${childId}/fee-assignments/${feeId}/unassign`, body),
  list: (childId: string, query?: ChildFeeAssignmentQuery) =>
    get<Paginated<ChildFeeAssignment>>(`/children/${childId}/fee-assignments`, query),
};
