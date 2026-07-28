# Product ADRs — Index

**Status:** Living document — Part of the Nursery OS Product Bible.

This folder holds **Product** Architecture Decision Records — records of *why the product is shaped the way it is*: which entity owns which concept, why a module is isolated or connected, why a market gets a particular feature before another, why the roadmap sequences one thing ahead of another. These are business/product reasoning artifacts, not implementation ADRs.

This is a deliberately separate library from [`docs/adr/`](../../adr/), which holds **technical** ADRs (stack choices, deployment topology, data-access boundaries — see [ADR-0001: Core Platform Architecture](../../adr/0001-core-platform-architecture.md)). A technical ADR answers "how is this built"; a Product ADR here answers "why does the product work this way, for this business, in this market." Where a decision here depends on a technical ADR's mechanism (e.g. multi-tenancy's RLS enforcement), the Product ADR references it rather than repeating it.

**Every ADR below was derived from decisions already reflected in the existing Product Bible** ([vision.md](../vision.md), [product-principles.md](../product-principles.md), [design-system.md](../design-system.md), [feature-map.md](../feature-map.md), [roadmap.md](../roadmap.md), [pricing-strategy.md](../pricing-strategy.md), [user-journeys.md](../user-journeys.md), [enterprise-roadmap.md](../enterprise-roadmap.md), [ux-debt.md](../ux-debt.md)) and the implemented codebase — none introduce new decisions, they make existing ones explicit, traceable, and durable.

**Format:** every ADR follows Context → Problem → Decision → Alternatives considered → Consequences → Future implications.

**How to use this library:**
- Before proposing a change that seems to contradict one of these decisions (e.g. "should Payroll just live inside Staff"), read the relevant ADR first — the reasoning and the alternatives already rejected are recorded there, not just the conclusion.
- When a genuinely new major product decision is made, add a new ADR here (next sequential number) — do not silently fold it into an existing document's prose where the reasoning will erode over time.
- Superseding an existing ADR: add a new ADR that supersedes it, and mark the old one's status as `Superseded by ADR-00XX`. Do not delete or silently rewrite a past decision — the history of *why we changed our mind* is as valuable as the decision itself.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](./0001-staff-owns-employee-profile.md) | Staff Owns the Employee Profile | Accepted |
| [0002](./0002-payroll-independent-from-staff.md) | Payroll Is a Fully Independent Module from Staff | Accepted |
| [0003](./0003-child-is-the-center-of-the-product.md) | Child Is the Center of the Product | Accepted |
| [0004](./0004-module-separation-over-monolithic-entity-pages.md) | Module Separation Over One Giant Entity Page | Accepted |
| [0005](./0005-whatsapp-first-parent-communication.md) | Parent Communication Prioritizes WhatsApp | Accepted |
| [0006](./0006-mvp-for-small-nurseries-enterprise-compatible.md) | MVP Optimized for Small Nurseries, Enterprise-Compatible by Construction | Accepted |
| [0007](./0007-multi-tenant-architecture.md) | Multi-Tenant Architecture as the Business Model's Foundation | Accepted |
| [0008](./0008-design-system-before-dashboard.md) | Design System Before Dashboard, Dashboard Before Everything Else Customer-Visible | Accepted |
| [0009](./0009-regional-payment-methods-first-class.md) | Regional Payment Methods Are First-Class, Not a Card-First Afterthought | Accepted |
| [0010](./0010-arabic-rtl-foundational-not-bolted-on.md) | Arabic and RTL Are Foundational, Not a Bolted-On Localization Layer | Accepted |
| [0011](./0011-narrower-access-for-sensitive-modules.md) | Sensitive Modules Get a Narrower Access Boundary Than the Default Read Pattern | Accepted |
| [0012](./0012-enrollment-historized-not-mutable-status.md) | Enrollment Is Historized, Never a Mutable Status Field on Child | Accepted |
| [0013](./0013-soft-delete-universal-default.md) | Soft-Delete Is the Universal Default, Never Hard-Delete | Accepted |
| [0014](./0014-ai-sequenced-last.md) | AI Is Deliberately Sequenced Last | Accepted |
| [0015](./0015-backend-complete-modules-prioritized-for-frontend.md) | Backend-Complete Modules Are Prioritized for Frontend Work Ahead of Their Pricing Tier | Accepted |
| [0016](./0016-android-tablet-priority-device.md) | Inexpensive Android Tablet Is the Priority Device, Not iPad | Accepted |
| [0017](./0017-configuration-before-operations.md) | Configuration Before Operations, and Plan as a First-Class Entity | Accepted |
