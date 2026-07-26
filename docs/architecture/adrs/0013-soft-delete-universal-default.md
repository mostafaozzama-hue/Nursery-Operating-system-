# ADR-0013: Soft-Delete Is the Universal Default, Never Hard-Delete

- **Status:** Accepted
- **Date:** 2026-07-19
- **Related:** [domain-model.md](../domain-model.md), [product-principles.md](../product-principles.md) principle 11, [enterprise-roadmap.md §9](../enterprise-roadmap.md#9-compliance)

## Context

Every domain table in Nursery OS (Children, Guardians, Classrooms, Staff, Enrollment, and every subsequent module) carries `deletedAt`/`deletedBy` columns. "Removing" a record through the product's UI (Remove Guardian, Withdraw a Staff member) never issues a SQL `DELETE` — it sets `deletedAt`, and every application query filters `WHERE deletedAt IS NULL` by default.

## Problem

A childcare product handles records where an accidental or premature deletion is genuinely costly: a misclicked "Remove Guardian" could sever a family's contact history; a soft-deleted `Classroom` still needs to leave every historical `Enrollment`/`Attendance` row that referenced it intact and legible. A hard-delete default would make every one of these actions a one-way door — recoverable only from a database backup, if at all, and never through the product itself.

## Decision

**Nothing important is ever hard-deleted.** Every domain table's "delete" action is an application-level `UPDATE` setting `deletedAt`/`deletedBy`, never a SQL `DELETE` — and, critically, this **never cascades physically** to related rows ([domain-model.md](../domain-model.md)'s Soft-delete cascade policy): soft-deleting a `Classroom` does not touch existing `Enrollment`/`Attendance` rows referencing it; soft-deleting a `Guardian` does not touch `ChildGuardian`/`Invoice` rows; soft-deleting a `Child` leaves its entire historical record (`Enrollment`, `Attendance`, `ChildGuardian`, `Invoice`) fully intact and queryable. This directly implements [product-principles.md](../product-principles.md) principle 11: "nothing important should be one misclick from gone forever."

The one documented exception in the current model is `User` — "no hard-delete of users" is stated as an existing Identity-module principle this domain model explicitly continues, not a new carve-out.

## Alternatives considered

1. **Hard-delete with a confirmation dialog as the only safeguard.** Rejected: a confirmation dialog protects against *accidental* clicks, but not against a legitimate, deliberate deletion that later turns out to have been the wrong call (a Guardian removed in error, discovered a week later) — at that point a hard-delete has already destroyed the only record, with no product-level recovery path. [product-principles.md](../product-principles.md) principle 12 (confirmation for destructive actions) and principle 11 (recoverability) are both required together; neither substitutes for the other.
2. **Soft-delete with cascading soft-delete to related rows** (soft-deleting a `Classroom` also soft-deletes its `Enrollment`/`Attendance` history). Rejected: this would make historical records disappear from view the moment their parent is removed — exactly the "who was in this classroom last year" question a licensing audit or a billing dispute might need answered *after* the classroom itself has closed. [domain-model.md](../domain-model.md) is explicit that "nothing referencing a soft-deleted row is deleted, altered, or hidden as a side effect."
3. **A generic, time-boxed "trash" with automatic hard-deletion after N days** (a compromise between full recoverability and eventual real cleanup). Rejected for now: no current requirement drives a retention-period policy, and inventing one speculatively (what's the right N? does it vary by table, by jurisdiction?) would be exactly the kind of unrequested complexity [product-principles.md](../product-principles.md) and the codebase's general engineering discipline advise against building ahead of a validated need — see Future implications below for where this tension is expected to resurface.

## Consequences

**Positive:**
- Every "remove" action in the product is genuinely low-stakes to the user — a mistaken removal is recoverable (today: by a developer/support action restoring `deletedAt` to null; a future self-service "restore" UI is a natural, additive feature on top of data that already supports it).
- Historical reporting (a licensing audit's attendance-ratio report, a billing dispute's "was this child enrolled during this period") is never at risk of the underlying data having been destroyed by an unrelated later cleanup action.
- The pattern is completely uniform across every table — a developer or contributor never has to check "does this table hard-delete or soft-delete" per-module; the answer is always the same.

**Trade-offs accepted:**
- Tables grow monotonically — soft-deleted rows are never purged, which is an accepted, currently-unaddressed storage/performance cost that would need a real archival strategy at sufficient scale (not yet a problem at current data volumes, and not solved speculatively per the reasoning above).
- Every application query must remember to filter `deletedAt IS NULL` — Postgres does not do this automatically ([domain-model.md](../domain-model.md) explicitly flags this as a discipline requirement, not something the database enforces on its own) — an ongoing code-review responsibility, similar in kind to the tenant-scoping discipline [ADR-0007](./0007-multi-tenant-architecture.md) backstops with RLS, but with no equivalent database-level backstop for soft-delete filtering today.

## Future implications

- [enterprise-roadmap.md §9](../enterprise-roadmap.md#9-compliance) already flags a genuine future tension this ADR creates: some jurisdictions' data-protection frameworks grant a parent the right to request *permanent* erasure of their child's data, which is in direct conflict with "nothing important is ever hard-deleted." This is named as "a genuine open design question to resolve before Medical or other highly sensitive modules collect data subject to such requirements" — not something the current architecture already answers, and not something this ADR should be read as having silently resolved in favor of recoverability over erasure rights.
- An `AuditLog` (deferred, but recommended to be pulled forward alongside whichever of Medical Records/Incidents ships first — [enterprise-roadmap.md §8](../enterprise-roadmap.md#8-auditing)) would complement, not replace, soft-delete: soft-delete answers "can this record be recovered," an audit log would answer "who deleted it and when," which `deletedBy`/`deletedAt` alone only partially cover (they record the *fact*, not a full access/change history).
- Any future module handling data with its own legal retention/erasure requirements should treat this ADR's default as a starting point to be explicitly reconciled with those requirements — not silently overridden, and not assumed to already have an answer baked in.
