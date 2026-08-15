# ADR-0011: Sensitive Modules Get a Narrower Access Boundary Than the Default Read Pattern

- **Status:** Accepted
- **Date:** 2026-07-25 (Payroll), extending a precedent set for Membership
- **Related:** [ADR-0002](./0002-payroll-independent-from-staff.md), [product-principles.md](../product-principles.md) principles 18–19, [enterprise-roadmap.md §7](../enterprise-roadmap.md#7-permissions), [feature-map.md — Medical](../feature-map.md#medical)

## Context

Nursery OS's default access pattern, established across every domain module built so far (Children, Guardians, Classrooms, Enrollment, Staff), is that any authenticated tenant member — including a STAFF-role teacher — can *read* the module's data, while write/manage actions are typically broader (OWNER/ADMIN can manage, STAFF can usually still read). This default suits most domain data: a teacher reading a coworker's classroom assignment, or a child's enrollment status, carries no meaningful sensitivity risk.

Two modules break this default outright: `Membership` (`GET /memberships` is OWNER/ADMIN-only) and `Payroll` (OWNER/ADMIN-only for *both* read and write, per [ADR-0002](./0002-payroll-independent-from-staff.md)). Both carry data a typical organization restricts even from peers: who has administrative access to the tenant, and what a coworker is paid.

## Problem

Without a deliberate, named exception mechanism, the "STAFF can read most things" default would either (a) be violated silently and inconsistently, module by module, as sensitive data gets added over time, or (b) force every sensitive field into contortions to hide itself from an otherwise-permitted read (field-level redaction scattered through response serialization, easy to get wrong once — see [ADR-0002](./0002-payroll-independent-from-staff.md)'s Alternative 1). Nursery OS also has more sensitive modules coming (Medical Records, explicitly flagged in the domain model as needing "fine-grained permissions... not just roles"), and each shouldn't have to independently rediscover how to handle this.

## Decision

**Sensitive, HR-adjacent, or otherwise narrowly-scoped data gets its own module with a route-level `@Roles('OWNER', 'ADMIN')` guard covering every operation, including read — never a field-level redaction within an otherwise STAFF-readable response.** `Membership` established this first; `Payroll` is the second, deliberate application of the identical pattern. This directly implements [product-principles.md](../product-principles.md) principle 19: "Sensitive data (payroll, medical, financial) gets the narrowest access grant that still lets the job get done — not 'everyone with admin access sees everything.'"

Critically, this is enforced **server-side, at the controller**, per principle 18 ("Role-based access is enforced server-side, never assumed from UI hiding") — the frontend's role-conditional rendering (e.g. `apps/web/lib/navigation.ts`'s `roles: ['OWNER', 'ADMIN']` on the Payroll nav item, `DashboardShell`'s role-based filtering) is a UX courtesy that mirrors, but never substitutes for, the actual API-level guard.

The underlying `Role` table is deliberately a **lookup table, not a native database enum** — a choice the domain model states was made specifically "to make [custom roles] additive later" ([enterprise-roadmap.md §7](../enterprise-roadmap.md#7-permissions)) — meaning today's fixed OWNER/ADMIN/STAFF three-tier model is itself a known, temporary simplification, not a permanent ceiling.

## Alternatives considered

1. **Field-level redaction within a shared response** (serialize a Staff object with compensation fields present, but strip them for non-privileged viewers). Rejected — already addressed in [ADR-0002](./0002-payroll-independent-from-staff.md): this requires every response-building code path to remember to redact correctly, a much easier mistake to make than a route guard that fails closed.
2. **Build a full fine-grained `Permission`/`RolePermission` model now**, rather than the current fixed three-role gate, so sensitive-module access could be configured per-tenant rather than hardcoded. Rejected as premature: [enterprise-roadmap.md §7](../enterprise-roadmap.md#7-permissions) explicitly defers this to Enterprise-phase, "Phase 2 of Identity's RBAC" — with only Membership and Payroll as real data points so far, building a general permission system now risks designing it against too few real cases (the same premature-abstraction reasoning as [ADR-0002](./0002-payroll-independent-from-staff.md) Alternative 2).
3. **Extend STAFF read access to Payroll but hide the UI for STAFF users.** Rejected outright — directly violates principle 18; a STAFF user could trivially read the underlying API response with any HTTP client regardless of what the UI shows.

## Consequences

**Positive:**
- A consistent, recognizable pattern now exists for "this module is sensitive" — the next sensitive module (Medical Records) has a concrete precedent to extend rather than a decision to make from scratch, and the domain model already names this precedent explicitly as the template to follow.
- Zero-trust-by-default for sensitive data: a STAFF-role request to a sensitive endpoint fails at the guard, before any business logic or data access happens — there is no code path where sensitive data is fetched and then conditionally withheld.
- The fixed three-role model, while a known simplification, is at least *consistently and predictably* known — every module's access boundary is one of exactly two shapes (STAFF-readable, or OWNER/ADMIN-only), not a spectrum of bespoke per-module rules.

**Trade-offs accepted:**
- No nuance below "OWNER/ADMIN vs. everyone else" exists yet — a scenario like "a designated Payroll-processing STAFF member who isn't otherwise an ADMIN" cannot be expressed today, and must wait for the real `Permission` model ([enterprise-roadmap.md §7](../enterprise-roadmap.md#7-permissions)).
- An employee cannot see even their *own* Payroll record through this module today (the gate is role-based, not "OWNER/ADMIN or the record's own subject") — a real, currently-accepted limitation, not yet flagged for a near-term fix, but worth surfacing if a customer request makes it a live product question.

## Future implications

- **Medical Records** ([feature-map.md — Medical](../feature-map.md#medical)) is explicitly named as the next module expected to need this treatment, and is explicitly gated on the real `Permission` model landing first ("do not build Medical Records against the current three-tier role model as a stopgap" — [enterprise-roadmap.md §7](../enterprise-roadmap.md#7-permissions)) — meaning this ADR's pattern is a *bridge*, not the final intended shape, for that specific module.
- When the `Permission`/`RolePermission` model is eventually built, Membership and Payroll's current hardcoded `@Roles('OWNER', 'ADMIN')` gates are the concrete migration target — they should become configurable permission checks expressing the same *default* boundary, not be weakened in the process.
- View-level audit logging (who *read* a sensitive record, not just who changed it) is flagged in [enterprise-roadmap.md §8](../enterprise-roadmap.md#8-auditing) as required specifically for the sensitive modules this ADR covers — a natural next hardening step once `AuditLog` exists, not required for the current OWNER/ADMIN gate to be meaningful on its own.
