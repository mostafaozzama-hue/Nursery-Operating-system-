# ADR-0006: MVP Optimized for Small Nurseries, Enterprise-Compatible by Construction

- **Status:** Accepted
- **Date:** 2026-07-19 (vision), reaffirmed in [pricing-strategy.md](../pricing-strategy.md) and [roadmap.md](../roadmap.md)
- **Related:** [vision.md](../vision.md), [product-principles.md](../product-principles.md) principle 27, [pricing-strategy.md](../pricing-strategy.md), [feature-map.md](../feature-map.md), [enterprise-roadmap.md](../enterprise-roadmap.md)

## Context

[vision.md](../vision.md) names three target customer sizes — small nursery/home daycare (5–20 children), medium nursery (20–100), and enterprise/chain (100+) — served, deliberately, "by the same product without redesigning it per tier." The MVP build sequence ([roadmap.md](../roadmap.md) Phase 1) targets the smallest segment's complete daily operation first: Children, Guardians, Classrooms, Enrollment, Staff (without Payroll), Attendance, and manual Billing/Payments — everything a 5–20-child owner-operator needs, nothing a larger org needs beyond that.

## Problem

A product can optimize for its smallest customer in a way that makes growth painful (no path to multi-branch, no permission model beyond "the owner does everything"), or it can build enterprise-scale architecture speculatively before any customer needs it, delaying the small-nursery MVP that generates the first real revenue and validates the product at all. Most competitors, per [vision.md](../vision.md)'s competitive analysis, solve this by shipping *segmented* products — a "lite" tool and a separate "enterprise" tool — which the vision document explicitly names as a problem to avoid ("no path from small to enterprise").

## Decision

**Build the smallest segment's needs first, but never in a way that requires a re-platform to serve the largest.** Concretely:
- **One codebase, one architecture, three pricing plans** ([pricing-strategy.md](../pricing-strategy.md)) — Starter/Professional/Enterprise are permission and feature-flag differences, never different software (per [product-principles.md](../product-principles.md) principle 27 and pricing principle 1).
- Foundational architecture decisions are made enterprise-compatible *from day one*, even while the feature work targets small nurseries first: multi-tenant RLS isolation ([ADR-0007](./0007-multi-tenant-architecture.md)) works identically whether a tenant has 8 children or 800; `TenantMembership`'s one-active-membership-per-user rule is enforced at the application layer rather than a DB constraint specifically "leaving room for multi-tenant membership later without a schema change" ([domain-model.md](../domain-model.md)); the `Role` lookup table (not a native enum) exists specifically to make custom Enterprise-tier permissions additive later ([enterprise-roadmap.md §7](../enterprise-roadmap.md#7-permissions)).
- Enterprise-specific *feature* work (Multi-Branch, custom permissions, Medical/Learning modules) is deliberately sequenced last ([roadmap.md](../roadmap.md) Phase 4), gated on real architectural prerequisites documented in [enterprise-roadmap.md](../enterprise-roadmap.md) — not built speculatively ahead of a validated need.

## Alternatives considered

1. **Build a "lite" MVP product and a separate "enterprise" product**, the pattern [vision.md](../vision.md) explicitly names as the incumbent failure mode. Rejected outright — this is the single most direct anti-pattern named in the product's own positioning statement; building it here would mean copying the exact problem the product exists to avoid.
2. **Build enterprise architecture first** (multi-branch, custom permissions, server-side aggregation) before shipping any small-nursery-facing feature. Rejected: [roadmap.md](../roadmap.md)'s sequencing rationale explicitly prioritizes shipping value already sitting idle (Attendance/Billing backends complete, no frontend — see [ADR-0015](./0015-backend-complete-modules-prioritized-for-frontend.md)) over speculative scale work with no current customer to validate it against — "premature... infrastructure would add operational complexity with no current customer benefit" ([enterprise-roadmap.md §6](../enterprise-roadmap.md#6-scalability)).
3. **Ignore enterprise scaling concerns entirely until a large customer actually appears**, treating today's small-nursery-scale assumptions (100-record directory-hook page size, client-side dashboard aggregation) as permanent rather than documented, bounded tradeoffs. Rejected: every current scale-limiting decision (directory hooks, client-side aggregation) is explicitly logged as a known boundary in [design-system.md §17](../design-system.md#17-future-enterprise-considerations) and [enterprise-roadmap.md §5](../enterprise-roadmap.md#5-performance) precisely so it isn't forgotten or discovered painfully in production once an Enterprise customer's roster crosses the threshold.

## Consequences

**Positive:**
- The same Staff/Payroll/Classroom/Enrollment modules built for a Starter customer today will be the exact modules an Enterprise customer uses tomorrow, just with more permission granularity and a Branch dimension layered on — no rewrite, matching principle 27 verbatim.
- Enables honest, incremental go-to-market: revenue and product validation can start with the smallest, fastest-to-close segment while the architecture underneath already anticipates the largest segment's eventual needs.
- Every "we'll deal with that at enterprise scale" deferral (directory hooks, client-side aggregation, fixed three-role model) is a *named, tracked* deferral with a documented trigger condition (per [enterprise-roadmap.md](../enterprise-roadmap.md)), not silent technical debt discovered under production load.

**Trade-offs accepted:**
- Some near-term engineering effort goes into scaffolding that has no current customer benefit (RLS enforcement is meaningful even for a single-tenant MVP customer only in that it's *already correct* when tenant count grows — there's no "simple mode" version of it to build faster first).
- Enterprise customers evaluating the product today will find genuine gaps (no multi-branch, no custom roles, client-side-aggregated dashboard) — an accepted cost, since [pricing-strategy.md](../pricing-strategy.md) explicitly does not target closing enterprise deals during Phase 1.

## Future implications

- Every new module built from here forward should ask the same question this ADR encodes: does this feature's *architecture* need to anticipate Enterprise scale now (even if the *feature* itself targets Starter/Professional customers first)? [enterprise-roadmap.md](../enterprise-roadmap.md) is the living answer key for which architectural prerequisites (Permissions, Branch model, AuditLog) must land before which Enterprise features, and in what order.
- When a real Enterprise customer's requirements first surface (a second branch, a custom role need), [enterprise-roadmap.md §1/§2](../enterprise-roadmap.md#1-multi-branch)'s explicit sequencing (Permissions → Branch model → everything else) should govern the build order — not whichever Enterprise feature is requested first.
- If a future decision ever requires *actually* forking the codebase or maintaining two deployable variants for different tiers, that would directly reverse this ADR and principle 27 — it should be treated as a major, explicitly-flagged architectural regression requiring its own ADR, not a routine implementation choice.
