# ADR-0003: Child Is the Center of the Product

- **Status:** Accepted
- **Date:** 2026-07-19 (domain model), reaffirmed through every subsequent module
- **Related:** [domain-model.md](../domain-model.md), [vision.md](../vision.md), [product-principles.md](../product-principles.md) principle 25, [ADR-0012](./0012-enrollment-historized-not-mutable-status.md)

## Context

Nursery OS's mission ([vision.md](../vision.md)) is to run "enrollment, staffing, classrooms, attendance, learning, billing, and communication with parents" as one connected system. Every one of those domains — Enrollment, Attendance, Invoices, ChildGuardian, and eventually Activities/Meals/Medical/Learning — describes something that happens *to* or *around* a child. No domain in the current or planned model is meaningful independent of a child: a Classroom without children is an empty room; an Invoice exists only because a specific child is billed for; Attendance is meaningless without a child to check in.

## Problem

A multi-domain product needs an anchor — the one entity every other domain's foreign keys point toward, whose lifecycle (enrolled → active → withdrawn) other domains take their cues from. Without a deliberate choice, different modules could each pick their own anchor (Classroom-centric for Attendance, Guardian-centric for Billing), producing a system where "the same child" is reconstructed differently depending on which module you're standing in.

## Decision

**`Child` is the hub every other domain entity relates back to**, directly or by one hop: `Enrollment` (child ↔ classroom placement), `ChildGuardian` (child ↔ guardian relationship), `Attendance` (child ↔ daily presence), `Invoice` (child ↔ billing). `Classroom` and `Guardian` are real, independently-addressable entities in their own right (a Guardian exists as a contact record even if briefly between children; a Classroom exists as a room even between terms) — but every domain that *produces business value* in this product does so by describing something about a child.

This is why `Child` deliberately holds no classroom or enrollment-status field of its own ([domain-model.md](../domain-model.md)) — that data lives in `Enrollment` specifically so a child's placement *history*, not just current state, is preserved (see [ADR-0012](./0012-enrollment-historized-not-mutable-status.md)) — and why the Child Detail page is the one screen in the current product that already embeds two other modules' data inline (Enrollment history, linked Guardians), a pattern [design-system.md §10.1](../design-system.md#101-entity-detail-page-pattern-target-spec) generalizes to every entity detail page precisely because it worked first and best here.

## Alternatives considered

1. **Guardian-centric model** (the paying customer is the guardian; children are line items under a guardian's account). Rejected: this fits a pure billing system, but collapses the moment a child has multiple guardians with different billing responsibility, or a guardian has children across different classrooms/enrollment states — exactly the many-to-many reality `ChildGuardian` exists to model. It would also misalign the product from its own mission statement, which names "enrollment, staffing, classrooms, attendance" — none of which are naturally guardian-scoped.
2. **Enrollment-centric model** (a placement record is the anchor; Child is just a field on it). Rejected: this would make a child's existence contingent on having an active placement, which breaks the moment a child is on a waitlist with no classroom yet, or has been withdrawn but the business still needs their historical Attendance/Invoice records intact (per the soft-delete cascade policy in [domain-model.md](../domain-model.md), a withdrawn/removed child's history must remain fully queryable).
3. **Classroom-centric model** (a classroom's roster is the primary object; children are entries in it). Rejected: this is the paper-attendance-binder mental model the product is explicitly built to replace ([vision.md](../vision.md) problem #1) — a classroom is one point-in-time fact about a child, not the organizing structure for the child's whole record across enrollment history, guardians, attendance, and billing.

## Consequences

**Positive:**
- Every future domain module (Activities, Meals, Medical, Learning — all named in [feature-map.md](../feature-map.md)) has an unambiguous anchor to key off, without a new architectural decision each time.
- The Child Detail page's "embed related modules inline" pattern, proven first here, is the direct ancestor of [design-system.md §10.1](../design-system.md#101-entity-detail-page-pattern-target-spec)'s Entity Detail pattern applied to every other entity — this decision predates and shapes the design system, not the reverse.
- Supports the Parent App's eventual "view my child's profile, enrollment, attendance" experience ([feature-map.md — Parent App](../feature-map.md#parent-app)) as a natural query — a parent's view is simply "everything hanging off this Child," not a bespoke aggregation across differently-centered modules.

**Trade-offs accepted:**
- `Child` itself stays deliberately thin (`firstName`, `lastName`, `dateOfBirth`, `gender`, `photoUrl` — per [domain-model.md](../domain-model.md)) precisely because it's a hub, not a kitchen-sink record; any temptation to add a field to `Child` should be checked against "does this belong on a related entity instead" (as `classroomId`/`status` correctly do not live on `Child`, and instead live on `Enrollment`).
- Every new domain module inherits an implicit obligation: it should relate to `Child` in some traceable way, or a strong, explicit reason should be documented for why it doesn't (as `Payroll` explicitly does not relate to `Child` at all — it is Staff-centric, a deliberate exception, not an oversight).

## Future implications

- **Learning** (curriculum, milestones — [feature-map.md](../feature-map.md#learning)) and **Medical** ([feature-map.md](../feature-map.md#medical)) should both key primarily off `Child`, following this same anchor pattern, when they're eventually built — the domain model's deferred-entities table already anticipates this shape.
- The Parent App's entire information architecture ([user-journeys.md — Parent](../user-journeys.md#parent)) can be designed as "one Child, several tabs" (Attendance history, Activity feed, Billing) specifically because this decision already makes Child the natural query root — this is not a new design choice the Parent App has to make, it inherits it.
- If a future multi-branch model ever needs a child to be associated with a specific branch ([enterprise-roadmap.md §1](../enterprise-roadmap.md#1-multi-branch)), that association should attach to `Child` (or `Enrollment`, following the same "history, not overwrite" logic as classroom placement) rather than being inferred transitively through Guardian or Staff — keeping Child as the unambiguous anchor even as the tenant model grows a branch dimension.
