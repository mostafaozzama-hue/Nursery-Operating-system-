# ADR-0008: Design System Before Dashboard, Dashboard Before Everything Else Customer-Visible

- **Status:** Accepted
- **Date:** 2026-07-25 (design-system.md authored), sequencing reaffirmed in [roadmap.md](../roadmap.md)
- **Related:** [design-system.md §16](../design-system.md#16-prioritized-ux-improvement-backlog), [design-system.md §18](../design-system.md#18-document-maintenance), [roadmap.md — Sequencing rationale](../roadmap.md#sequencing-rationale-why-this-order-not-another), [ux-debt.md UXD-3](../ux-debt.md#uxd-3--dashboard-and-settings-are-placeholder-pages)

## Context

By the end of Sprint 12, seven modules (Children, Guardians, Classrooms, Enrollment, Child-Guardian, Staff, Payroll) are functionally complete on both backend and frontend, but [design-system.md §2](../design-system.md#2-current-product-assessment) assesses the result honestly: "a set of well-built, structurally consistent CRUD modules... that do not yet feel like one connected product." There is no shared visual language beyond unmodified shadcn/ui defaults (pure grayscale, no color, no distinctive rounding), and the Dashboard — named in [vision.md](../vision.md) as the product's literal "control center" — is still a placeholder page.

Shipping the Dashboard is simultaneously the single highest-visibility gap in the product ([ux-debt.md UXD-3](../ux-debt.md#uxd-3--dashboard-and-settings-are-placeholder-pages): "the single largest gap between the stated product vision and the current build") and the thing every stakeholder is most eager to see next.

## Problem

Building the Dashboard *now*, directly on top of the current pure-grayscale, tokenless component set, would ship the product's most important, most-seen screen using a visual language already known to be temporary and due for a wholesale replacement. Every stat card, badge, and alert-list item the Dashboard needs (§5.16 in the design system) would have to be built once against today's ad-hoc styling, then rebuilt again once the token/component foundation lands — literally the "reskin twice" scenario the design system explicitly warns against.

## Decision

**The design-system foundation (tokens, palette, and the shared component set — Card, Badge, EmptyState, Skeleton, Toast, entity-header, consolidated `EntityPicker`, sortable `DataTable`) ships first, before the Dashboard or any other new customer-visible screen.** This is item 1 of [design-system.md §16](../design-system.md#16-prioritized-ux-improvement-backlog)'s prioritized backlog, stated explicitly: *"Nothing else on this list should start before this lands, or it gets built twice."* The Dashboard is item 3 — sequenced immediately after the foundation and the two correctness/hygiene defect fixes (raw `userId`/UUID leaks), but strictly after the foundation, never before it.

[roadmap.md](../roadmap.md)'s own sequencing rationale states this identically from the roadmap side: *"Design system before Dashboard, Dashboard before anything else customer-visible — building the visual foundation first means nothing gets reskinned twice, and the Dashboard directly closes the single most-named product gap."*

## Alternatives considered

1. **Ship the Dashboard immediately, using today's grayscale shadcn defaults, and re-skin it later once the design system lands.** Rejected: this is precisely the "reskin twice" scenario the design system document names as the reason to sequence foundation-first — building the Dashboard's stat cards, alert list, and activity feed against tokens and components known to be temporary means paying the full build cost twice for the product's single most important screen.
2. **Build the design-system foundation and the Dashboard simultaneously, in parallel workstreams.** Rejected in practice: the Dashboard's own component spec (§5.16 stat cards, alert lists, quick actions) is defined *in terms of* the shared primitives (Card, Badge) the foundation work produces — building them in parallel means the Dashboard workstream is either blocked waiting on the foundation anyway, or forced to build its own one-off versions of Card/Badge that then have to be reconciled with the "real" ones once the foundation lands, reintroducing the same double-build risk in a different order.
3. **Fix the correctness defects (raw UUID/userId leaks) before touching visual foundation work at all**, on the reasoning that correctness bugs should always outrank cosmetic work. Considered, but the actual backlog ([design-system.md §16](../design-system.md#16-prioritized-ux-improvement-backlog)) sequences the two hygiene fixes as item 2, immediately *after* the foundation rather than strictly before it — because both fixes are small, isolated, and don't depend on or block the token/component work, they can ride in the same delivery batch as the foundation without forcing a strict either-or ordering against it.

## Consequences

**Positive:**
- Every subsequent screen (Dashboard, and the Entity Detail/List/Form pattern rollout across all six existing modules) gets built exactly once against a stable, final visual language — no module pays a re-skinning tax.
- The Dashboard, once built, directly closes [vision.md](../vision.md)'s most-named gap and [user-journeys.md](../user-journeys.md)'s recurring "every Owner/Manager journey opens with checking the dashboard, and today there is nothing to check" pain point — maximizing the value of the very next thing shipped after the foundation.
- The backlog's own ordering ([design-system.md §16](../design-system.md#16-prioritized-ux-improvement-backlog)) gives every future contributor an explicit, written answer to "what should I build next" that doesn't require re-litigating priority from scratch each sprint.

**Trade-offs accepted:**
- Stakeholders eager to see the Dashboard (the most-anticipated screen) must wait through a foundation-only delivery batch that produces no new *screen*, only new *primitives* — a real, accepted cost in perceived momentum, justified by avoiding the larger, hidden cost of rebuilding the Dashboard later.
- The foundation work itself (tokens, six-plus shared components) is scoped broadly enough that it must be genuinely finished, not partially started, before Dashboard work begins — a partial foundation would tempt the Dashboard build into the exact "one-off version of Card" trap Alternative 2 was rejected for.

## Future implications

- Every future module's frontend work (Attendance, Invoices, and beyond) should build against the shared component set established here, not introduce parallel one-off styling — per [design-system.md §18](../design-system.md#18-document-maintenance), the document itself is updated whenever a new module ships, keeping this foundation-first discipline a living practice rather than a one-time event.
- The Entity Detail/List/Form pattern rollout across all six existing modules ([design-system.md §16](../design-system.md#16-prioritized-ux-improvement-backlog) item 4) is itself downstream of this same foundation-first sequencing — it should not be started early either, for the identical reskin-twice reason.
- If a future major visual redesign is ever undertaken (a rebrand, a dark-mode launch, an RTL-driven layout overhaul per [ADR-0010](./0010-arabic-rtl-foundational-not-bolted-on.md)), it should follow this same sequencing discipline: foundation/tokens first, screen-level rollout second — this ADR's reasoning is a reusable playbook, not a one-time historical decision.
