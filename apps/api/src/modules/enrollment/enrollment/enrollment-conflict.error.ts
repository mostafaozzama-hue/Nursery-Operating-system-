/** Enrollment-specific 409 cases: already closed, same-classroom transfer. Capacity conflicts are CapacityExceededError, not this. */
export class EnrollmentConflictError extends Error {}
