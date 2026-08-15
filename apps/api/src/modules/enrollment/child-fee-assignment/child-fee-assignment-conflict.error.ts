/** ChildFeeAssignment-specific 409: inactive Fee, duplicate open assignment, bad effectiveTo ordering, or a lost close-race. */
export class ChildFeeAssignmentConflictError extends Error {}
