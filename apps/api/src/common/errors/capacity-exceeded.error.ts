/**
 * Thrown by CapacityService when a classroom has no seats left - the single
 * centralized capacity-counting rule (domain-model.md's Business
 * invariants). Shared across every module that validates capacity
 * (EnrollmentService today; EnrollmentBillingTermsService later), each
 * translating it to a 409 the same way.
 */
export class CapacityExceededError extends Error {}
