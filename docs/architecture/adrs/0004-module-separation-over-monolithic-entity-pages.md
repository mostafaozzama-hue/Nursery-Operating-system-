# ADR-0004: Module Separation Over One Giant Entity Page

- **Status:** Accepted
- **Date:** 2026-07-19, reinforced through Sprint 12
- **Related:** [product-principles.md](../product-principles.md) principles 10, 25, 26, [design-system.md §9](../design-system.md#9-component-naming-conventions), [design-system.md §10](../design-system.md#10-reusable-page-patterns), [ADR-0002](./0002-payroll-independent-from-staff.md)

## Context

A childcare business's data is deeply interconnected: a Child relates to Guardians, Enrollment, Attendance, and (eventually) Invoices, Activities, and Medical records; a Staff member relates to a Classroom and (separately) Payroll. It would be technically possible to build one large "Person" or "Nursery Record" page/entity that surfaces everything about a child or staff member in a single undifferentiated view or a single database table with many nullable columns.

## Problem

Interconnected data invites exactly that temptation — a single mega-entity or mega-screen that shows "everything," which superficially satisfies [product-principles.md](../product-principles.md) principle 25 ("every module must integrate naturally with the others"). But it directly conflicts with several other standing principles: one primary action per screen (principle 8), progressive disclosure over information overload (principle 9), and the requirement that sensitive data get the narrowest access grant that still does the job (principle 19) — a mega-entity has no natural place to draw a permission boundary around just the Payroll fields, for instance.

## Decision

**Nursery OS is built as a set of separate, consistently-patterned modules** (Children, Guardians, Classrooms, Enrollment, Staff, Payroll, and every future domain), each with its own routes, its own `packages/contracts` namespace, its own `apps/web/lib/<module>` feature layer, and its own `apps/web/components/<module>` directory — the "four-way mirror" convention documented in [design-system.md §9](../design-system.md#9-component-naming-conventions). Cross-module connectivity happens at exactly one layer: a module's own Entity Detail page may *embed* a related module's data as a distinct, clearly-bounded section (Child Detail embeds Enrollment history and linked Guardians; Classroom Detail embeds its Children and Staff) — never by merging two modules' data models, permissions, or routes into one.

This is the same reasoning [ADR-0002](./0002-payroll-independent-from-staff.md) applies specifically to Payroll/Staff, generalized: connection happens at the **discoverability/UI layer** (a section on a detail page, a quick-link chip), never at the **data-coupling layer**, unless two concepts are genuinely one entity (as `ChildGuardian` genuinely is a relationship entity, not two merged ones).

## Alternatives considered

1. **One "Person" entity covering Staff, Guardian, and (via `User`) login identity.** Rejected: a person's role relative to the nursery (employee vs. guardian) carries fundamentally different fields, different lifecycle rules, and different permission boundaries (Staff's compensation data is OWNER/ADMIN-gated; Guardian data is not) — merging them would mean every field needs conditional relevance logic per "person type," reintroducing complexity a lookup-table `Role`-based module split avoids by construction.
2. **One large "Child 360" or "Staff 360" page assembling every related module inline by default**, rather than each module keeping its own list/detail/form pages. Rejected: this was explicitly considered and rejected in favor of the current Entity Detail pattern ([design-system.md §10.1](../design-system.md#101-entity-detail-page-pattern-target-spec)), which embeds related sections *selectively and only where cheap to compute* (principle 9's progressive disclosure), rather than assembling every conceivably-related fact by default — the difference between "Classroom Detail shows its Staff and Children because that's genuinely core to what a classroom is" versus "every page shows everything reachable within two hops."
3. **A generic, schema-driven CRUD framework** (one engine that renders list/detail/form for any entity from a config, rather than a hand-built module per domain). Rejected as premature: [design-system.md §2](../design-system.md#2-current-product-assessment) already notes the current seven modules are "well-built, structurally consistent" using a manually-applied shared pattern — a generic framework is the kind of abstraction principle 26 ("extend existing patterns before inventing new ones") warns against reaching for before the pattern has proven itself across enough modules to know what it must flex around (Staff/Payroll's split access model would be an awkward fit for a naive schema-driven CRUD engine).

## Consequences

**Positive:**
- Permission boundaries (Payroll's OWNER/ADMIN gate, per [ADR-0011](./0011-narrower-access-for-sensitive-modules.md)) map directly onto module boundaries — there is never a case where "half of this page's data needs a different permission check than the other half," because a page never spans two permission domains without an explicit, separate embedded section.
- New engineers (or a future AI-assisted contributor, per [vision.md](../vision.md)'s Phase 5) can reason about one module at a time — Staff's DTOs/repository/service/tests are a complete, self-contained unit, not entangled with Payroll's.
- The pattern scales to new modules without renegotiation: Attendance, Invoices, and every future domain in [feature-map.md](../feature-map.md) simply add another module following the same four-way mirror, rather than requiring a redesign of an ever-growing mega-entity.

**Trade-offs accepted:**
- Real duplication across modules (list/detail/form scaffolding, picker components — five near-duplicate picker implementations exist today, tracked as [ux-debt.md UXD-9](../ux-debt.md#uxd-9--five-near-duplicate-picker-component-implementations)) — an accepted, monitored cost, to be addressed by consolidating the *shared scaffolding* (a generic `EntityPicker`) without merging the *modules* themselves.
- Cross-module views (a true "everything about this family" screen) require deliberate composition work per screen, rather than falling out "for free" from a shared underlying entity — accepted because the alternative (one entity, conditional-everything) was rejected above for its permission and complexity costs.

## Future implications

- Every future module in [feature-map.md](../feature-map.md) (Attendance, Invoices, Activities, Medical, Learning) should default to this same module shape unless a documented reason says otherwise — a new module that doesn't fit the existing Entity Detail/List/Form patterns is a signal to extend the pattern deliberately (principle 26), not license for a one-off.
- The picker-consolidation work ([design-system.md §13](../design-system.md#13-cross-module-consistency-rules) rule 7) should reduce duplication *within* this architecture, not be used as a reason to start merging modules back together — consolidating shared UI scaffolding and preserving module/data boundaries are compatible, not competing, goals.
- If a genuine cross-module aggregate view is needed later (a family-level billing summary spanning multiple children, a branch-level staffing summary), it should be built as its own new, explicitly-scoped read model/screen — not by collapsing the modules it reads from.
