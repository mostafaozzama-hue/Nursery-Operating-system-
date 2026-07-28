# Information Architecture Freeze

- **Status:** Frozen
- **Frozen:** 2026-07-28
- **Scope:** Admin Workspace and Classroom Workspace navigation, workspace routing, and the cross-cutting UX rules that govern them — [design-system.md §11](./design-system.md#11-navigation--information-architecture), [§12](./design-system.md#12-dashboard-vision), [§13](./design-system.md#13-cross-module-consistency-rules), [§10.3](./design-system.md#103-form-page-pattern-target-spec); the two-workspace product framing in [vision.md](./vision.md#two-workspaces-one-system); the Teacher persona journey in [user-journeys.md](./user-journeys.md).

## What this covers

- The two-workspace split: Admin Workspace (web) and Classroom Workspace (dedicated classroom iPad), and the routing rule between them.
- Admin Workspace's sidebar structure (Overview / PEOPLE / OPERATIONS / FINANCE / Settings), including the removal of a standalone Enrollment nav item and tier-gated items being absent rather than disabled.
- Classroom Workspace as a classroom operating surface, not a personal teacher app — scoped to exactly what exists today (the daily roster), with no reserved tabs for unbuilt capabilities.
- Pickup authorization folded into the check-out action, not a separate screen.
- The dashboard's attention-list mechanism as the single way new capabilities surface to a user — never a separate setup-wizard mechanism.
- Progressive disclosure for forms with optional/exception fields (Enrollment is the concrete case).
- Bulk review-and-action for recurring/generated records (monthly invoicing is the concrete case).
- Internal/backend mechanism names (e.g. `ManualOverride`) never appearing in user-facing UI.

## Guiding principles this IA was reviewed against

1. SaaS-first, not ERP.
2. Simplicity over completeness.
3. Configuration over customization.
4. Progressive disclosure.
5. Bulk operations where appropriate.
6. Classroom-first product experience.
7. No unnecessary abstractions.

## What frozen means here

Navigation, workspace structure, and user workflows are not revisited unless implementation exposes a concrete usability problem — the same standing rule already governing the frozen domain model ([ADR-0017](./adrs/0017-configuration-before-operations.md)). New capabilities extend this IA (a new nav item once a real second use case exists, a new attention-list item, a new Classroom Workspace tab once a second real screen exists) rather than reopening it.

## What this does not cover

The domain model (frozen separately, see [ADR-0017](./adrs/0017-configuration-before-operations.md)) and visual/screen-level design — wireframes and UI implementation are the next phase, not started as of this freeze.
