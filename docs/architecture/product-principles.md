# Nursery OS — Product Principles

**Status:** Living document — Part of the Nursery OS Product Bible. These are permanent, non-negotiable defaults for every feature, screen, and decision. When a new decision conflicts with one of these, the principle wins unless there is a documented, deliberate exception recorded in the relevant module's own notes.

Cross-references: [vision.md](./vision.md) for *why* these principles exist, [design-system.md](./design-system.md) for how several of them are expressed at the component/token level, [ux-debt.md](./ux-debt.md) for where the current product violates them today.

---

## Speed & efficiency

1. **Every screen must save time compared to the paper/spreadsheet/WhatsApp process it replaces.** If a screen takes longer than the manual process it's meant to replace, it has failed regardless of how complete its data model is.
2. **Maximum 2–3 clicks (or taps) for any common task**, measured from the dashboard or the most natural entry point — not from a cold app launch. (Restated from [vision.md](./vision.md) and [design-system.md §3](./design-system.md#3-design-philosophy--principles).)
3. **Selection beats typing, always.** Teachers and front-desk staff should pick from a list, tap a photo, or toggle a switch wherever the set of valid answers is knowable in advance — free-text entry is a last resort, not a default. (See [design-system.md §5.3](./design-system.md#53-selects).)
4. **Bulk operations exist wherever a task is ever done to more than one record at a time.** A director enrolling 30 children for a new term, or messaging an entire classroom's guardians, should never be forced into one-at-a-time repetition.
5. **Defaults should anticipate the common case.** Forms pre-fill what can reasonably be inferred (today's date, the currently-selected classroom, the tenant's default currency) rather than asking the user to re-supply context the system already has.

## Simplicity & clarity

6. **Parents should understand any parent-facing screen with zero explanation.** No jargon, no internal status codes, no assumption of prior software literacy — if a parent needs a tooltip to understand a screen, the screen is wrong, not the parent.
7. **Every screen answers three questions at a glance:** what is happening, what needs attention, what should I do next (restated from [vision.md](./vision.md) / [design-system.md §3](./design-system.md#3-design-philosophy--principles)).
8. **One primary action per screen.** Secondary actions exist, but a screen should never present the user with several equally-weighted calls to action competing for attention.
9. **Progressive disclosure over information overload.** Show the common case by default; let detail expand on demand (drawers, expandable rows) rather than always showing everything or hiding everything behind a click (see [design-system.md §3](./design-system.md#3-design-philosophy--principles)).
10. **Consistency beats cleverness.** A boring, predictable pattern reused everywhere (the [Entity Detail / List / Form patterns](./design-system.md#10-reusable-page-patterns)) is always preferable to a locally "smarter" one-off design.

## Trust & recoverability

11. **Every important action must be recoverable.** Soft-delete, not hard-delete, is the default for anything a user can remove — this is already the backend's standing convention (every domain table carries `deletedAt`/`deletedBy`) and the product principle it serves: nothing important should be one misclick from gone forever.
12. **Every destructive or irreversible action requires explicit confirmation**, through one consistent confirmation pattern app-wide, never a bespoke one per feature (see [design-system.md §5.12](./design-system.md#512-dialogs)).
13. **The system never silently loses or drops user input.** Form state, in-progress drafts, and partially-completed multi-step flows should survive accidental navigation wherever reasonably possible.
14. **Money and attendance records are historized, never overwritten silently.** A change to a fee, a payment, or a check-in time leaves an audit trail — the business (and in some jurisdictions, the regulator) must be able to answer "what did this record say last month," not just "what does it say now."
15. **Parents are told the truth in real time.** Billing status, attendance, and incident communication reflect the system's actual current state — Nursery OS never shows a parent a status that is stale by more than the sync/refresh interval it advertises.

## Data, privacy & internal integrity

16. **Never expose internal IDs to a human.** No raw UUIDs in breadcrumbs, page titles, error messages, or any user-facing text — every reference to a record shows its name/label, never its database key (a current, tracked defect — see [ux-debt.md](./ux-debt.md)).
17. **Every tenant's data is isolated by default, not by application logic alone.** Row-level security at the database layer is the enforced boundary, not a convention application code merely tries to respect — this is already the standing backend architecture and is treated as non-negotiable going forward for every new tenant-owned table.
18. **Role-based access is enforced server-side, never assumed from UI hiding.** Hiding a button from a role is a UX courtesy; the API endpoint behind it must independently reject the same role. (Already the backend's standing convention across every module — Staff, Membership, and Payroll's OWNER/ADMIN-only gating are the concrete precedent.)
19. **Sensitive data (payroll, medical, financial) gets the narrowest access grant that still lets the job get done** — not "everyone with admin access sees everything." Payroll's deliberate isolation from Staff, and its OWNER/ADMIN-only read boundary, is the standing precedent for how future sensitive modules (Medical Records) should be scoped.
20. **Every record that matters to a business decision is attributable** — who created it, who last changed it, when. This already exists structurally (`createdBy`/`updatedBy`/`createdAt`/`updatedAt` on every domain table) and is a hard requirement for every future table, not just today's.

## Accessibility & device reality

21. **Every screen must work well on an inexpensive Android tablet**, not just a flagship iPad — this is a real constraint on the target market's hardware budget, not a nice-to-have (see [vision.md](./vision.md), [design-system.md §6.2](./design-system.md#62-tablet-optimization-the-priority-device--teachers-front-desk)).
22. **Every teacher-facing action must be operable one-handed**, because the other hand is often holding a child. Large touch targets, bottom-reachable primary actions, minimal typing (see [design-system.md §6.2](./design-system.md#62-tablet-optimization-the-priority-device--teachers-front-desk)).
23. **Accessibility (WCAG 2.1 AA) is a baseline requirement, not a retrofit** — contrast, keyboard operability, and focus states are specified before a component ships, not patched in after a complaint (see [design-system.md §7](./design-system.md#7-accessibility-standards)).
24. **The product must work under real-world network conditions** — intermittent connectivity, low bandwidth — common in the target market. Critical front-line workflows (check-in, attendance) should degrade gracefully, not fail outright, when connectivity is poor.

## Integration & connectedness

25. **Every module must integrate naturally with the others.** A Child, Staff member, or Guardian is never an island — the product's job is to make those connections visible (see [design-system.md §13](./design-system.md#13-cross-module-consistency-rules) for the concrete cross-module rules this produces), while still respecting deliberate isolation boundaries where a module has one for a real reason (e.g. Payroll's separation from Staff for access-control purposes — connection at the UI/discoverability layer, not necessarily at the data-coupling layer).
26. **New modules extend existing patterns before inventing new ones.** A new module that doesn't fit the existing Entity Detail/List/Form patterns (see [design-system.md §10](./design-system.md#10-reusable-page-patterns)) is a signal to extend the pattern deliberately, not a license to build a one-off.
27. **The product scales naturally across nursery sizes without being redesigned per tier.** The same screens must serve a 10-child home daycare and a 500-child enterprise chain — differences are handled through progressive disclosure, permissions, and plan-gated features (see [pricing-strategy.md](./pricing-strategy.md)), never through a separate "lite" vs. "enterprise" product.

## Localization & market fit

28. **Arabic and English are equal first-class citizens, not a primary language plus a translation layer.** Every layout decision assumes an eventual RTL flip from day one (see [design-system.md §8](./design-system.md#8-rtl--internationalization)), not just at the point Arabic strings are actually added.
29. **Payment methods reflect how the target market actually pays.** Cash, mobile wallets, and instant bank transfer are first-class payment methods in the product's data model and UI, not edge cases bolted onto a card-first billing flow (see [vision.md](./vision.md)).
30. **Parent communication meets parents where they already are.** WhatsApp-first design for parent-facing notifications and updates in the primary target market, rather than assuming push notifications or email will be checked and trusted.
