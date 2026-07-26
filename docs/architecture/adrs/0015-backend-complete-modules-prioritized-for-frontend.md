# ADR-0015: Backend-Complete Modules Are Prioritized for Frontend Work Ahead of Their Pricing Tier

- **Status:** Accepted
- **Date:** 2026-07-25
- **Related:** [roadmap.md — Sequencing rationale](../roadmap.md#sequencing-rationale-why-this-order-not-another), [user-journeys.md — Cross-journey observations](../user-journeys.md#cross-journey-observations), [feature-map.md — Attendance](../feature-map.md#attendance), [ux-debt.md UXD-4](../ux-debt.md#uxd-4--backend-capability-outpaces-frontend-in-three-places)

## Context

By Sprint 12, Attendance, Billing (Invoice), and Payments have fully built, working backend modules — data models, business rules (Attendance's tenant-local-date-aware one-record-per-child-per-day invariant, Invoice's status lifecycle, Payment's partial-payment support) — with **zero frontend**. This is explicitly tracked, not accidental: [feature-map.md](../feature-map.md) marks each ⚙️ ("backend only, frontend pending"), and [ux-debt.md UXD-4](../ux-debt.md#uxd-4--backend-capability-outpaces-frontend-in-three-places) names this as a real, if partial, form of debt.

Under a strict tier-first build order, Attendance is an MVP/Starter-tier feature and would naturally queue up early — but Billing/Payments frontend work is also MVP-tier, and neither is inherently more "worth building" than starting fresh on a not-yet-backend-built feature at the same tier, absent some other tiebreaker.

## Problem

Given several MVP-tier features all technically eligible to build next, which gets built first? Treating "pricing tier" as the only sequencing signal ignores a second, independent dimension: how much of the total engineering cost is *already sunk and idle*. A feature whose backend is fully built and tested, sitting unused, represents value that's cheaper and lower-risk to realize than a feature requiring backend and frontend work from scratch — even if both are nominally the same pricing tier.

## Decision

**Attendance and Billing/Payments frontends are pulled to the very front of Phase 1**, ahead of other MVP-tier work that would otherwise compete for the same slot, specifically *because* their backends are complete and idle. [roadmap.md](../roadmap.md)'s sequencing rationale states the reasoning directly: "this is the cheapest, lowest-risk value available in the entire roadmap, and [user-journeys.md] identifies Attendance specifically as blocking four of six personas' core workflows today." [user-journeys.md — Cross-journey observations](../user-journeys.md#cross-journey-observations) backs this with a concrete cross-persona count: Attendance blocks Manager, Teacher, Parent, and Receptionist; Billing/Payments' absence blocks Accountant and Parent from having any real workflow at all, "despite complete backend support."

Attendance specifically is named the very next module to build (per [feature-map.md](../feature-map.md) and this session's own prior checkpoint), ahead of Payroll's follow-on work, precisely because of this "backend idle, frontend pending, blocks the most personas" combination.

## Alternatives considered

1. **Strict pricing-tier-order sequencing** (build every MVP feature before touching any Professional feature, in whatever order they happen to appear in the feature map, with no cost/risk tiebreaker). Rejected: this treats "Attendance frontend" and, say, "a brand-new MVP feature needing backend work from scratch" as equally worth building next merely because both are MVP-tier — ignoring that one is dramatically cheaper and lower-risk to ship than the other.
2. **Sequence by raw feature-count or codebase size** (build whichever feature touches the fewest files, or has the smallest estimated frontend scope). Rejected: this would optimize for apparent velocity without regard to actual customer/persona impact — [user-journeys.md](../user-journeys.md)'s explicit "blocks four of six personas" finding is a stronger, more direct signal of real value than raw implementation size.
3. **Wait to build Attendance/Billing frontends until Payroll's newly-added Staff-name dependency work (this session) is fully settled**, on the reasoning that recently-touched modules should stabilize before starting the next one. Rejected as the operative sequencing principle here — the checkpoint recovery and this session's own audit confirm Staff/Payroll are tested and stable; the roadmap's stated "next module" is Attendance specifically because it's next in the already-established backend-idle priority order, not blocked on unrelated Staff/Payroll follow-up work.

## Consequences

**Positive:**
- Realizes value that's already been paid for (backend engineering effort) at the lowest possible additional cost — building a frontend against an existing, stable, already-tested backend API is materially lower-risk than building both layers together.
- Directly unblocks the largest number of blocked personas per unit of engineering effort — Attendance specifically closes real, named pain points for four of six documented personas simultaneously ([user-journeys.md](../user-journeys.md)).
- Sets a reusable sequencing heuristic for future planning: "is there already-built, idle backend capability that a frontend would unlock cheaply" is now an explicit, named tiebreaker alongside pricing tier, not an ad-hoc one-time judgment call.

**Trade-offs accepted:**
- Some other MVP-tier work not yet backend-built (e.g. Settings' tenant-profile/membership-management UI, also named in [roadmap.md](../roadmap.md) Phase 1's "net new" feature work) queues up behind Attendance/Billing/Payments despite being equally MVP-tier — an accepted ordering cost, since the backend-idle features have a stronger, more concrete impact argument.
- This sequencing logic is a one-time-per-feature argument, not a permanent module priority — once Attendance/Billing/Payments frontends ship, this specific rationale is consumed; future prioritization decisions need their own justification, not an assumption that "backend-first-built" modules always jump the queue going forward.

## Future implications

- Any future module that ships backend-first with no frontend (a pattern the current build process doesn't discourage — NestJS/Prisma backend work is often faster to build than the corresponding UI) should be evaluated using this same tiebreaker: idle backend capability plus a documented cross-persona blocking effect is a legitimate reason to jump a feature ahead of its nominal tier-order position.
- [ux-debt.md UXD-4](../ux-debt.md#uxd-4--backend-capability-outpaces-frontend-in-three-places)'s narrower version of this same gap (sortable-headers UI, activity feed) should be tracked and closed the same way — a backend capability sitting unused (in that case, `sortBy`/`sortOrder` params with no UI to trigger them) is "pure unrealized value," per its own description, and deserves the same prioritization lens.
- If a future module is ever built frontend-first with the backend deliberately deferred (the inverse of this pattern), that would be a distinct decision requiring its own ADR — this one specifically addresses backend-ahead-of-frontend sequencing, not the reverse case.
