# Nursery OS — UX Debt Register

**Status:** Living document — Part of the Nursery OS Product Bible. This is the canonical, detailed record of UX debt in **what is already built** — problems in existing screens, not missing features. For features that don't exist yet at all, see [feature-map.md](./feature-map.md) (what's planned) and [roadmap.md](./roadmap.md) (when). This document expands on [design-system.md §14](./design-system.md#14-module-by-module-audit-against-this-system)/[§15](./design-system.md#15-current-ux-debt-consolidated) with severity, business impact, and priority — it does not repeat those sections' descriptions, it references them.

**How to use this document:** when an item ships, move it to the "Resolved" section at the bottom with the date and what changed — don't delete it. This keeps the register a living record of the product's UX maturity over time, per [design-system.md §18](./design-system.md#18-document-maintenance).

**Severity scale:** Critical (data/security hygiene issue) · High (violates a binding rule in [design-system.md §13](./design-system.md#13-cross-module-consistency-rules) or a [product-principles.md](./product-principles.md) principle, user-visible) · Medium (inconsistency or missing capability, workaround exists) · Low (polish).

---

## Critical

### UXD-1 — Guardian Detail renders a raw internal UUID
- **Where:** `components/guardians/guardian-detail.tsx` — the "Linked user" field displays the raw `userId` value directly when a guardian record is portal-linked.
- **Severity:** Critical.
- **Business impact:** Violates [product-principles.md](./product-principles.md) principle 16 ("never expose internal IDs") directly. A database primary key is not meaningful or actionable information for any user role, and surfacing it signals an unfinished/unpolished product to exactly the audience (Owners evaluating the product, Guardians who might see a screen-share) whose trust the product depends on. Not an actual security leak (UUIDs aren't secrets) but a real professionalism/hygiene defect.
- **Recommended solution:** Resolve the linked `User`/`TenantMembership` to a display value (email, matching the pattern already used for Staff's membership-email resolution) instead of rendering the raw ID. If no resolvable display value exists (e.g. STAFF-role viewer without membership read access), show a neutral label ("Portal access linked") rather than the ID or nothing.
- **Priority:** Phase 1 (see [roadmap.md](./roadmap.md)) — small effort, real defect, ship alongside the design-system foundation pass.

### UXD-2 — Breadcrumbs render raw record UUIDs everywhere
- **Where:** `components/layout/breadcrumbs.tsx`, affecting every detail/edit route in the product (confirmed live during Payroll/Staff testing: `Overview / Payroll / 5f1a73a8-6b0e-45e7-8a9d-3ff5aef88c64`).
- **Severity:** Critical (by breadth — affects every module, every day, every user).
- **Business impact:** Same principle violation as UXD-1, but with far larger surface area — this is the single most-seen instance of "raw ID leakage" in the product, appearing on every detail and edit page across every module.
- **Recommended solution:** Breadcrumbs resolve the current route's dynamic segment to the entity's display name (already fetched by the detail page one level down — no new network request needed, just thread the resolved name up to the breadcrumb component). See [design-system.md §5.15](./design-system.md#515-navigation).
- **Priority:** Phase 1 — same batch as UXD-1, likely the same underlying fix pattern (a shared "resolve entity display name" utility) covers both.

---

## High

### UXD-3 — Dashboard and Settings are placeholder pages
- **Where:** `app/dashboard/page.tsx`, `app/dashboard/settings/page.tsx` — both render only `PagePlaceholder` ("Coming soon.").
- **Severity:** High.
- **Business impact:** The dashboard is explicitly named in [vision.md](./vision.md) as the product's "control center" — its absence is the single largest gap between the stated product vision and the current build. Every Owner/Manager journey in [user-journeys.md](./user-journeys.md) opens with "checks the dashboard," and today there is nothing to check.
- **Recommended solution:** Ship Dashboard v1 per [design-system.md §12](./design-system.md#12-dashboard-vision) — this is technically debt-free to build (zero backend changes, pure aggregation over existing endpoints), which makes its continued absence a prioritization gap, not a technical blocker.
- **Priority:** Phase 1 (see [roadmap.md](./roadmap.md)) — already sequenced as the top feature-level priority once the design-system foundation lands.

### UXD-4 — Backend capability outpaces frontend in three places
- **Where:** (a) Every list endpoint supports `sortBy`/`sortOrder`; `DataTable` (`components/common/data-table.tsx`) gained sortable-header support (`sortKey`/`onSortChange`) when Attendance shipped, but only `AttendanceList` actually passes `sortKey` on its columns — Children/Guardians/Classrooms/Staff/Payroll still render plain, unsorted headers despite the capability now existing in the shared component. (b) Every table tracks `createdBy`/`updatedBy`/`createdAt`/`updatedAt`; there is no activity feed anywhere in the product. (c) Invoice/Payment backend modules are fully built with zero frontend (tracked as a feature gap in [feature-map.md](./feature-map.md), not repeated here as debt — Attendance was in this same position and has since shipped its frontend, see [feature-map.md](./feature-map.md#attendance)).
- **Severity:** High for (a) — it's a whole-product-surface gap on every pre-Attendance list page; Medium for (b) — desirable but not currently blocking any workflow.
- **Business impact:** (a) Users still cannot reorder Staff/Payroll/Children/Guardians/Classrooms lists by the fields that matter to them (e.g. sort Staff by hire date, sort Payroll by effective date) despite the backend already computing the sort and `DataTable` now supporting the UI for it — this is now a per-module wiring gap, not a missing capability. (b) No "who changed this and when" visibility anywhere, despite the data existing — becomes a real gap once multiple staff share admin access (medium/enterprise tier).
- **Recommended solution:** (a) Pass `sortKey` on the relevant columns and wire `sortBy`/`sortOrder`/`onSortChange` into `DataTable` for each pre-existing list, following the pattern already shipped in `components/attendance/attendance-list.tsx` — no further `DataTable` change needed, this is now purely per-module wiring. (b) Build a shared activity-feed component once a concrete use case needs it (Dashboard's "recent activity" widget in [design-system.md §12](./design-system.md#12-dashboard-vision) is the first real consumer).
- **Priority:** (a) Phase 1 — the shared-component half of [design-system.md §16](./design-system.md#16-prioritized-ux-improvement-backlog) item 1 is done; only the five modules' own wiring remains. (b) Phase 1, as a direct dependency of Dashboard v1's "recent activity" widget.

### UXD-5 — Guardians list has two separate search inputs
- **Where:** `components/guardians/guardians-list.tsx` — "Search by name…" and "Search by email…" as two distinct boxes, the only list in the product with this pattern.
- **Severity:** High (direct violation of a binding rule).
- **Business impact:** Violates [design-system.md §13](./design-system.md#13-cross-module-consistency-rules) rule 1 ("one search box per list") directly — it's the one visibly inconsistent list-page pattern in an otherwise consistent product, and a user has to guess which box to use for a given query.
- **Recommended solution:** Combine into one search input matching against name OR email server-side (the `GuardianQueryDto` already supports both `name` and `email` params independently — combining them into a single OR-matched param, or having the frontend try `name` and fall back visually to noting an email match, is a small backend+frontend change).
- **Priority:** Phase 1, part of the List page pattern rollout ([design-system.md §16](./design-system.md#16-prioritized-ux-improvement-backlog) item 5).

### UXD-6 — Children's Gender field is free text, not a select
- **Where:** `components/children/child-form.tsx`.
- **Severity:** High (violates a binding rule; also a real localization risk).
- **Business impact:** Violates [design-system.md §13](./design-system.md#13-cross-module-consistency-rules) rule 2 ("enum fields always use Select"). Free-text gender values also can't be reliably translated/displayed consistently once Arabic localization ([roadmap.md](./roadmap.md) Phase 4) ships — a controlled vocabulary is required for that, not just for UI consistency.
- **Recommended solution:** Convert to a `Select` with a defined, small vocabulary (see [design-system.md §5.3](./design-system.md#53-selects)).
- **Priority:** Phase 1, alongside the Entity Detail/Form pattern rollout.

---

## Medium

### UXD-7 — No entity header or stat chips on any detail page
- **Where:** Every detail page (`child-detail.tsx`, `guardian-detail.tsx`, `classroom-detail.tsx`, `staff-detail.tsx`, `payroll-detail.tsx`) uses a bare `PageTitle` + `<dl>` two-column field list.
- **Severity:** Medium.
- **Business impact:** No functional break, but this is the single largest driver of the product currently looking like "generated CRUD" rather than a designed product (see [design-system.md](./design-system.md) headline finding) — Classroom Detail specifically forces a scroll to discover occupancy/staff count, which [user-journeys.md](./user-journeys.md) flags as a real Manager-persona friction point.
- **Recommended solution:** Build and roll out the Entity Detail page pattern from [design-system.md §10.1](./design-system.md#101-entity-detail-page-pattern-target-spec) — one component, applied to every module at once.
- **Priority:** Phase 1, [design-system.md §16](./design-system.md#16-prioritized-ux-improvement-backlog) item 4.

### UXD-8 — Status fields shown as bare text instead of Badges
- **Where:** Enrollment status (`enrollment-section.tsx` history table), Membership status (Staff Detail's "Membership status" row), Payroll's pay type/frequency.
- **Severity:** Medium.
- **Business impact:** Violates [design-system.md §13](./design-system.md#13-cross-module-consistency-rules) rule 5. Status is exactly the kind of information a user needs to scan quickly (is this child active or withdrawn? is this membership active or suspended?) — bare text requires reading every row instead of visually scanning color/shape.
- **Recommended solution:** Build the `Badge` component ([design-system.md §5.7](./design-system.md#57-badges)) with the semantic color mapping already specified there, apply to every status-bearing field.
- **Priority:** Phase 1, [design-system.md §16](./design-system.md#16-prioritized-ux-improvement-backlog) item 6.

### UXD-9 — Five near-duplicate picker component implementations
- **Where:** `guardian-picker.tsx`, `child-picker.tsx`, `classroom-picker.tsx`, `membership-picker.tsx`, `staff-picker.tsx` — each independently implements "search box + filtered table + Select action" over its own directory hook.
- **Severity:** Medium (not user-visible today, but a rising maintenance risk).
- **Business impact:** No current user-facing inconsistency (they're deliberately built to look identical), but every new picker (a 6th is inevitable — e.g. a future Classroom picker for Transportation routes) either copies the pattern again or silently diverges. This is architectural debt that will eventually surface as user-visible inconsistency if left unconsolidated.
- **Recommended solution:** Consolidate into one generic `EntityPicker` parameterized by directory hook, display formatter, and table columns (per [design-system.md §13](./design-system.md#13-cross-module-consistency-rules) rule 7).
- **Priority:** Phase 1, alongside the shared-component foundation work — cheapest to do now, before a 6th/7th picker exists to migrate.

### UXD-10 — No visual identity; pure grayscale palette
- **Where:** `app/globals.css` — every color token is an oklch neutral gray; zero brand color anywhere in the product.
- **Severity:** Medium (perception/brand, not functional).
- **Business impact:** Directly contradicts [design-system.md §3](./design-system.md#3-design-philosophy--principles)'s "calm, not clinical" principle and [vision.md](./vision.md)'s explicit "never feel like ERP software" brief — this is likely the single most immediately visible gap to any prospective customer evaluating the product.
- **Recommended solution:** Implement the warm-teal token palette specified in [design-system.md §4.1](./design-system.md#41-color-palette).
- **Priority:** Phase 1, the very first item in [design-system.md §16](./design-system.md#16-prioritized-ux-improvement-backlog) — everything else in this register looks better once this lands, so it should land first.

### UXD-11 — No avatars or photos anywhere
- **Where:** Every list/detail page across Children, Guardians, Staff — despite `Child.photoUrl` existing as a field, it's never rendered.
- **Severity:** Medium-low.
- **Business impact:** A childcare product with no visual representation of the children in it feels colder than the product's "friendly, calm" brief intends — this is a genuine emotional-tone gap, not just a missing feature, given the product's subject matter.
- **Recommended solution:** Add an avatar/initial-circle to the Entity Detail header (§10.1) and list rows; treat actual photo upload (as opposed to today's URL-only field) as a separate, larger [feature-map.md](./feature-map.md) Professional-tier item, not blocking this smaller visual fix.
- **Priority:** Phase 1 for the avatar-circle/initials treatment (cheap, part of the entity-header rollout); Phase 3 for real photo upload (tracked in [feature-map.md](./feature-map.md#children)).

---

## Low

### UXD-12 — No dark mode toggle despite dark-mode CSS scaffolding existing
- **Where:** `app/globals.css` has a `.dark` class variant defined (shadcn default); nothing in `components/layout/` ever toggles it.
- **Severity:** Low.
- **Business impact:** No functional gap (light mode works fine); simply unused scaffolding. Not a stated product requirement anywhere in [vision.md](./vision.md) or [product-principles.md](./product-principles.md) — do not treat this as implicitly promised just because the CSS exists.
- **Recommended solution:** Either remove the unused dark-mode CSS to reduce confusion, or (preferred, since the cost is low once the token palette work happens anyway) finish it as a real toggle in `UserMenu` — a judgment call, not urgent either way.
- **Priority:** Unscheduled — revisit opportunistically during the Phase 1 token work, not a dedicated priority item.

### UXD-13 — Loading states are plain "Loading…" text
- **Where:** Every detail page and form (`<p>Loading…</p>`), `DataTable`'s loading row.
- **Severity:** Low.
- **Business impact:** Functionally fine, purely a polish gap relative to [design-system.md §5.9](./design-system.md#59-loading-states)/[§5.10](./design-system.md#510-skeletons)'s skeleton-based target spec.
- **Recommended solution:** Build `Skeleton`/`SkeletonTable`/`SkeletonDetail` per the design system spec; roll out opportunistically as each page gets its Entity Detail/List pattern upgrade (UXD-7), not as a separate dedicated pass.
- **Priority:** Folds into Phase 1's page-pattern rollout — no separate scheduling needed.

---

## Debt explicitly out of scope for this register

The following are **not** UX debt — they are missing features, already tracked in [feature-map.md](./feature-map.md) and sequenced in [roadmap.md](./roadmap.md), and are excluded here to avoid duplicating those documents: no Billing/Payments frontend (backend-complete, frontend pending — Phase 1; Attendance was in this same category and has since shipped, see [feature-map.md](./feature-map.md#attendance)), no Teacher App / Parent App (Phase 2-3), no Multi-Branch support, no RTL/Arabic implementation (foundational convention starts now per [design-system.md §8](./design-system.md#8-rtl--internationalization), full localization ships Phase 4), no bulk actions in `DataTable`, no directory-hook scaling beyond 100 records (both tracked in [enterprise-roadmap.md](./enterprise-roadmap.md) as Enterprise-phase architectural work, not current-build debt).

---

## Resolved

*(Empty — no items from this register have shipped yet. Move items here with a date and brief note on the fix once they do, so this section becomes a changelog of the product's UX maturity over time.)*
