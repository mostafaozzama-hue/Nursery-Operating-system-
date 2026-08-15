# Nursery OS — Enterprise Architecture Roadmap

**Status:** Living document — Part of the Nursery OS Product Bible. This document describes what's required to serve multi-branch and large-organization customers (see [vision.md](./vision.md) "Enterprise nursery / chain" segment, [pricing-strategy.md](./pricing-strategy.md)'s Enterprise plan, [roadmap.md](./roadmap.md) Phase 4). It is grounded in the current backend architecture (`docs/architecture/domain-model.md` and the Identity/RLS design established in Sprint 10) — every recommendation here either builds directly on an existing, deliberate architectural decision or explicitly flags where a real gap exists.

---

## 1. Multi-branch

**Current state:** The backend already assumes a single `Tenant` per business, with every domain table carrying its own `tenant_id` and Row-Level Security enforcing isolation at the database layer (not just in application code) — see `domain-model.md`'s RLS Implications section. Today, one `Tenant` = one nursery, one site. There is no concept of a "branch" beneath a tenant.

**What's required:**
- **Decide the branch model deliberately**, before building it: either (a) a `Branch` entity nested under `Tenant` (one tenant = one organization/owner, many branches), or (b) treat each branch as its own `Tenant` with a new cross-tenant "Organization" grouping layer above it. Recommendation: **(a)**, because most of the product's existing tenant-scoped data (Children, Guardians, Staff) naturally wants a *branch*-level scope with an *organization*-level rollup, not the reverse — a Guardian's children might span branches within one organization, which model (b) makes awkward.
- A new `Branch` table, tenant-scoped like every other domain table (own `tenant_id`, RLS policy identical in shape to every existing tenant-owned table), with every currently tenant-scoped-only entity (Classroom, Child, Staff, Enrollment, Attendance, Invoice) gaining an optional `branch_id`.
- Cross-branch reporting and a branch switcher in `TopNav` (space should be reserved for this now per [design-system.md §17](./design-system.md#17-future-enterprise-considerations), even before it's built).
- Per-branch settings overrides on top of tenant-level defaults (see §7 Permissions below for the same layering principle applied to roles).

**Why this doesn't require a rebuild:** The RLS-by-`tenant_id` pattern that already secures every table is directly reusable at the `branch_id` level — the same `current_setting()`-based policy shape, the same `withTenantContext`-style transaction wrapper pattern already used everywhere in the API layer, just parameterized one level deeper. This is additive, not architectural replacement.

## 2. Large organizations

**Current state:** `TenantMembership` already enforces "one active membership per user, per tenant" **at the application layer, not a database constraint** — and the domain model's own documentation states this was a deliberate choice specifically "leaving room for multi-tenant membership later without a schema change." This means a user holding memberships across multiple tenants (or, post-Branch-model, multiple branches within one organization) is already a supported *shape*, just not yet an enabled *behavior*.

**What's required:**
- An `Organization` concept above `Tenant`/`Branch` for true multi-entity operators (e.g. a franchisor with several independently-owned nursery businesses under one brand) — deliberately separate from the `Branch` model in §1, which assumes common ownership; an `Organization` layer assumes common *branding* but possibly independent ownership/billing per branch.
- Organization-level dashboards aggregating across branches/tenants (builds on Dashboard v1's existing aggregation approach from [design-system.md §12](./design-system.md#12-dashboard-vision), scaled up — see §4 Performance below for why this can't stay client-side aggregation at this scale).
- Franchise-specific capability (explicitly named in [vision.md](./vision.md)'s long-term vision and [feature-map.md](./feature-map.md)'s cross-domain future capabilities) — standardized settings templates an organization pushes down to franchisee branches, with local override permission controlled per §7.

**Sequencing note:** Do not build the `Organization` layer speculatively — per [roadmap.md](./roadmap.md)'s sequencing rationale, this is deferred until a real Enterprise customer's structure requires it, since it's the deepest architectural addition in this document and the current `TenantMembership` design already avoids painting the product into a corner in the meantime.

## 3. Multi-language

**Current state:** Zero i18n infrastructure exists. `app/layout.tsx` hardcodes `lang="en"`; no translation library is a dependency; every user-facing string is an inline English literal in JSX.

**What's required:**
- Adopt `next-intl` (already the specific recommendation in [design-system.md §8](./design-system.md#8-rtl--internationalization)) — route-based locale segments fit the Next.js App Router structure this app already uses.
- Extract every current user-facing string into the translation layer — this is a large, mechanical migration across every component, best done once (not incrementally per-module) to avoid a long period of half-translated screens.
- `dir` attribute driven dynamically by active locale, alongside `lang`, on `<html>` (currently both hardcoded).
- Per-tenant default language setting — note the domain model already flags `Tenant.locale` as a deliberately deferred field ("pure display/i18n concern with no data-interpretation risk if added later") — this is the natural home for it.

**Relationship to RTL:** Multi-language (translated strings, locale switching) and RTL (layout mirroring) are related but separable — [design-system.md §8](./design-system.md#8-rtl--internationalization) already establishes the RTL-safe *convention* (logical CSS properties) as something to practice starting immediately in Phase 1 component work, independent of when actual Arabic strings ship. This section is about the translation/locale-switching infrastructure specifically; do not wait for this section's work to start writing RTL-safe layout code.

## 4. Regional localization

**Current state:** `Tenant.timezone` already exists and is used to compute an unambiguous local calendar day for Attendance's one-record-per-child-per-day invariant — a real, working example of the product already handling one dimension of regional variation correctly at the data layer.

**What's required beyond timezone (already solved):**
- **Currency**: `StaffPayroll.currency` already exists per-record (defaulting `USD`). Invoice/Payment's frontend has since shipped, but deliberately *without* a per-record `currency` field or column — it displays every amount through a single hardcoded `TENANT_DEFAULT_CURRENCY` constant (`EGP`, in `apps/web/lib/invoices/mapper.ts`'s `formatMoney`), an explicit interim product decision made when the frontend shipped rather than showing unlabeled numbers or building multi-currency prematurely. This is the *same* gap `StaffPayroll.currency` already solves at the record level — Invoice/Payment should eventually either gain their own per-record `currency` column (mirroring `StaffPayroll`) or, better, a tenant-level default currency setting (paralleling the `Tenant.locale` recommendation above) that both modules read from, so currency isn't re-entered per record and doesn't need a data migration to normalize later. Treat this as Enterprise-phase multi-currency work, not a defect in the current single-currency-market (Egypt) assumption.
- **Date/number formatting**: use `Intl.DateTimeFormat`/`Intl.NumberFormat` consistently (the codebase already does this correctly in places, e.g. `staff/mapper.ts`'s `toLocaleDateString()` usage — this is the right primitive, just needs to become universal, never a hand-built date string).
- **Regional payment methods** (Cash, Vodafone Cash, InstaPay, bank transfer — see [vision.md](./vision.md)) as first-class `Payment` method values, not a generic "other" bucket, and extensible per-region as the product expands beyond Egypt/GCC (e.g. a future M-Pesa integration for East African expansion should slot into the same extensible method list, not require a new payment model).
- **Regulatory reporting formats** vary by jurisdiction (see §9 Compliance) — the Attendance/Enrollment data model should remain the single source of truth, with region-specific *export* formats layered on top, not region-specific *data models*.

## 5. Performance

**Current state:** Every list endpoint is paginated (max page size 100); "directory" hooks (`useClassroomDirectory`, `useStaffDirectory`, `useMembershipDirectory`, etc. — see [design-system.md](./design-system.md) and this session's own build of Staff/Payroll) bulk-fetch up to 100 records client-side for lookup purposes, an explicitly documented scaling boundary. Dashboard v1 (once built, per [roadmap.md](./roadmap.md) Phase 1) is specified as client-side aggregation over existing list endpoints.

**What's required at enterprise scale:**
- **Server-side aggregation endpoints** replacing Dashboard v1's client-side counting once a tenant/organization's record counts make "fetch everything, count in the browser" impractical — flagged already in [design-system.md §17](./design-system.md#17-future-enterprise-considerations) and [feature-map.md](./feature-map.md#analytics) as Enterprise-phase work, not a Phase 1 concern.
- **Directory-hook redesign** — replace the 100-record bulk-fetch-then-filter pattern with server-side search-as-you-type for Classroom/Staff/Membership pickers once a tenant's roster exceeds the current ceiling (also flagged in [ux-debt.md](./ux-debt.md) as out-of-scope-for-now debt, tracked here as the real fix).
- **Database indexing review** — every current domain table already carries `tenant_id`/foreign-key indexes per the domain model's stated conventions; this needs a fresh pass once `branch_id` (§1) adds a second dimension to most queries' `WHERE` clauses.
- **Query performance under RLS** — RLS policies add a predicate to every query; this is already accepted as the correct security tradeoff, but should be load-tested at enterprise-scale row counts before a large customer goes live, not assumed safe by extrapolation from today's data volumes.

## 6. Scalability

**Current state:** Single-region Postgres (`nursery_os` database, `nursery`/`nursery_app` role separation for least-privilege RLS enforcement — see the Sprint 10 identity/security work). No caching layer, no read replicas, no background job infrastructure exists yet — every request is synchronous request/response against the primary database.

**What's required as customer count and data volume grow:**
- **Read replicas** for reporting/analytics workloads (§5's server-side aggregation, once built, is the natural first consumer) so heavy analytical queries don't compete with transactional traffic (check-ins, enrollments) on the primary.
- **Background job infrastructure** for anything that shouldn't block a request-response cycle: recurring billing generation (§Billing in [feature-map.md](./feature-map.md)), WhatsApp message delivery (§Communication), scheduled reports (§Reports). None of this exists today because nothing in the product yet needs it — this becomes necessary starting in [roadmap.md](./roadmap.md) Phase 2-3, not before.
- **Multi-region consideration** — deferred entirely until international expansion beyond MENA is a committed near-term plan (see [vision.md](./vision.md) long-term vision); premature multi-region infrastructure would add operational complexity with no current customer benefit.
- **Rate limiting / abuse protection** on public-facing surfaces once they exist (the future public Admissions inquiry form, the future public API in [feature-map.md](./feature-map.md)'s cross-domain future capabilities) — not needed for the current fully-authenticated-admin-app surface area.

## 7. Permissions

**Current state:** Three fixed roles — `OWNER`, `ADMIN`, `STAFF` — enforced via a `Role` **lookup table** (not a native database enum), a deliberate choice the domain model documents as chosen specifically "to make [custom roles] additive later." Role-gating today is consistently enforced server-side (every module's controller uses `@Roles(...)` decorators, never UI-hiding alone — see [product-principles.md](./product-principles.md) principle 18), with one notable precedent for narrower, sensitive-data gating: Payroll and Membership are both OWNER/ADMIN-only for *both read and write*, unlike every other domain module where STAFF gets read access — this is the existing template for how a future fine-grained permission need gets handled *before* a real permission system exists.

**What's required:**
- A `Permission`/`RolePermission` model (already anticipated by the `Role` lookup-table design, per the domain model's own deferred-entities table, calling this "Phase 2 of Identity's RBAC") — custom, tenant-defined roles composed of individual permissions, rather than the current fixed three.
- This is the explicit gate for the **Medical** module ([feature-map.md](./feature-map.md#medical)) — the domain model flags Medical Records as needing fine-grained permissions specifically, "not just roles," before it can be built responsibly. Do not build Medical Records against the current three-tier role model as a stopgap; wait for this permission layer.
- Per-branch role scoping once §1's Branch model exists — a user might be ADMIN at one branch and have no access at another, which the current single-tenant-membership-per-user model doesn't yet express (though, per §2, the underlying `TenantMembership` design already anticipated needing to loosen this).

## 8. Auditing

**Current state:** Every domain table already tracks `createdBy`/`updatedBy`/`createdAt`/`updatedAt`, and several tables (Attendance's `checkedInBy`/`checkedOutBy`) use dedicated, write-once actor references specifically so they can't be silently overwritten by an unrelated correction — a real, already-implemented auditing primitive, not a gap. What's genuinely missing: `created_by`/`updated_by` alone can answer "who last touched this row," but never "who *viewed* this row," and never "what did this row look like before the last change" (no history/versioning on any table).

**What's required:**
- A dedicated `AuditLog` table — already flagged in the domain model's own deferred-entities table as "recommended to be pulled forward to whichever ships first among incidents/medical records," i.e. this should land *before or alongside* the Medical module in [roadmap.md](./roadmap.md) Phase 4, not after.
- View-level audit logging (who accessed a Medical Record or Payroll record, not just who changed it) — required specifically for the sensitive modules named in §7, likely unnecessary overhead for lower-sensitivity modules like Classroom or Enrollment.
- Change-history/versioning on financially or legally significant records (Payroll — already flagged in [feature-map.md](./feature-map.md#payroll) as a revisit candidate; Invoice status transitions) — distinct from general `AuditLog`, since this is about reconstructing *what a record said at a point in time*, not just *who touched it*.

## 9. Compliance

**Current state:** No region-specific compliance features exist yet — this is genuinely unscoped territory, not a case of "backend exists, frontend pending" like several other domains in this document.

**What's required:**
- **Licensing/regulatory reporting** — childcare providers in most jurisdictions must report staff-to-child ratios, attendance records, and incident logs to a local licensing authority in a specific format. The Attendance and (future) Incident data models should remain the single source of truth, with region-specific *export* formats built as a thin layer on top (consistent with §4 Regional localization's same principle) — never region-specific data collection.
- **Data residency** — some jurisdictions (increasingly, data-protection regimes across MENA and beyond) require certain categories of data to be stored within-region. This is a real constraint on the eventual multi-region/scalability decisions in §6 and should be a named input to that decision, not an afterthought once infrastructure choices are already locked in.
- **Data retention and deletion rights** — the product's existing soft-delete-everywhere convention (`deletedAt`/`deletedBy` on every table, [product-principles.md](./product-principles.md) principle 11) satisfies "recoverability" but is in direct tension with a parent's eventual right to request permanent erasure of their child's data under some regional data-protection frameworks — a genuine open design question to resolve before Medical or other highly sensitive modules collect data subject to such requirements, not something the current architecture already answers.
- **Consent management** — particularly relevant once Medical/Learning modules (Phase 4) collect sensitive child data, and once Marketing (Phase 5) sends any communication — needs an explicit consent record per guardian/data category, which doesn't exist in any form today.

---

## Summary: dependency order

Several items above are not independently sequenceable — this is the dependency order [roadmap.md](./roadmap.md) Phase 4 should follow within itself:

1. **Permissions (§7)** first — Medical (§9's compliance needs, [feature-map.md](./feature-map.md#medical)) and per-branch role scoping (§1) both depend on it.
2. **Branch model (§1)** next — Large-organization features (§2) and per-branch permission scoping (§7) both depend on it existing first.
3. **AuditLog (§8)** alongside or just before Medical Records, per the domain model's own explicit recommendation.
4. **Performance/Scalability work (§5-6)** can proceed in parallel with the above — it's triggered by data-volume thresholds, not by another Enterprise feature landing first.
5. **Multi-language (§3) and Regional localization (§4)** are the least coupled to the rest of this document and can be sequenced independently, driven by which new region is actually being entered next (see [vision.md](./vision.md) long-term vision).
6. **Compliance (§9)** beyond the consent-record item is inherently region-specific and should be scoped per actual target region at the time of entry, not built speculatively ahead of a concrete regulatory requirement.
