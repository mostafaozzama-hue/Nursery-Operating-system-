# ADR-0007: Multi-Tenant Architecture as the Business Model's Foundation

- **Status:** Accepted
- **Date:** 2026-07-18
- **Related:** [technical ADR-0001: Core Platform Architecture](../../adr/0001-core-platform-architecture.md) (the enforcement mechanism this ADR depends on), [domain-model.md](../domain-model.md), [vision.md](../vision.md), [product-principles.md](../product-principles.md) principle 17, [enterprise-roadmap.md §1–2](../enterprise-roadmap.md#1-multi-branch)

## Context

Nursery OS is sold as software-as-a-service to many independent nursery businesses ("tenants") — from a single 10-child home daycare to a multi-branch enterprise chain ([vision.md](../vision.md)). Each tenant's data (its children, guardians, staff, financials) is commercially and legally sensitive, and belongs exclusively to that nursery business — a home daycare owner and a 500-child chain's administrator must never be able to see, query, or infer anything about each other's operation, even though both run on the same running product.

**Note on scope:** [technical ADR-0001](../../adr/0001-core-platform-architecture.md) already documents the *mechanism* (single shared Postgres database, `tenant_id` columns, Row-Level Security as the enforcement backstop, application-layer filtering as defense-in-depth). This ADR documents the *business/product* reasoning for choosing multi-tenancy as the model at all — why this is the right shape for the business, not how it's enforced.

## Problem

A SaaS childcare platform serving many independent nursery businesses needs an isolation model. The options span a spectrum from "one database per customer" (maximum isolation, maximum operational cost) to "one shared database, isolation enforced only by application code discipline" (minimum cost, weakest guarantee) to "one shared database, isolation enforced by the database itself" (the middle path this product chose). The choice determines both the unit economics of serving a 5-child home daycare profitably, and the trust story the product can honestly tell a prospective enterprise customer's compliance team.

## Decision

**Single shared PostgreSQL database, one `Tenant` = one nursery organization, with Row-Level Security enforcing isolation at the database layer** — not merely as an application-code convention. This is a genuinely *product* decision, not just a technical implementation detail, for two reasons specific to this business:
1. **Unit economics at the Starter tier.** A 5–20-child home daycare ([vision.md](../vision.md) "Small nursery" segment) cannot support the operational cost of a dedicated database or deployment per customer — multi-tenancy on shared infrastructure is what makes serving this segment commercially viable at all, which matters because [ADR-0006](./0006-mvp-for-small-nurseries-enterprise-compatible.md) makes this segment the product's deliberate entry point.
2. **A trust guarantee the business can state plainly.** "Your data is isolated by the database itself, not by a developer remembering to filter correctly" ([product-principles.md](../product-principles.md) principle 17) is a genuine sales/trust asset when handling children's personal data — a category of data where "we promise our application code always filters correctly" is a materially weaker claim to make to a nursery owner, a parent, or (eventually) a regulator than "the database itself refuses to return another tenant's rows."

## Alternatives considered

1. **Database-per-tenant** (or schema-per-tenant). Rejected: strongest possible isolation, but operationally expensive to provision, migrate, and monitor at the volume implied by serving many small (5–20-child) customers profitably — the isolation guarantee this business actually needs (no cross-tenant data leakage) is already achievable more cheaply via RLS, so the extra operational cost buys little the business needs.
2. **Shared database, isolation by application-code convention only** (every query manually scoped by `tenant_id`, no database-enforced backstop). Rejected: this makes tenant isolation dependent on every developer, on every query, forever, never forgetting a `WHERE tenant_id = ?` clause — a single missed filter is a real cross-tenant data leak of children's personal information, an unacceptable risk profile for this category of data, and a materially weaker claim to make to an enterprise prospect's security review.
3. **Separate tenant "organizations" from day one** (an `Organization` layer above `Tenant` for chains, built speculatively ahead of any multi-branch customer). Rejected: [enterprise-roadmap.md §2](../enterprise-roadmap.md#2-large-organizations) explicitly defers this — the current `TenantMembership` design (one active membership per user, per tenant, enforced at the application layer rather than a DB constraint) was deliberately built to leave room for this without a schema change, so building the full `Organization` layer now would be speculative work with no validated customer requirement yet, contradicting [ADR-0006](./0006-mvp-for-small-nurseries-enterprise-compatible.md)'s "don't build enterprise architecture speculatively" reasoning.

## Consequences

**Positive:**
- One deployable product serves every customer size from day one — this is the specific mechanism that makes [ADR-0006](./0006-mvp-for-small-nurseries-enterprise-compatible.md)'s "one product, no re-platform" promise actually true rather than aspirational.
- A single shared fault domain and cost base means infrastructure cost scales roughly with actual usage, not with customer count times a fixed per-tenant overhead — directly supporting Starter-tier unit economics.
- The isolation guarantee is auditable (a fixed set of RLS policies to review) rather than distributed across every query in the codebase — a materially easier security posture to reason about and to demonstrate to a customer's security/compliance review.

**Trade-offs accepted:**
- All tenants share fault domain and performance characteristics — a very large tenant's query load can, in principle, affect a small tenant's experience on the same infrastructure, an explicitly accepted trade-off for MVP scale (per the technical ADR), to be revisited (read replicas, per [enterprise-roadmap.md §6](../enterprise-roadmap.md#6-scalability)) as a deliberate future decision rather than solved prematurely.
- Multi-branch/multi-organization support (a real Enterprise-tier need, [vision.md](../vision.md)'s long-term vision) is not automatically solved by tenant-level isolation alone — it requires the additional `Branch`/`Organization` layers [enterprise-roadmap.md §1–2](../enterprise-roadmap.md#1-multi-branch) describes, deliberately sequenced as later, dependent work rather than assumed to fall out of multi-tenancy "for free."

## Future implications

- Every new tenant-owned table, in every future module (Attendance, Invoices, and beyond), inherits an obligation to carry its own `tenant_id` and RLS policy — this is not optional per-module judgment, it is the non-negotiable continuation of this decision (per [domain-model.md](../domain-model.md)'s RLS Implications section, "there are no exceptions among them").
- The Branch model, when built ([enterprise-roadmap.md §1](../enterprise-roadmap.md#1-multi-branch)), should reuse this exact RLS-by-column pattern one level deeper (`branch_id` alongside `tenant_id`) rather than introducing a different isolation mechanism — the architecture explicitly anticipates this as additive, not a rebuild.
- Any future decision to introduce dedicated infrastructure per large Enterprise customer (a real possibility once data-residency/compliance requirements are region-specific, per [enterprise-roadmap.md §9](../enterprise-roadmap.md#9-compliance)) would be a deliberate, scoped exception to this ADR for specific customers — not a reversal of the shared-multi-tenant default for the product as a whole.
