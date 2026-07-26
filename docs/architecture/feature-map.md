# Nursery OS — Feature Map

**Status:** Living document — Part of the Nursery OS Product Bible. This is the complete feature inventory of Nursery OS, organized by domain and tier. Update this document the moment any feature ships, changes tier, or a new domain is scoped — it is the single source of truth [pricing-strategy.md](./pricing-strategy.md) and [roadmap.md](./roadmap.md) are built from.

**Tier definitions** (aligned to [pricing-strategy.md](./pricing-strategy.md)'s three plans, plus a fourth bucket for unscoped work):
- **MVP** — the foundational feature set every customer gets, roughly equivalent to the Starter plan. Prioritizes the smallest nursery's core daily operation.
- **Professional** — features that become valuable once a nursery has hired staff/managers and formal processes (medium-sized nurseries).
- **Enterprise** — features needed to run multiple branches, large headcounts, or franchise-style operations.
- **Future** — scoped conceptually, not yet committed to a specific phase or plan (see [roadmap.md](./roadmap.md) for phase mapping).

**Status legend:** ✅ Built (backend + frontend) · ⚙️ Backend only, frontend pending · ⬜ Not started.

---

## Admissions

Pre-enrollment: the pipeline before a family becomes a paying customer with an enrolled child. Distinct from **Enrollment** (below), which is the post-acceptance classroom-placement workflow — already built.

- **MVP:** Inquiry capture form (public, embeddable) ⬜; manual inquiry log (name, contact, child age, desired start date) ⬜; simple pipeline stages (Inquiry → Tour Scheduled → Applied → Accepted → Enrolled) ⬜.
- **Professional:** Tour scheduling with calendar sync ⬜; automated inquiry follow-up reminders ⬜; waitlist-to-admission conversion tracking (built on top of Enrollment's existing WAITLISTED status) ⬜.
- **Enterprise:** Multi-branch admissions pipeline with cross-branch waitlist visibility ⬜; admissions capacity forecasting ⬜.
- **Future:** Online application forms with document upload ⬜; admissions-to-CRM handoff automation (see **Automation**) ⬜.

## CRM

Relationship and inquiry management beyond active families — prospects, past families, referral sources.

- **MVP:** Not scoped for MVP — Admissions' basic inquiry log covers the minimum for a small nursery.
- **Professional:** Prospect/lead list separate from active Guardians ⬜; referral source tracking ⬜; lost-inquiry reasons ⬜.
- **Enterprise:** Full CRM pipeline with stages, owners, and follow-up tasks ⬜; multi-branch lead routing ⬜.
- **Future:** CRM-to-Marketing automation (nurture sequences), integration with **Marketing CRM** (see Marketing domain) ⬜.

## Children

Core biographical and placement record. **Built and stable.**

- **MVP:** Child profile (first/last name, DOB, gender, photo) ✅; Classroom placement history via Enrollment state machine (Active/Waitlisted/Withdrawn, with reasons) ✅; Guardian linking (relationship type, primary/emergency contact, pickup authorization) ✅.
- **Professional:** Photo upload (currently a URL field only, not a real upload flow) ⬜; document attachments (birth certificate, immunization records) ⬜; child-level notes/tags ⬜.
- **Enterprise:** Custom fields per tenant ⬜; bulk import/export ⬜.
- **Future:** Full **Learning** profile integration (see below) ⬜; sibling relationship linking ⬜.

## Guardians

Parent/guardian contact and relationship records. **Built and stable.**

- **MVP:** Guardian profile (name, phone, email) ✅; multi-child linking with relationship metadata ✅; optional portal-login link ✅.
- **Professional:** Guardian self-service portal login flow (backend link exists; no actual parent-facing login/portal UI yet) ⬜; document sharing with guardians ⬜.
- **Enterprise:** Guardian household/billing-account grouping (split billing across guardians — noted as a deferred backend entity, `BillingAccount`, in the domain model) ⬜.
- **Future:** Guardian communication preference center (channel, language, frequency) ⬜.

## Staff

Employment/profile records. **Built and stable.**

- **MVP:** Staff profile (name, position, hire date, classroom assignment) ✅; optional portal-login link with membership-status visibility ✅.
- **Professional:** **Payroll** as a fully separate module (see below) ✅ *(deliberately isolated from Staff per current architecture, OWNER/ADMIN-only)*; staff document storage (contracts, certifications) ⬜.
- **Enterprise:** Multi-branch staff assignment ⬜; role/permission customization beyond the current OWNER/ADMIN/STAFF three-tier model ⬜.
- **Future:** **Scheduling**/Shifts (explicitly deferred in the domain model in favor of a future dedicated module, superseding the earlier `ClassroomStaff` join-table concept) ⬜; **Recruitment** pipeline ⬜; **Leave Management** ⬜.

## Payroll

Compensation tracking. **Built and stable**, fully isolated from Staff by deliberate design (separate routes/contracts/API, OWNER/ADMIN-only for both read and write).

- **MVP:** Not included — payroll is a Professional-tier concern; small home daycares typically handle pay informally.
- **Professional:** Single current pay record per staff member (pay type, rate, frequency, currency, effective date) ✅ — simple and mutable by design, no history retained on change (a documented, deliberate MVP tradeoff for this feature, revisit if a real "raise history" need emerges).
- **Enterprise:** Payroll history/versioning (revisit the current mutable-record decision once retained pay history is a real customer requirement) ⬜; payroll export/integration with external accounting or bank-transfer systems ⬜; multi-currency payroll across branches ⬜.
- **Future:** Automated payroll runs tied to **Attendance**/Scheduling ⬜; tax/compliance calculations per jurisdiction ⬜.

## Attendance

Daily check-in/check-out. **Built** (backend + frontend) — Attendance module (tenant-local-date-aware, `checkedInBy`/`checkedOutBy` actor tracking, one record per child per day) plus a tablet-first classroom daily roster (check-in/check-out/mark-absent via a bottom-sheet drawer, per [design-system.md §6.2](./design-system.md#62-tablet-optimization-the-priority-device--teachers-front-desk)) and an OWNER/ADMIN correction workflow (audit history list + detail + correction form).

- **MVP:** Daily check-in/check-out per child ✅; mark-absent ✅; classroom-scoped daily attendance view (frontend) ✅; correction workflow for OWNER/ADMIN ✅.
- **Professional:** Attendance reports (by child, by classroom, by date range) ⬜; late-pickup / early-drop-off flagging ⬜.
- **Enterprise:** Multi-branch attendance rollup ⬜; compliance-oriented attendance exports (ratio reporting for licensing bodies) ⬜.
- **Future:** QR-code check-in (named explicitly in the product's Egypt/GCC requirements) ⬜; session-based attendance — multiple check-in/out per day (explicitly deferred in the domain model as a purely additive future change) ⬜; biometric/photo-based check-in ⬜.

## Activities

Daily classroom activity logging (what a child did today).

- **MVP:** Not included.
- **Professional:** Simple daily activity log per child (free text or quick-select tags: nap, meal, playtime, diaper change) ⬜; teacher-facing quick-entry UI, one-handed tablet optimized (see [design-system.md §6.2](./design-system.md#62-tablet-optimization-the-priority-device--teachers-front-desk)) ⬜.
- **Enterprise:** Activity templates per classroom/age-group ⬜; activity analytics (time-of-day patterns) ⬜.
- **Future:** Photo/video attachment per activity entry, shared to parents in real time ⬜.

## Learning

Curriculum, milestones, and developmental tracking — this is what separates a childcare *management* tool from a true early-childhood-education platform.

- **MVP:** Not included.
- **Professional:** Not included — this is a differentiated, higher-tier capability.
- **Enterprise:** Curriculum/lesson plan library ⬜; developmental milestone tracking per child ⬜; teacher lesson-plan authoring tools ⬜.
- **Future:** **Learning Journey** portfolios shared with parents ⬜; **Assessments** against developmental frameworks ⬜; **AI Lesson Planning** (see AI domain) ⬜.

## Meals

Meal planning and tracking.

- **MVP:** Not included.
- **Professional:** Daily meal log per child (what was eaten, portion, allergy flag) ⬜; classroom meal plan of record ⬜.
- **Enterprise:** Menu planning with nutritional/allergy compliance checks ⬜; multi-branch menu templates ⬜.
- **Future:** Integration with **Billing** for meal-plan fee add-ons ⬜.

## Medical

Health records, incidents, medication administration — explicitly flagged in the domain model as needing fine-grained permissions beyond simple role-based access before it can be built responsibly.

- **MVP:** Not included.
- **Professional:** Basic allergy/condition flag on the Child profile ⬜.
- **Enterprise:** Full `MedicalRecord` (deferred in domain model, pending fine-grained permission model) ⬜; `MedicationAdministration` logging with dual-signoff ⬜; `Incident` reporting with guardian notification ⬜.
- **Future:** Integration with local health-authority reporting requirements (regional compliance, see [enterprise-roadmap.md](./enterprise-roadmap.md)) ⬜.

## Transportation

Bus/pickup route management — not present in the current domain model at all; genuinely new scope.

- **MVP:** Not included.
- **Professional:** Not included.
- **Enterprise:** Route and vehicle management ⬜; child-to-route assignment ⬜; parent notification on pickup/drop-off (ties into **Communication**) ⬜.
- **Future:** Live GPS tracking, driver app ⬜.

## Billing

Invoicing and fee management. **Backend built** (`Invoice`, `InvoiceLineItem` models — status lifecycle DRAFT/ISSUED/PARTIALLY_PAID/PAID/OVERDUE/VOID, `OVERDUE` derived at read time rather than stored), **no frontend yet**.

- **MVP:** Manual invoice creation and line items ⚙️; invoice status lifecycle ⚙️; frontend for creating/viewing invoices ⬜.
- **Professional:** Recurring billing plans (monthly tuition auto-generation) ⬜; late-fee automation ⬜; discount/sibling-rate rules ⬜.
- **Enterprise:** Multi-branch consolidated billing ⬜; guardian-level billing-account splitting (the deferred `BillingAccount`/`BillingAccountGuardian` entities) ⬜.
- **Future:** Government/subsidy billing integrations where applicable per region ⬜.

## Payments

Recording and reconciling payment against invoices. **Backend built** (`Payment` model — an invoice can have many payments, enabling partial payment without special-casing), **no frontend yet**.

- **MVP:** Manual payment recording against an invoice ⚙️; frontend for recording/viewing payments ⬜; cash payment support (a first-class method, not an edge case, per [vision.md](./vision.md)) ⬜.
- **Professional:** Vodafone Cash integration ⬜; InstaPay integration ⬜; bank transfer reconciliation workflow ⬜.
- **Enterprise:** Card/online payment gateway integration ⬜; automated payment reconciliation against bank statements ⬜.
- **Future:** Parent-initiated payments from the **Parent App** ⬜; payment plans/installments ⬜.

## Accounting

General ledger, expenses, and financial reporting beyond invoice/payment tracking — entirely new scope, not present in the current domain model.

- **MVP:** Not included.
- **Professional:** Basic expense tracking ⬜; simple profit/loss view (revenue from Payments minus logged Expenses) ⬜.
- **Enterprise:** Chart of accounts ⬜; multi-branch consolidated financials ⬜; export to external accounting systems (QuickBooks-equivalent regional tools) ⬜.
- **Future:** Full double-entry accounting module ⬜.

## Reports

Operational reporting across modules.

- **MVP:** None — early-stage reliance on list-page filtering within each module.
- **Professional:** Per-module exportable reports (attendance by date range, enrollment status, payroll summary) ⬜.
- **Enterprise:** Cross-module scheduled reports (emailed/exported on a cadence) ⬜; custom report builder ⬜.
- **Future:** Natural-language report requests (see **AI**) ⬜.

## Analytics

Trend analysis and business intelligence, distinct from Reports (point-in-time exports) — this is dashboards and visualizations over time.

- **MVP:** Dashboard v1 — stat cards and attention list aggregated client-side from existing module data, zero new backend required (see [design-system.md §12](./design-system.md#12-dashboard-vision)) ⬜. Treated as MVP, not Professional, despite being "analytics" in category — it's the product's stated control-center gap and belongs in the foundational tier every customer gets (see [pricing-strategy.md](./pricing-strategy.md)).
- **Professional:** None beyond MVP's Dashboard v1 — no additional analytics gated at this tier.
- **Enterprise:** Trend charts (enrollment over time, revenue over time — see [design-system.md §5.17](./design-system.md#517-charts)) ⬜; occupancy/capacity forecasting ⬜; multi-branch comparative analytics ⬜; server-side aggregation replacing Dashboard v1's client-side aggregation once scale requires it (see [enterprise-roadmap.md](./enterprise-roadmap.md)) ⬜.
- **Future:** **AI Reports** — AI-generated narrative insights over the same underlying data ⬜.

## Marketing

Demand generation, distinct from CRM (which manages inbound inquiries once they exist).

- **MVP:** Not included.
- **Professional:** Not included.
- **Enterprise:** Referral program tracking ⬜; campaign tracking tied to Admissions pipeline source ⬜.
- **Future:** **Marketing CRM** automation (nurture sequences, lifecycle campaigns) ⬜; integration with the future **Website Builder** for lead capture ⬜.

## Parent App

The parent-facing surface. Currently, parents have no dedicated experience at all — the only guardian-facing capability today is an optional backend portal-login *link* on the Guardian record, with no actual parent-facing screens built.

- **MVP:** Guardian portal login (activate the existing backend link with a real parent-facing UI) ⬜; view own child(ren)'s profile, enrollment status, and basic attendance ⬜.
- **Professional:** View/pay invoices ⬜; receive daily activity updates (see Activities domain) ⬜; WhatsApp-first notification delivery (per [vision.md](./vision.md)) ⬜.
- **Enterprise:** Multi-child, multi-branch parent view (a guardian with children at more than one branch) ⬜.
- **Future:** Native mobile app (as opposed to a responsive web portal) ⬜; **Learning Journey** viewing ⬜; direct messaging with teachers (see **Communication**) ⬜.

## Teacher App

The front-line staff experience — today, teachers use the same general admin web app as everyone else, with role-gated visibility (STAFF role can read most domain data, cannot manage Payroll/Memberships) but no dedicated, task-optimized surface.

- **MVP:** Tablet-optimized attendance check-in flow ✅ — shipped as part of Attendance's classroom daily roster (44px touch targets, bottom-sheet actions), reachable via the general nav like any other module; not yet packaged as a dedicated, persona-locked Teacher App surface (see Professional below).
- **Professional:** Activity/meal/nap quick-logging optimized for one-handed tablet use ⬜; classroom roster quick-view ⚙️ (Attendance's roster already *is* a classroom-scoped quick-view of today's check-in state, but reused as a general-nav screen, not built as this dedicated Teacher App surface).
- **Enterprise:** Cross-classroom coverage view (for float/substitute teachers) ⬜.
- **Future:** Dedicated native Teacher App (as opposed to a responsive web view) ⬜; **AI**-assisted note-to-parent-update drafting ⬜.

## Communication

Messaging between the nursery and parents/staff. Nothing exists today beyond internal system-generated (non-chat) UI feedback.

- **MVP:** Not included.
- **Professional:** WhatsApp-integrated broadcast messaging (classroom-wide or nursery-wide announcements) — named explicitly in the product's regional requirements ⬜.
- **Enterprise:** Two-way threaded messaging (`Conversation`/`ConversationParticipant`/`Message`, explicitly deferred in the domain model, explicitly scoped as *not* a naive 1:1 chat — a thread about one child typically involves multiple guardians and staff) ⬜.
- **Future:** In-app notification center unifying WhatsApp, email, and in-app channels with per-guardian preference (see Guardians domain) ⬜.

## AI

Assistive and generative capability layered over the rest of the product — deliberately sequenced last (see [roadmap.md](./roadmap.md) Phase 5), since it depends on mature, clean data across every other domain.

- **MVP / Professional / Enterprise:** Not included at any current tier — AI is a Phase 5 capability, not gated into the first three tiers.
- **Future:** AI Assistant (natural-language operations, "who hasn't paid this month?") ⬜; AI Reports (narrative analytics) ⬜; AI Lesson Planning ⬜; AI Parent Communication (drafting daily updates from teacher shorthand notes) ⬜.

## Automation

Rules-based workflow automation, distinct from AI (deterministic rules vs. generative/inferred behavior).

- **MVP:** None.
- **Professional:** Automated late-fee application (ties into Billing) ⬜; automated attendance-absence-to-guardian-notification (ties into Attendance + Communication) ⬜.
- **Enterprise:** Configurable automation rules per tenant (if-this-then-that style workflows across modules) ⬜.
- **Future:** Admissions-to-CRM-to-Marketing lifecycle automation ⬜.

## Website

Public-facing marketing site / enrollment landing pages for a nursery's own branding — not the Nursery OS product's own marketing site, but a capability *for customers* to run their nursery's public presence.

- **MVP / Professional:** Not included.
- **Enterprise:** Not included — this is a Future/Phase 5 capability.
- **Future:** **Website Builder** for individual nursery branding, tied to **Admissions** inquiry capture ⬜.

## Settings

Tenant configuration. Currently a **placeholder page** (`PagePlaceholder`, "Coming soon") with zero implemented settings beyond what already lives implicitly in the Identity module (tenant timezone, role/membership management via the Memberships backend with no dedicated settings-page frontend).

- **MVP:** Tenant profile (name, timezone — already a backend field, needs a settings UI) ⬜; membership/role management UI (backend fully exists — `TenantMembership` invite/accept/update — with no dedicated settings-page frontend yet, currently only reachable indirectly through Staff's linked-user flows) ⬜.
- **Professional:** Branding (logo, primary color) for use across parent-facing surfaces ⬜; notification preferences ⬜.
- **Enterprise:** Multi-branch settings hierarchy (tenant-level defaults with per-branch overrides) ⬜; custom role/permission definitions beyond OWNER/ADMIN/STAFF ⬜.
- **Future:** API key management for the future **API**/**Marketplace**/**Integrations** capability ⬜.

---

## Cross-domain future capabilities (not owned by one domain)

- **API** — public API for third-party integrations. Future, Enterprise-tier.
- **Marketplace** — third-party integration/plugin ecosystem. Future.
- **Integrations** — pre-built connectors (accounting software, government reporting, payment gateways). Future, phased in alongside the domains they connect to (Payments, Accounting).
- **Multi-Branch / Franchises** — cross-cutting architectural capability rather than a single domain; see [enterprise-roadmap.md](./enterprise-roadmap.md) for the full treatment.
