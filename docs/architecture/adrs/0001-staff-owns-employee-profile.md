# ADR-0001: Staff Owns the Employee Profile

- **Status:** Accepted
- **Date:** 2026-07-25 (superseding an earlier, narrower design from the same date — see Consequences)
- **Related:** [feature-map.md — Staff](../feature-map.md#staff), [domain-model.md](../domain-model.md), [ADR-0002](./0002-payroll-independent-from-staff.md)

## Context

Nursery OS models three kinds of people who can be tenant-scoped: `Guardian` (a parent/contact), `Staff` (an employee), and `User` (a global login identity, shared across tenants, carrying only `email` and a password hash — no name, no profile data of any kind). A `Staff` row may optionally link to a `User` via `userId` when that employee needs portal access, but the link is nullable: many staff members (a part-time assistant with no need to log in) never get one.

The product needs a single, unambiguous place that answers "who is this employee" — a name to show on every Staff list row, detail page, classroom roster, and (once built) attendance/payroll screen.

## Problem

Two entities could plausibly "own" an employee's identity: `User` (already exists, already the login mechanism) or `Staff` (the tenant-scoped employment record). Whichever one owns the name becomes the system's source of truth for "who is this person" everywhere an employee is displayed — get this wrong and every downstream screen (Staff list, Classroom roster, Payroll, future Attendance/Teacher App) inherits either a dead end (no `User` linked → no name) or an awkward coupling (identity depends on optional login state).

An earlier iteration of Staff resolved identity through `userId → TenantMembership.email`, falling back to `position`, then a neutral "Staff record" placeholder, specifically because `User` had no name field and Staff was deliberately built with zero required fields. This worked, but it meant an employee with no portal access — the common case for a home daycare's helper, or any staff member the owner hasn't gotten around to inviting yet — had no real name anywhere in the system, only a job title or a placeholder string.

## Decision

**`Staff` owns `firstName`/`lastName` directly, as required fields.** Identity resolution no longer depends on an optional `User` link, `TenantMembership` lookup, or a fallback chain. Every Staff record has a real name from the moment it's created, independent of whether that person ever gets portal access.

This mirrors the pattern already established for `Guardian` (which also carries its own `firstName`/`lastName` independent of its optional `userId` link, per [domain-model.md](../domain-model.md)) and for `Child`. `User` remains what it has always been: a global, cross-tenant login credential with no profile data — authentication identity and human identity are different concerns, and only `User` conflating them would have been the actual anomaly.

## Alternatives considered

1. **Add `name` to `User` instead.** Rejected: `User` is explicitly not tenant-owned (per [ADR-0001 (technical)](../../adr/0001-core-platform-architecture.md) and the domain model) — it represents login capability, shared globally. A name on `User` would answer "what does this login call itself," not "who does this tenant employ," and would do nothing for the (common) Staff record with no linked `User` at all.
2. **Keep the original design** (identity via `userId → TenantMembership.email`, falling back to position/placeholder). Rejected after real use: it made "who is this employee" a conditional, sometimes-unanswerable question, and it coupled a basic display concern (a name) to `Membership`'s read permissions — meaning a STAFF-role viewer, who cannot read `Membership` at all, saw a *different, lesser* identity for the exact same coworker than an OWNER did. A name shouldn't be permission-gated.
3. **Require Staff to always link a `User`, and source the name from an invite flow that collects it once.** Rejected: this would force every staff member through a portal-invite step before they could even be entered into the system, directly contradicting the standing design (Staff's own `CreateStaffDto` comment: "a bare Staff row... is a legitimate state") and the product's small-nursery-first sequencing (a home daycare owner should be able to list "Fatima, lead teacher" without first setting her up with a login).

## Consequences

**Positive:**
- Every Staff record has a real, permission-independent name — the Staff list, Classroom roster, and Payroll's staff picker all display the same identity regardless of viewer role or portal-link status.
- Removes a whole class of role-dependent-content bugs: previously, STAFF and OWNER viewers of the exact same record could see different "identity" values depending on `Membership`-read access. Now everyone sees the same name.
- Simplifies every downstream consumer (Payroll's `useStaffDirectory`, `ClassroomStaffSection`) — they read `staffFullName(staff)`, a pure function of two required fields, with no directory join required at all for the common case of just showing a name.

**Trade-offs accepted:**
- This is a schema change to an already-built module: existing (if any) Staff rows with no name need backfilling. In the current dev environment this was a non-issue (zero Staff rows existed at migration time), but the migration itself (`ADD COLUMN first_name TEXT NOT NULL` with no default) is unsafe to run against a populated table — a real constraint on when/how this ships to any environment with live Staff data.
- Two name-bearing entities (`Child`, `Guardian`) already existed before this decision; `Staff` becoming the third reinforces a pattern but does mean "name" is now duplicated per-tenant-scoped-person-entity rather than centralized once on `User` — an accepted trade-off, since centralizing it on `User` was already rejected in Alternative 1 for the tenant-ownership reason above.

## Future implications

- Any future entity representing a real person within a tenant (a future `Guardian`-adjacent "Emergency Contact," a future `Driver` for Transportation) should follow this same precedent: name lives on the tenant-scoped entity, never inferred from an optional `User` link.
- The Staff-document-storage feature (Professional tier, [feature-map.md](../feature-map.md#staff)) and any future Teacher App roster view can now assume a name is always present — no "Staff record" placeholder-handling code needs to exist in any new consumer.
- If `Staff`/`Guardian`/`Child` naming conventions ever diverge (e.g. one entity needs a middle name, a preferred name, or a name in a second script for RTL/localization — see [ADR-0010](./0010-arabic-rtl-foundational-not-bolted-on.md)), that divergence should be resolved consistently across all three, not patched into just one.
