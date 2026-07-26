# Nursery OS — Product Roadmap

**Status:** Living document — Part of the Nursery OS Product Bible. Every feature listed in [feature-map.md](./feature-map.md) is mapped to exactly one phase below. Update this document whenever a feature ships (mark it done, don't delete it — this roadmap also serves as a build history) or when scope is re-sequenced.

**Relationship to other documents:** [feature-map.md](./feature-map.md) defines *what* exists at each tier (MVP/Professional/Enterprise/Future) for pricing purposes; this document defines *when* it gets built, which is a related but distinct axis — some MVP-tier (pricing) features aren't built yet and are earliest in the build sequence regardless of tier, while some later-phase work (design-system foundation) isn't a customer-facing "feature" at all but must land before dependent features can.

---

## Phase 1 — MVP

**Goal:** Every MVP-tier feature from [feature-map.md](./feature-map.md) actually works end-to-end, on a real visual design system, for a small nursery running its entire daily operation inside Nursery OS. This phase closes every gap between "backend exists" and "a user can actually do this."

**Foundational (build once, unblock everything else):**
- Design-system token and shared-component implementation ([design-system.md §4](./design-system.md#4-design-tokens)/[§5](./design-system.md#5-core-components)) — palette, typography, Card/Badge/EmptyState/Skeleton/Toast primitives, consolidated `EntityPicker`, sortable `DataTable`. **Partially shipped** alongside Attendance rather than as its own separate pass (see [design-system.md §16](./design-system.md#16-prioritized-ux-improvement-backlog) item 1): `Card`/`Badge`/`EmptyState`/`Skeleton`/sortable `DataTable`/a new `Select` primitive exist and are used by Attendance, but not yet retrofitted onto the modules below. Still outstanding: the full palette/typography rollout, `Toast`, entity-header component, `EntityPicker` consolidation.
- Entity Detail / List / Form page-pattern rollout ([design-system.md §10](./design-system.md#10-reusable-page-patterns)) across all already-built modules.
- Fix the two tracked correctness defects (raw `userId` leak on Guardian Detail, raw UUIDs in breadcrumbs — see [ux-debt.md](./ux-debt.md)).

**Feature work (already-backend, needs frontend):**
- ~~**Attendance** frontend~~ — ✅ **shipped**: check-in/check-out/mark-absent via a tablet-first classroom daily roster, classroom-scoped daily view, OWNER/ADMIN correction workflow (audit history + detail + correction form).
- **Billing** frontend — invoice creation/viewing (backend fully built).
- **Payments** frontend — manual payment recording against invoices, cash/Vodafone Cash/InstaPay/bank-transfer as first-class methods on the entry form (backend fully built; integrations themselves are Phase 3).

**Feature work (net new):**
- **Dashboard v1** — occupancy, headcount, attention list, birthdays, recent activity, all client-side-aggregated from existing endpoints ([design-system.md §12](./design-system.md#12-dashboard-vision)).
- **Settings** — tenant profile/timezone, membership/role management UI (backend exists via the Memberships module, no dedicated settings-page frontend yet).
- Basic Admissions inquiry log (manual pipeline stages).

**Already done, carried forward as-is:** Auth, Children, Guardians, Child-Guardian relationships, Classrooms, Enrollment, Staff, Payroll, **Attendance** — all built and stable per [feature-map.md](./feature-map.md), no rework planned beyond the design-system visual pass above.

---

## Phase 2 — Growth

**Goal:** Give a growing small nursery, and an early medium nursery, the tools to stop losing prospective families and to communicate with current families without leaving WhatsApp — this phase is deliberately scoped narrower than the full Professional tier, as a bridge.

- **CRM** (basic tier) — prospect/lead list separate from active Guardians, referral source tracking, lost-inquiry reasons.
- **Admissions** (Professional tier) — tour scheduling with calendar sync, automated inquiry follow-up, waitlist-to-admission conversion tracking.
- **Communication** — WhatsApp-integrated broadcast messaging (classroom-wide/nursery-wide announcements). This is sequenced early relative to its Professional-tier pricing placement because it is a named, market-specific differentiator (see [vision.md](./vision.md)) and unblocks real parent-facing value before the full Parent App exists.
- **Payments** integrations — Vodafone Cash and InstaPay as connected payment methods (as opposed to Phase 1's manual recording of the same methods).
- **Activities** and **Meals** basic daily logging — the first genuinely teacher-facing data-entry surfaces, informing the Teacher App work in Phase 3.
- **Parent App** (MVP slice) — guardian portal login activated with a real UI, view own child's profile/enrollment/attendance. A deliberately thin first slice, not the full Professional-tier Parent App experience.

---

## Phase 3 — Professional

**Goal:** Complete the Professional plan (see [pricing-strategy.md](./pricing-strategy.md)) — a medium nursery can fully delegate day-to-day operations, bill automatically, and give staff and parents dedicated, task-optimized experiences.

- **Billing** — recurring billing plans, late-fee automation, discount/sibling-rate rules.
- **Reports** — per-module exportable reports (attendance, enrollment, payroll summary).
- **Teacher App** — dedicated tablet-optimized surface: classroom roster default landing, quick activity/meal/nap logging, one-handed interaction design ([design-system.md §6.2](./design-system.md#62-tablet-optimization-the-priority-device--teachers-front-desk)).
- **Parent App** (full Professional slice) — invoice viewing/payment, activity-update feed, WhatsApp-first notification delivery.
- **Guardians** — self-service portal fully wired (document sharing).
- **Automation** (Professional tier) — automated late-fee application, automated attendance-absence-to-guardian-notification.
- **Settings** (Professional tier) — branding (logo, primary color) on parent-facing surfaces, notification preferences.
- **Staff** — document storage (contracts, certifications).
- **Children** — real photo upload flow (replacing the current URL-only field), document attachments.

---

## Phase 4 — Enterprise

**Goal:** Support multi-branch chains and larger organizations — see [enterprise-roadmap.md](./enterprise-roadmap.md) for the full architectural treatment this phase depends on (tenant hierarchy, permissions model, performance/scale work). This phase is gated on that architectural foundation landing first, not just on feature work.

- **Multi-Branch** core capability (architecture in [enterprise-roadmap.md](./enterprise-roadmap.md)) — cross-branch reporting, per-branch settings overrides.
- **Settings** — custom role/permission definitions beyond OWNER/ADMIN/STAFF.
- **Medical** — full `MedicalRecord`, `MedicationAdministration`, `Incident` reporting, gated on the fine-grained permission model ([enterprise-roadmap.md](./enterprise-roadmap.md)).
- **Learning** — curriculum/lesson-plan library, developmental milestone tracking, teacher lesson-plan authoring.
- **Transportation** — route/vehicle management, child-to-route assignment, pickup/drop-off parent notification.
- **Payroll** — history/versioning (revisiting Phase 1's deliberately simple mutable-record design), export integrations.
- **Communication** — full two-way threaded messaging (`Conversation`/`Message`, explicitly not a naive 1:1 chat — see [feature-map.md](./feature-map.md#communication)).
- **Analytics** — trend charts, occupancy/capacity forecasting, multi-branch comparative analytics, server-side aggregation replacing Phase 1's client-side dashboard aggregation.
- **Accounting** — chart of accounts, multi-branch consolidated financials, external accounting-system export.
- **Reports** — cross-module scheduled reports, custom report builder.
- **CRM/Admissions** (Enterprise tier) — multi-branch pipeline, cross-branch lead routing/waitlist visibility.
- **Compliance/auditing** work described in [enterprise-roadmap.md](./enterprise-roadmap.md) (audit log, regional regulatory exports).
- **Multi-language** — the RTL/i18n foundation described in [design-system.md §8](./design-system.md#8-rtl--internationalization) is implemented as real, shipped Arabic localization in this phase (the *convention* of writing RTL-safe code starts much earlier, per that section — this phase is where translated strings and locale switching actually ship).

---

## Phase 5 — AI Platform

**Goal:** Layer assistive and generative capability over a mature, clean, cross-module data set — deliberately last, since AI features are only as good as the data underneath them, and every domain above needs to exist and be trustworthy first.

- **AI** domain in full: AI Assistant (natural-language operations queries), AI Reports (narrative analytics over Phase 4's trend data), AI Lesson Planning (built on Phase 4's Learning module), AI Parent Communication (drafting parent updates from Phase 3's teacher activity logs).
- **Automation** (Enterprise/Future tier) — configurable cross-module if-this-then-that rules, Admissions-to-CRM-to-Marketing lifecycle automation.
- **Marketing** — full Marketing CRM automation (nurture sequences, lifecycle campaigns).
- **Website** — Website Builder for individual nursery branding, tied to Admissions inquiry capture.
- **API / Marketplace / Integrations** — public API, third-party plugin ecosystem, pre-built connectors to external accounting/payment/government-reporting systems.
- **Settings** — API key management supporting the above.

---

## Phase-to-tier cross-reference

For quick sanity-checking against [pricing-strategy.md](./pricing-strategy.md) and [feature-map.md](./feature-map.md) — this is *not* a 1:1 mapping, and that's intentional (build sequencing and pricing tiers answer different questions):

| Phase | Roughly corresponds to |
|---|---|
| Phase 1 — MVP | Starter plan, made fully real (closing today's backend-ahead-of-frontend gaps) |
| Phase 2 — Growth | A deliberate bridge, pulling a few high-value Professional-tier items early (WhatsApp, Admissions) because they're named market differentiators, not because the whole Professional tier is done |
| Phase 3 — Professional | Professional plan, completed in full |
| Phase 4 — Enterprise | Enterprise plan, completed in full, gated on the architectural work in [enterprise-roadmap.md](./enterprise-roadmap.md) |
| Phase 5 — AI Platform | Future tier in [feature-map.md](./feature-map.md) — not yet priced into any plan (see [pricing-strategy.md](./pricing-strategy.md)'s open pricing questions) |

## Sequencing rationale (why this order, not another)

1. **Design system before Dashboard, Dashboard before anything else customer-visible** — per [design-system.md §16](./design-system.md#16-prioritized-ux-improvement-backlog), building the visual foundation first means nothing gets reskinned twice, and the Dashboard directly closes the single most-named product gap ([vision.md](./vision.md)'s "control center").
2. **Attendance and Billing/Payments frontends are pulled to the very front of Phase 1** despite being "just" MVP-tier features, because their backends are already complete and idle — this is the cheapest, lowest-risk value available in the entire roadmap, and [user-journeys.md](./user-journeys.md) identifies Attendance specifically as blocking four of six personas' core workflows today.
3. **WhatsApp/Admissions are pulled into Phase 2 ahead of the rest of Professional** because they are named, market-specific differentiators (see [vision.md](./vision.md)) — delaying them to "wait for the full Professional tier" would delay the product's actual competitive wedge.
4. **Multi-branch/Enterprise architecture is sequenced as its own phase, not folded into Professional**, because it is genuinely architectural (tenant hierarchy, permissions, scale) rather than additive feature work — see [enterprise-roadmap.md](./enterprise-roadmap.md) for why this can't be done incrementally alongside Phase 3.
5. **AI is last, deliberately** — every AI feature scoped in Phase 5 depends on clean, mature data from an earlier phase (AI Reports needs Phase 4's analytics; AI Lesson Planning needs Phase 4's Learning module) — building AI earlier would mean building it against data models that don't exist yet.
