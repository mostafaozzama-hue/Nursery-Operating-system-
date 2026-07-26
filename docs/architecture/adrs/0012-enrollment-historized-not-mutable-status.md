# ADR-0012: Enrollment Is Historized, Never a Mutable Status Field on Child

- **Status:** Accepted
- **Date:** 2026-07-19
- **Related:** [domain-model.md](../domain-model.md), [product-principles.md](../product-principles.md) principle 14, [ADR-0003](./0003-child-is-the-center-of-the-product.md)

## Context

A child's placement in the nursery changes over time: waitlisted, then active in a classroom, possibly transferred to another classroom, eventually withdrawn. The simplest possible data model would store this as a `status` and `classroomId` field directly on `Child`, updated in place each time something changes.

## Problem

A mutable "current status" field answers only "what is true right now" and destroys the answer to "what was true last month" the moment it's overwritten. For a business record (a family's enrollment history, a capacity dispute, a billing question tied to "was this child enrolled during this period") and, in some jurisdictions, for regulatory purposes, "what did this record say historically" is not an optional nice-to-have — [product-principles.md](../product-principles.md) principle 14 states it plainly: "Money and attendance records are historized, never overwritten silently... the business (and in some jurisdictions, the regulator) must be able to answer 'what did this record say last month,' not just 'what does it say now.'" Enrollment is the placement-history equivalent of that same requirement.

## Decision

**`Enrollment` is its own historized entity** — one row per placement period, carrying `status` (`WAITLISTED`/`ACTIVE`/`WITHDRAWN`), `classroomId`, `startDate`, `endDate` (nullable = currently open), and `created_reason`/`ended_reason`. `Child` itself holds **no** classroom or enrollment-status field at all ([domain-model.md](../domain-model.md)): a child's *current* placement is derived by querying for the `Enrollment` row with `endDate IS NULL`, never stored redundantly on `Child`. Creating a new placement requires closing (`endDate`) the previous open one first — enrollment transitions never overlap silently.

## Alternatives considered

1. **Store `status`/`classroomId` directly on `Child`, updated in place.** Rejected: this is exactly the "overwritten silently" pattern principle 14 prohibits — a transfer or withdrawal would destroy the only record of where a child was placed before, with no way to answer "which classroom was this child in during March" a month later.
2. **Store current state on `Child` *and* maintain a separate history log for audit purposes** (denormalized for read convenience, historized for audit). Rejected: this introduces a dual-write consistency problem (the denormalized current-state field and the history log can drift out of sync) for a benefit — faster reads of "current classroom" — that a straightforward query against `Enrollment` (`WHERE endDate IS NULL`) already provides without the drift risk. [domain-model.md](../domain-model.md)'s business invariants explicitly enforce "one active enrollment per child" as a partial unique index specifically so this query is always cheap and unambiguous.
3. **Model placement as an event log only** (append-only events: `ENROLLED`, `TRANSFERRED`, `WITHDRAWN`, with current state derived by replaying events). Rejected as unnecessary complexity for this use case: the chosen model (discrete `Enrollment` periods with explicit `startDate`/`endDate`) already captures the same historical fidelity with a simpler query shape (one row per period, rather than reconstructing state from an event stream) — event-sourcing's added complexity would need to earn its keep against a real requirement (e.g. needing to replay/audit every micro-transition), which doesn't currently exist here.

## Consequences

**Positive:**
- A family's full placement history survives every future transfer, withdrawal, or even the child record's own soft-deletion — the soft-delete cascade policy ([domain-model.md](../domain-model.md)) explicitly confirms soft-deleting a `Child` never touches its `Enrollment` rows.
- Enrollment is, per [design-system.md §14](../design-system.md#14-module-by-module-audit-against-this-system), "the best-structured workflow in the app" specifically because the state-machine-driven Enroll/Transfer/Withdraw actions map cleanly onto opening and closing historized periods — a mutable-status model would have made Transfer's "exclude the current classroom" picker logic and the underlying business rule far harder to express correctly.
- Directly enables the waitlist-to-admission conversion tracking planned for Phase 2 CRM/Admissions work ([feature-map.md — Admissions](../feature-map.md#admissions)) — a `WAITLISTED` → `ACTIVE` transition is naturally just another Enrollment period boundary, not a special case to invent later.

**Trade-offs accepted:**
- "What is this child's current classroom" requires a query (find the open `Enrollment` row), not a direct field read — a small, accepted cost, mitigated by the partial unique index guaranteeing at most one such row exists per child.
- No standalone Enrollment list/waitlist view exists yet in the frontend (flagged in [design-system.md §11](../design-system.md#11-navigation--information-architecture)) — a frontend gap, not a data-model one; the historized model already supports building that view whenever it's prioritized.

## Future implications

- Any future placement-adjacent concept (a Transportation route assignment, a future Shift/scheduling record — both named as deferred in [domain-model.md](../domain-model.md)) should default to this same "historized period, never an overwritten current-state field" pattern wherever the business needs to answer "what was true as of a past date," following the precedent Enrollment and Attendance (`checkedInBy`/`checkedOutBy` as dedicated, written-once references) both already establish.
- A DB-level exclusion constraint preventing overlapping enrollment periods is explicitly named as a possible future hardening ([domain-model.md](../domain-model.md)) if the application-layer "close the previous one first" rule ever proves error-prone in practice — not built now, but a known, specific next step rather than an open question.
- Payroll's deliberately *opposite* choice — a single mutable record, no history retained on change ([feature-map.md — Payroll](../feature-map.md#payroll)) — is a conscious, documented departure from this pattern for that specific module, revisited only if a real "raise history" need emerges; it does not weaken this ADR's default for placement/attendance-style records, it is an explicitly scoped exception.
