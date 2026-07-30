/** Waiver-specific 409: missing effectiveTo/reviewAnnually, missing reasonNote when reasonCode = OTHER, or bad effectiveTo ordering - evaluated against the entity, before or after a patch is applied. */
export class WaiverConflictError extends Error {}
