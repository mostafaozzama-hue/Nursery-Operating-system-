# Nursery OS — Pricing Strategy

**Status:** Living document — Part of the Nursery OS Product Bible. This document defines the three commercial plans and maps them directly onto the tiers already defined in [feature-map.md](./feature-map.md) — it does not re-derive a separate feature list. When a feature's tier changes in the feature map, this document's plan contents change with it; update both together.

Target-customer segments referenced below are defined in [vision.md](./vision.md) (small/medium/enterprise nursery).

---

## Design principles for pricing

1. **One product, three plans — never a re-platform.** Per [product-principles.md](./product-principles.md) principle 27, the same application serves all three plans; upgrading is a permissions/feature-flag change, never a migration to different software.
2. **Every plan must feel complete for its target customer**, not artificially crippled. A Starter-plan owner should never feel the product is broken — only that certain growth-stage capabilities aren't included yet.
3. **Local payment methods are never a paywall.** Cash, Vodafone Cash, InstaPay, and bank transfer (see [vision.md](./vision.md)) are available on every plan, including Starter — regional payment fit is a core differentiator, not an upsell.
4. **Sensitive/HR-adjacent modules (Payroll, Medical) gate on plan, not on a per-seat add-on fee**, to keep the pricing model simple and legible to a non-technical owner.

---

## Starter

**Target customer:** Small nursery / home daycare, 5–20 children, single site, owner-operator with minimal or no hired administrative layer (see [vision.md](./vision.md) "Small nursery / home daycare" segment).

**Included modules** (= feature-map.md's **MVP** tier, in full):
- Children, Guardians, Child-Guardian relationships
- Classrooms, Enrollment (including waitlist/transfer/withdrawal workflow)
- Staff profiles (without Payroll)
- Attendance (check-in/check-out/absence, once its frontend ships — see [roadmap.md](./roadmap.md))
- Manual Billing and Payments recording (once their frontend ships), including cash, Vodafone Cash, InstaPay, and bank transfer as first-class methods
- Basic tenant Settings (profile, timezone, membership/role management)
- Dashboard v1 (occupancy, headcount, attention list — see [design-system.md §12](./design-system.md#12-dashboard-vision))

**Limitations:**
- Single branch/site only.
- No Payroll module (Staff records exist; formal compensation tracking is a Professional-plan capability).
- No recurring billing automation, late-fee automation, or custom reporting — invoicing is manual, one at a time.
- No CRM/Admissions pipeline beyond a simple inquiry log.
- Standard OWNER/ADMIN/STAFF roles only — no custom permission definitions.
- Directory-style lookups (classroom/staff pickers) are bounded to the current 100-record page size — a non-issue at this tier's scale (see [enterprise-roadmap.md](./enterprise-roadmap.md) for why this matters at larger scale).

**Upgrade path:** Moves to Professional the moment the nursery hires beyond an informal, cash-paid staff arrangement (needs Payroll), or needs recurring billing instead of manual monthly invoicing — both natural "the business is growing" signals, not arbitrary limits.

---

## Professional

**Target customer:** Medium nursery, 20–100 children, single site, with a hired staff/manager layer delegating day-to-day operations (see [vision.md](./vision.md) "Medium nursery" segment). This is expected to be the primary revenue-driving plan.

**Included modules** (Starter, plus feature-map.md's **Professional** tier):
- Everything in Starter
- **Payroll** (fully isolated, OWNER/ADMIN-only — already built and stable)
- Recurring billing plans, late-fee automation, discount/sibling-rate rules
- Vodafone Cash / InstaPay integration (as opposed to Starter's manual recording of the same methods)
- Activities, Meals daily logging
- CRM (prospect/lead list, referral tracking) and richer Admissions (tour scheduling, automated follow-up)
- WhatsApp-integrated broadcast messaging (Communication domain)
- Per-module exportable reports
- Guardian self-service portal (view invoices, activity updates)
- Branding customization (logo, primary color) on parent-facing surfaces

**Limitations:**
- Single branch/site still (Multi-Branch is Enterprise-only, see [enterprise-roadmap.md](./enterprise-roadmap.md)).
- No custom role/permission definitions beyond OWNER/ADMIN/STAFF.
- No Learning/curriculum module, no Medical records module (both Enterprise-tier — Medical in particular is gated on the fine-grained permission model described in [enterprise-roadmap.md](./enterprise-roadmap.md), not just plan tier).
- No cross-branch analytics (single-site analytics only).
- No custom report builder — fixed report templates only.

**Upgrade path:** Moves to Enterprise when the nursery opens a second branch, needs custom roles/permissions beyond the standard three, or needs Medical/Learning modules that require the more granular permission model those modules depend on.

---

## Enterprise

**Target customer:** Enterprise nursery or multi-branch chain, 100+ children, possibly multiple sites, potentially working toward franchising (see [vision.md](./vision.md) "Enterprise nursery / chain" segment).

**Included modules** (Professional, plus feature-map.md's **Enterprise** tier):
- Everything in Professional
- **Multi-Branch** operation — see [enterprise-roadmap.md](./enterprise-roadmap.md) for the full architectural treatment (tenant hierarchy, cross-branch reporting, per-branch settings overrides)
- Custom role/permission definitions beyond OWNER/ADMIN/STAFF
- Medical records, Learning/curriculum modules
- Transportation module
- Cross-branch consolidated Billing/Accounting and Analytics
- Payroll history/versioning, payroll export integrations
- Full two-way Communication (`Conversation`/`Message` threading, not just broadcast)
- Custom report builder
- Compliance/audit-oriented exports (attendance ratio reporting for licensing bodies, per-region regulatory needs — see [enterprise-roadmap.md](./enterprise-roadmap.md))
- Priority support and (as the platform matures) dedicated onboarding

**Limitations:**
- This plan intentionally does not yet include Phase 5 AI capabilities (AI Assistant, AI Reports, AI Lesson Planning) or the future API/Marketplace/Integrations ecosystem, Website Builder, or full Marketing CRM automation — these remain **Future** tier in [feature-map.md](./feature-map.md) until [roadmap.md](./roadmap.md) Phase 5 is scoped and priced as its own add-on or plan evolution, not assumed included in Enterprise by default.

**Upgrade path:** Enterprise is currently the ceiling plan. As Phase 5 (AI Platform) and cross-cutting future capabilities (API, Marketplace, Website Builder) mature, this document will be revisited to decide whether they become a fourth plan tier, an Enterprise add-on, or a universal upgrade across all plans — that decision is deliberately deferred, not pre-committed here.

---

## Plan comparison summary

| Dimension | Starter | Professional | Enterprise |
|---|---|---|---|
| Target size | 5–20 children | 20–100 children | 100+ children, multi-branch |
| Branches | 1 | 1 | Multiple |
| Payroll | ✗ | ✓ | ✓ (+ history/versioning) |
| Billing automation | Manual only | Recurring + late fees | + consolidated multi-branch |
| Roles/permissions | Fixed 3-tier | Fixed 3-tier | Custom |
| CRM / Admissions | Basic inquiry log | Full pipeline | + cross-branch routing |
| Medical / Learning | ✗ | ✗ | ✓ |
| Communication | WhatsApp broadcast (Professional+) | ✓ | + two-way threading |
| Analytics | Dashboard v1 only | Dashboard v1 only | Trend charts, forecasting, cross-branch |

---

## Open pricing questions (not yet decided — flag for business/GTM input, not a product-architecture decision)

- Per-child vs. per-branch vs. flat-rate pricing model within each plan.
- Whether Payroll should be a Professional-plan-included feature or a metered add-on given its sensitivity and narrower audience.
- Whether local payment-method integrations (Vodafone Cash, InstaPay) carry a transaction fee separate from the subscription price.
- Whether Phase 5 AI capabilities become a fourth "AI" plan tier or an add-on across Professional/Enterprise once scoped.

These are intentionally left open here — this document defines *what's included per plan*, not the commercial pricing model (currency amounts, billing cadence, per-seat vs. flat), which is a GTM/business decision to be layered on top once made.
