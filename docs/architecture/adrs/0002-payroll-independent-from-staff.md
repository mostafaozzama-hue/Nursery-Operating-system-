# ADR-0002: Payroll Is a Fully Independent Module from Staff

- **Status:** Accepted
- **Date:** 2026-07-25
- **Related:** [ADR-0001](./0001-staff-owns-employee-profile.md), [ADR-0011](./0011-narrower-access-for-sensitive-modules.md), [feature-map.md — Payroll](../feature-map.md#payroll), [pricing-strategy.md](../pricing-strategy.md), [product-principles.md](../product-principles.md) principles 18–19, [enterprise-roadmap.md §7](../enterprise-roadmap.md#7-permissions)

## Context

Every staff member's employment record (`Staff`) is readable by any authenticated tenant member, including STAFF-role users — a teacher can see their coworkers' positions, hire dates, and classroom assignments, the same as an Owner can. Compensation data (pay type, rate, frequency, currency, effective date) is a fundamentally different sensitivity class: it is HR-adjacent financial data that most organizations restrict even from the employee's own peers, and in many cases from the employee's own direct manager.

Nursery OS also prices Payroll as a Professional-tier-only capability ([pricing-strategy.md](../pricing-strategy.md)): a Starter-plan small nursery gets Staff profiles without Payroll, on the reasoning that a 5–20-child home daycare typically pays staff informally (cash, no formal payroll record) and shouldn't be forced to interact with a compensation module it doesn't need.

## Problem

Should compensation data live as fields on `Staff` (simplest data model, one entity to query), or as its own entity/module with its own routes, contracts, and permission boundary? The choice determines whether every future Staff-reading surface (Staff list, Classroom roster, a future Teacher App) has to reason about who's allowed to see which *fields* of one object, versus reasoning about which *modules* a role can access at all.

## Decision

**Payroll is a fully separate module** (`StaffPayroll` as its own Prisma model, own migration, own NestJS module/controller/service/repository/DTOs, own `packages/contracts` namespace, own `apps/web` routes/components/lib layer) — linked to `Staff` only by `staffId`, with no shared routes, contracts, or UI beyond a deliberate, optional cross-module "quick-link" chip on Staff Detail (UI convenience, not data coupling, per [design-system.md §11](../design-system.md#11-navigation--information-architecture)).

The `PayrollController` is gated `@Roles('OWNER', 'ADMIN')` for **every** operation, including read — unlike every other domain module, where STAFF gets at least read access. This is the same boundary already established for `Membership` (`GET /memberships` is OWNER/ADMIN-only), applied here for the first time to compensation data specifically.

## Alternatives considered

1. **Add `payRate`/`payType`/etc. as nullable fields directly on `Staff`.** Rejected: this would force every Staff-reading code path (including STAFF-role users reading their coworkers' profiles) to reason about field-level redaction rather than a clean module boundary — a much easier mistake to make (one forgotten `select` clause leaks compensation data) than a route-level `@Roles` guard that fails closed by construction.
2. **A generic "sensitive fields" flag/mechanism on any entity, rather than a dedicated module per sensitive domain.** Rejected as premature abstraction: Payroll is the first sensitive-data module Nursery OS has built (the same pattern was established one module earlier for `Membership`); building a generic field-level permission system now, before Medical Records ([feature-map.md](../feature-map.md#medical)) — the next sensitive module — exists to validate the abstraction against a second real case, risks over-engineering against one data point. [enterprise-roadmap.md §7](../enterprise-roadmap.md#7-permissions) explicitly defers a real `Permission`/`RolePermission` model to Enterprise-phase, once a second and third case exist to design against.
3. **Gate Payroll behind role-based UI-hiding only, keep it in the same API responses as Staff.** Rejected outright: [product-principles.md](../product-principles.md) principle 18 ("Role-based access is enforced server-side, never assumed from UI hiding") makes this a non-option regardless of module boundary — the same principle that shaped the `@Roles` guard's placement on the controller, not the frontend.

## Consequences

**Positive:**
- A STAFF-role user's Staff list/detail requests never even touch Payroll data — `useMembershipDirectory`-style gating (`useStaffDirectory` has no Payroll-equivalent leak path) means there is no code path where a lower-privileged viewer's request needs to filter out fields it shouldn't see; the data simply isn't in the response shape it can request.
- Payroll can be withheld entirely at the Starter pricing tier ([pricing-strategy.md](../pricing-strategy.md)) as a clean module toggle, not a field-visibility toggle — consistent with principle 27's "plan-gated features, never a re-platform."
- The isolation is legible to a non-technical business stakeholder: "Payroll is its own locked room" is an easy sentence to say to a customer or auditor; "certain fields on the Staff object are redacted for certain roles" is not.

**Trade-offs accepted:**
- Real duplication of module scaffolding: Payroll's DTOs/repository/service/module structure closely mirrors Staff's, file-for-file — an accepted cost of the isolation, not a sign the modules should be merged (per [product-principles.md](../product-principles.md) principle 26, extending an established pattern rather than inventing a one-off).
- A `staffId` foreign key is the only coupling point; if the eventual `EntityPicker` consolidation ([design-system.md §13](../design-system.md#13-cross-module-consistency-rules) rule 7) or a future analytics feature needs "Staff + Payroll" joined data, that join has to be built explicitly rather than falling out of a single query — an accepted cost of the boundary being real rather than cosmetic.

## Future implications

- **Medical Records** ([feature-map.md](../feature-map.md#medical)) is the next module expected to need this same treatment — the domain model already flags it as needing "fine-grained permissions... not just roles," and this ADR's OWNER/ADMIN-only-for-both-read-and-write pattern is the concrete precedent it should extend, pending the real `Permission` model in [enterprise-roadmap.md §7](../enterprise-roadmap.md#7-permissions).
- Payroll's currently mutable, non-historized record (see [feature-map.md — Payroll](../feature-map.md#payroll)) is a separate, deliberate MVP tradeoff — revisit *that* decision independently of this one when "payroll history/versioning" becomes an Enterprise-tier requirement; it does not change the module-isolation decision made here.
- If a future Payroll export/integration (accounting system, bank-transfer file) is built, it should authenticate and scope through this same module boundary — never through a side-channel query directly against `Staff` plus a joined Payroll table that bypasses the `@Roles('OWNER', 'ADMIN')` guard.
