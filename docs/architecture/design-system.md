# Nursery OS — UX Architecture & Design System

**Status:** Living document. This is the permanent UX/UI specification for Nursery OS — every current and future screen is expected to conform to it. Update it whenever the product's design language evolves; do not let the codebase drift silently away from what's written here.

**Scope of this version:** Written after Sprint 12 (Children, Guardians, Classrooms, Enrollment, Child-Guardian, Staff, Payroll all implemented on the backend and frontend). No code has been changed as part of writing this document — it is a specification to implement against, not a record of what's already built (see §14 for what's actually built today).

---

## Table of contents

1. [How to use this document](#1-how-to-use-this-document)
2. [Current product assessment](#2-current-product-assessment)
3. [Design philosophy & principles](#3-design-philosophy--principles)
4. [Design tokens](#4-design-tokens)
5. [Core components](#5-core-components)
6. [Responsive & device strategy](#6-responsive--device-strategy)
7. [Accessibility standards](#7-accessibility-standards)
8. [RTL & internationalization](#8-rtl--internationalization)
9. [Component naming conventions](#9-component-naming-conventions)
10. [Reusable page patterns](#10-reusable-page-patterns)
11. [Navigation & information architecture](#11-navigation--information-architecture)
12. [Dashboard vision](#12-dashboard-vision)
13. [Cross-module consistency rules](#13-cross-module-consistency-rules)
14. [Module-by-module audit against this system](#14-module-by-module-audit-against-this-system)
15. [Current UX debt (consolidated)](#15-current-ux-debt-consolidated)
16. [Prioritized UX improvement backlog](#16-prioritized-ux-improvement-backlog)
17. [Future enterprise considerations](#17-future-enterprise-considerations)
18. [Document maintenance](#18-document-maintenance)

---

## 1. How to use this document

- **Before building any new screen**, check §10 (page patterns) and §5 (component specs) first. A new screen that doesn't fit an existing pattern is a signal to *extend the pattern*, not invent a one-off.
- **Before touching an existing screen**, check §14 to see what's already flagged as debt, so fixes aren't duplicated or contradicted.
- **This document changes with the product.** When a new module ships (Attendance, Invoices, Scheduling...), add its audit to §14, fold any new pattern into §5/§10, and re-sequence §16.
- Everything in §4 (tokens) and §5 (components) is a **specification to implement**, not a description of what exists in code today. §14 and §15 are the only sections describing current-as-built reality.

---

## 2. Current product assessment

Nursery OS today is a set of well-built, *structurally consistent* CRUD modules (Children, Guardians, Classrooms, Enrollment, Child-Guardian, Staff, Payroll) that do not yet feel like one connected product:

- The dashboard (`/dashboard`) and Settings (`/dashboard/settings`) are literally placeholder pages ("Coming soon").
- Every list/detail/form follows the same *structural* pattern (good), but there is no shared visual language beyond unmodified shadcn/ui defaults — pure grayscale (oklch neutrals only), no color, no distinctive rounding, native `<select>` elements, no avatars, no cross-entity context anywhere in a list row.
- Cross-module connectivity exists only where a developer manually embedded a section (Enrollment + Guardians inside Child Detail; Children + Staff inside Classroom Detail) — there is no systematic navigation model or dashboard tying modules together.
- No RTL, no i18n library, no dark-mode toggle, no theme switcher, despite Egypt/GCC being the named primary market.
- Backend capabilities are ahead of the frontend in several places: every list endpoint supports `sortBy`/`sortOrder` but `DataTable` has no sort UI at all; every table tracks `createdBy`/`updatedBy` but there's no activity feed anywhere.

This is a strong foundation to design *onto* — the data layer, role-gating, and page-shape conventions are solid and shouldn't be redesigned (per current standing instruction: backend is stable, don't touch it without cause). What's missing is the visual and structural design layer that makes it feel like one product instead of seven generated CRUD apps.

---

## 3. Design philosophy & principles

**Mission restated:** Nursery OS is an operating system for childcare providers, not a form-generator. Every screen must read as part of one connected product.

**The three questions every screen must answer** (from product vision):
1. What is happening?
2. What needs attention?
3. What should I do next?

**Working principles for this design system:**

| Principle | What it means in practice |
|---|---|
| **Calm, not clinical** | Warm neutrals instead of pure gray, soft accent colors instead of monochrome, generous spacing. Never look like enterprise ERP software. |
| **Context over navigation** | Prefer showing related information inline (a classroom's occupancy, a staff member's classroom) over forcing a click-through, wherever it's cheap to compute. |
| **Progressive disclosure at scale** | The same screen must serve a 10-child nursery and a 500-child enterprise chain. Default to compact, dense information; let detail expand on demand (drawers, expandable rows) rather than always showing everything or always hiding everything. |
| **Two-to-three clicks** | Any common task (check a child's status, record a payment, view this week's birthdays) should be reachable in 2-3 interactions from the dashboard. |
| **One-handed on a tablet** | Every teacher-facing action (check-in, attendance, quick notes) must be operable with a thumb, standing up, holding a child. Large touch targets, minimal typing, selection over text entry. |
| **Design once, localize forever** | Every layout decision (spacing, icon placement, alignment) must survive an LTR→RTL flip and an English→Arabic string-length change without a rebuild. |
| **Accessible by default, not by retrofit** | Contrast, focus states, and touch targets are specified up front (§7), not patched in later. |

---

## 4. Design tokens

Nursery OS already uses Tailwind v4's CSS-variable/`@theme inline` token model (see `apps/web/app/globals.css`) with shadcn/ui primitives (`Button`, `Input`, `Label`, `Table`, `Pagination`, `AlertDialog`, `DropdownMenu`, `Sheet`) on top of Radix. The current palette is **pure grayscale oklch** — this section replaces it with a warm, calm, branded palette while keeping the same token *names* (`--primary`, `--secondary`, `--muted`, etc.) so existing components pick up the new look with zero structural changes, plus adds new semantic and per-module accent tokens.

### 4.1 Color palette

**Design intent:** a calm teal-based brand color (trust, care, health — appropriate for childcare, and distinct from every generic SaaS blue), warm neutrals instead of clinical gray, and a small, purposeful set of status/module accent colors. All values in OKLCH (lightness, chroma, hue) to match the existing token system.

**Base neutrals (warm, not pure gray):**

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `oklch(0.99 0.004 90)` | `oklch(0.16 0.006 90)` | Page background |
| `--foreground` | `oklch(0.22 0.01 90)` | `oklch(0.96 0.004 90)` | Primary text |
| `--muted` | `oklch(0.96 0.006 90)` | `oklch(0.24 0.008 90)` | Subtle backgrounds (cards, table stripes) |
| `--muted-foreground` | `oklch(0.52 0.012 90)` | `oklch(0.72 0.01 90)` | Secondary text |
| `--border` | `oklch(0.91 0.007 90)` | `oklch(0.30 0.008 90)` | Dividers, input borders |

**Brand:**

| Token | Light | Dark | Use |
|---|---|---|---|
| `--primary` | `oklch(0.56 0.10 195)` (soft teal) | `oklch(0.72 0.09 195)` | Primary buttons, active nav, links |
| `--primary-foreground` | `oklch(0.99 0 0)` | `oklch(0.16 0.01 195)` | Text/icons on primary |
| `--secondary` | `oklch(0.95 0.015 195)` | `oklch(0.26 0.02 195)` | Secondary buttons, selected states |
| `--secondary-foreground` | `oklch(0.30 0.03 195)` | `oklch(0.92 0.01 195)` | Text on secondary |

**Status colors** (used consistently everywhere — badges, toasts, alerts, dashboard signals):

| Token | Light | Meaning |
|---|---|---|
| `--success` | `oklch(0.63 0.12 150)` (soft green) | Active, paid, on-time, healthy capacity |
| `--warning` | `oklch(0.76 0.14 80)` (soft amber) | Near-capacity, pending, due soon |
| `--destructive` | `oklch(0.58 0.17 25)` (soft coral-red, *not* fire-engine red) | Overdue, over-capacity, destructive actions |
| `--info` | `oklch(0.62 0.10 230)` (soft blue) | Neutral informational states |

**Per-module accent colors** (used only for entity-header accent bars, module icons, and module-scoped badges — never replaces the global brand color for primary actions):

| Module | Token | Value | Rationale |
|---|---|---|---|
| Children / Enrollment | `--accent-children` | `oklch(0.66 0.11 250)` (soft periwinkle) | Education/growth association |
| Guardians | `--accent-guardians` | `oklch(0.62 0.10 320)` (soft plum) | Family/relationship warmth |
| Classrooms | `--accent-classrooms` | `oklch(0.66 0.11 150)` (soft green) | Space, growth |
| Staff | `--accent-staff` | `oklch(0.58 0.09 200)` (soft teal, close to brand) | People, trust |
| Payroll / Finance | `--accent-finance` | `oklch(0.72 0.13 80)` (soft gold) | Money, value |

**Rules:**
- Never use a status or module color as body text color — only for accents, badges, icons, left-border stripes, and chart series.
- Destructive actions always pair `--destructive` with a confirmation step (§5.12) — color alone never signals an irreversible action.
- Dark mode mirrors the same hue/chroma pairs at inverted lightness (shadcn's existing `.dark` class convention — keep it).

### 4.2 Typography

Current font is **Geist** (`next/font/google`, already wired in `app/layout.tsx` as `--font-sans`) — a clean geometric humanist sans that already fits the "modern, friendly, not ERP" brief. Keep it; no font change needed.

**Type scale** (Tailwind text utilities, one consistent scale used everywhere — no ad-hoc font sizes):

| Role | Size / line-height | Weight | Usage |
|---|---|---|---|
| Display | 28px / 36px | 600 | Dashboard hero numbers only |
| Page title | 22px / 30px | 600 | `PageTitle` component (entity name, page heading) |
| Section heading | 16px / 24px | 600 | Card/section headers ("Guardians", "Enrollment history") |
| Body | 14px / 20px | 400 | Default text, table cells, form values |
| Small / meta | 12px / 16px | 400 | Timestamps, helper text, badge labels |
| Label | 13px / 16px | 500 | Form field labels (slightly heavier than body, per existing `Label` component) |

Rule: exactly these six sizes exist in the system. Any component asking for a seventh size is a signal to reconsider the layout, not add a token.

### 4.3 Spacing system

4px base unit, Tailwind's default scale used consistently: `1` (4px) → `2` (8px) → `3` (12px) → `4` (16px) → `6` (24px) → `8` (32px) → `12` (48px).

| Context | Spacing |
|---|---|
| Inside a form field (label→input gap) | `1.5` (6px) — matches current `gap-1.5` already used in forms |
| Between form fields | `4` (16px) |
| Card/section internal padding | `6` (24px) |
| Between stacked cards/sections on a detail page | `6` (24px) |
| Page margin (content area) | `6` (24px) desktop, `4` (16px) mobile |
| Table cell padding | `3` vertical / `4` horizontal |

### 4.4 Border radius

Current `--radius: 0.625rem` (10px) is a reasonable base — keep it as the system default, but define an explicit scale so "rounded, friendly, never ERP" is consistent rather than accidental:

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Badges, small chips |
| `--radius-md` | 10px (current default) | Inputs, buttons, table containers |
| `--radius-lg` | 16px | Cards, dialogs, drawers |
| `--radius-full` | 9999px | Avatars, status dots, pill badges |

Rule: nothing in the product should have a hard 0px corner except full-bleed table dividers.

### 4.5 Shadows

Current app has effectively no shadow usage (flat, bordered surfaces). Introduce a minimal, restrained elevation scale — soft and diffuse, never a hard drop-shadow (which reads as "old enterprise software"):

| Token | Spec | Use |
|---|---|---|
| `--shadow-sm` | `0 1px 2px oklch(0 0 0 / 0.04)` | Cards at rest |
| `--shadow-md` | `0 4px 12px oklch(0 0 0 / 0.06)` | Dropdowns, popovers |
| `--shadow-lg` | `0 12px 32px oklch(0 0 0 / 0.10)` | Dialogs, drawers |

Rule: flat bordered surfaces (current style) remain fine for tables and list containers; shadows are reserved for anything that floats above the page (menus, dialogs, drawers, toasts).

---

## 5. Core components

Each entry: current state (if it exists today) → target spec.

### 5.1 Buttons
- **Today:** shadcn `Button` — variants `default`/`outline`/`ghost`/`destructive`/**`success`** (added for Attendance's Check In action), sizes `default`/`sm`/`xs`/`lg`/**`touch`** (44px, added for Attendance's tablet roster)/`icon`/`icon-sm`/`icon-xs`/`icon-lg`/**`icon-touch`**. The `success` variant and `touch`/`icon-touch` sizes exist but are only consumed by Attendance so far.
- **Target:** apply new color tokens (§4.1) product-wide — primary buttons = teal (not yet done; `success`/`warning`/`info`/`destructive` semantic tokens exist in `globals.css`, but `--primary`/`--secondary`/module accents are still the original grayscale). Icon-only buttons always carry an `aria-label`.

### 5.2 Inputs
- **Today:** shadcn `Input`, 32px height (`h-8`), functional but cramped for tablet use.
- **Target:** default height 40px (36px allowed only in dense table-inline contexts). Border uses `--border`, focus ring uses `--ring` derived from `--primary` (currently generic gray ring — should tint teal). Always paired with a `Label` above (current pattern, keep) and inline error text below in `--destructive` at the "Small/meta" type size.

### 5.3 Selects
- **Today:** a styled `Select` primitive (`components/ui/select.tsx`, Radix-based) now exists, built for Attendance's status/classroom filters — but every pre-existing enum field is unchanged: raw native `<select>` styled by hand in a few forms (`link-guardian-form.tsx`), while other enum fields (Gender) are plain free-text inputs — **inconsistent field-type policy** (see §13, rule 3).
- **Target:** every enum/closed-vocabulary field (Gender, relationship type, pay type, pay frequency, classroom, staff, membership) uses the same searchable-select pattern. Two variants:
  - **Simple select** (< 8 options, e.g. Pay type, Gender): a styled dropdown, not raw `<select>`.
  - **Searchable picker** (open-ended or large lists, e.g. Classroom/Staff/Guardian/Membership pickers): keep the existing search-then-select pattern (§9 notes on consolidating the 5 current picker implementations into one shared component).

### 5.4 Date pickers
- **Today:** raw native `<input type="date">` everywhere (Hire date, Effective date, DOB, enrollment dates). Functional, but visually inconsistent with the rest of the design language and weak on mobile Safari/Android WebView consistency.
- **Target:** a single shared `DatePicker` component wrapping the native input with consistent styling (rounded, bordered, calendar icon), reserving a true calendar-popover component only if/when a range-picker is needed (not required for current fields). Always locale-aware (§8): Gregorian display, but keep the door open for Hijri as a future toggle per tenant.

### 5.5 Cards
- **Today:** a `Card`/`CardHeader`/`CardTitle` primitive (`components/common/card.tsx`) exists — surface `--background`, border `--border`, radius `--radius-lg`, padding `6`, `shadow-sm` — and is used on Attendance Detail and Invoice Detail (Details/Line items/Payments each their own `Card`). Every other detail page (Child, Guardian, Classroom, Staff, Payroll) is still a bare `<dl>` two-column field list directly on the page background.
- **Target:** roll `Card` out to every detail page (see §10.1). Section header uses the "Section heading" type style with an optional module accent-colored left border (2px) matching §4.1 — not yet added to the component.

### 5.6 Tables
- **Today:** `components/common/data-table.tsx` now supports clickable sortable headers (`sortKey`/`sortBy`/`sortOrder`/`onSortChange` props) and renders `Skeleton` placeholder rows while loading, both added for Attendance. `AttendanceList` and `InvoiceList` (the latter sorting by `totalAmount`) pass `sortKey` on their columns — Children/Guardians/Classrooms/Staff/Payroll lists still render plain, unsorted headers despite the capability now existing in the shared component (see ux-debt.md UXD-4a). No row selection, no bulk actions, no sticky header yet anywhere.
- **Target:**
  - Wire `sortKey` into the remaining pre-existing lists' columns (pure per-module wiring now, no `DataTable` change needed).
  - Optional row-selection checkboxes + a contextual bulk-action bar, added when a real bulk workflow exists (not speculatively).
  - Sticky header on scroll for long lists.
  - Zebra striping using `--muted` at low opacity, not a hard border grid.
  - Row hover state (`--muted`) to reinforce clickability where rows link to detail.

### 5.7 Badges
- **Today:** a `Badge` component (`components/common/badge.tsx`) exists — pill-shaped, variants `success`/`warning`/`destructive`/`info`/`muted` using §4.1 status tokens — and is used for Attendance's `CHECKED_IN`/`CHECKED_OUT`/`ABSENT` status and Invoice's `DRAFT`/`ISSUED`/`PARTIALLY_PAID`/`PAID`/`OVERDUE`/`VOID` status (mapping in `lib/invoices/mapper.ts`'s `INVOICE_STATUS_BADGE_VARIANT`). Every other status field is still plain text (Membership status "ACTIVE"/"SUSPENDED" as a bare string; Enrollment status as bare text in a table cell).
- **Target:** roll `Badge` out to Membership/Enrollment/Payroll status fields. One consistent mapping table per module, colocated with wherever that module's status enum is defined (Attendance's and Invoice's each live in their own `lib/<module>/mapper.ts`), not re-invented per module.

### 5.8 Empty states
- **Today:** a shared `EmptyState` component (`components/common/empty-state.tsx`: icon + message + optional primary-action button) exists and is used by Attendance's roster and history list, and by Invoice's list ("No invoices found") plus its Detail page's Line Items and Payments sections ("No line items yet." / "No payments recorded yet."). Every other list still uses plain text strings ("No staff found.", "No classrooms available. Add one from the Classrooms page first.").
- **Target:** roll `EmptyState` out to the remaining lists, adding a direct primary-action button (e.g. "Add Staff") where relevant instead of just a text hint pointing elsewhere.

### 5.9 Loading states
- **Today:** `DataTable` uses `Skeleton` rows (via Attendance's and Invoice's usage) instead of a "Loading…" cell. Every detail page and form, including Attendance's and Invoice's own, still renders literal `<p>Loading…</p>` text — only the list/table loading state has been upgraded so far.
- **Target:** replace remaining `<p>Loading…</p>` usages with skeletons (§5.10) for anything that takes a perceptible fetch (detail pages, forms). Reserve plain spinners only for button-level pending states (e.g. "Saving…" — current pattern on submit buttons is good, keep it).

### 5.10 Skeletons
- **Today:** a `Skeleton` primitive (`components/common/skeleton.tsx`: pulsing `--muted` block, `--radius-md`, `motion-safe:` gated per §7) exists, consumed directly by `DataTable`'s loading rows and Attendance's roster loading state. No `SkeletonTable`/`SkeletonDetail` pre-built compositions exist yet — Attendance composes raw `Skeleton` blocks inline for its roster rather than a named composition, since no second consumer existed yet to validate the abstraction against (see product-principles.md on avoiding premature abstraction).
- **Target:** if/when a second consumer needs the same shape, extract `SkeletonTable`/`SkeletonDetail` compositions. Skeletons should mirror the actual shape of the content they replace, not a generic gray box, so layout doesn't jump on load.

### 5.11 Toasts
- **Today:** none exist — all feedback is inline (`fieldErrors`, `submitError` text under forms). This is fine for validation errors (keep inline) but there's no ephemeral success feedback anywhere (e.g. after a successful edit, the only signal is the page navigating).
- **Target:** a toast system for transient, non-blocking confirmations ("Payroll record updated", "Guardian unlinked") — success (`--success` accent), error (`--destructive`, only for *unexpected* failures, since expected validation stays inline), positioned bottom-right desktop / bottom-center-full-width mobile, auto-dismiss ~4s, one toast at a time (queue, don't stack).

### 5.12 Dialogs
- **Today:** `ConfirmDialog` (shadcn `AlertDialog`-based) already used consistently for every destructive action across all modules — this is genuinely good and consistent already. Keep the pattern; just re-skin with new tokens (`--radius-lg`, `--shadow-lg`).
- **Target:** no structural change needed, just visual (§4). Continue requiring every irreversible action (Remove/Delete/Withdraw/Unlink) to route through this exact component — do not introduce a second confirmation pattern.

### 5.13 Drawers
- **Today:** shadcn `Sheet` is now in real use by two modules. Attendance: `side="right"` for the classroom picker (wrapping the existing `ClassroomPicker`, per the target below), and `side="bottom"` for the per-child check-in/check-out/mark-absent action sheet — the canonical tablet pattern named in §6.2, with its action buttons in `SheetFooter` (`mt-auto`) giving the sticky-bottom-action-bar behavior without a separate component. Invoice: `side="right"` for the "Record payment" quick-create-from-detail-page flow (`RecordPaymentSheet`, launched from Invoice Detail) — the exact scenario this section's own **Target** below names as the first drawer use case ("without leaving the child detail page"), now realized for Invoice instead. No other module uses `Sheet` yet — Staff/Payroll/Guardian's own pickers/quick-create flows still use the inline-expanding-panel pattern.
- **Target:** roll drawers out to the remaining pickers (Classroom/Staff/Guardian/Membership) and remaining quick-create flows launched from a list/detail page (e.g. "Add Guardian" from within a Child's linked-guardians section, without leaving the child detail page — Invoice's Record Payment drawer is the first realized instance of this exact pattern) — a drawer keeps the underlying page's context visible and is a better tablet interaction than an inline panel that pushes content down. Slide-in side should follow the end/trailing edge — right in LTR, left in RTL, per §8 — once RTL exists; both Attendance's and Invoice's `side="right"` usages are fixed LTR values today, matching every other current LTR-only screen.

### 5.14 Sidebars
- **Today:** flat link list (`components/layout/sidebar-nav.tsx`), no grouping, no collapse, always visible on desktop (`md:flex`), replaced by `MobileSidebar` (a sheet) below `md`.
- **Target:** grouped sections with subtle section labels (see §11 for the actual grouping), each item with a leading icon (currently no icons in the sidebar at all — add them, using `lucide-react` which is already a dependency). Active item gets a `--secondary` background pill, not just a bold label (current `NavLink` behavior — verify and upgrade). Collapsible to icon-only rail on desktop for users who want more content width (defer until requested; not urgent).

### 5.15 Navigation
See §11 for the information-architecture-level rework. At the component level: breadcrumbs (`components/layout/breadcrumbs.tsx`) currently render raw route segments including UUIDs — **must** be upgraded to resolve the current entity's display name (already fetched by the detail page one level down) instead of the raw URL segment. This is a correctness fix, not a visual one.

### 5.16 Dashboard widgets
No dashboard exists today (see §12 for the full vision). Widget-level spec:
- **Stat card**: large number + label + optional trend delta + module accent-colored icon. Fixed height, in a responsive grid (4-up desktop, 2-up tablet, 1-up mobile).
- **Alert list**: compact list of "needs attention" items (near-capacity classroom, unpaid invoice, staff without payroll), each with a severity dot (`--warning`/`--destructive`) and a direct link to resolve.
- **Activity feed**: chronological, avatar/icon + one-line description + relative timestamp, using data already captured by `createdAt`/`createdBy` on every table.
- **Quick actions**: a fixed row of primary-action buttons (Add Child, Add Staff, Add Payroll Record, etc.), not buried in each module.

### 5.17 Charts
None exist today; none are urgently needed yet (no module currently produces trend data worth charting beyond simple counts). Invoices has since shipped, so a revenue-trend chart is now a real candidate rather than a hypothetical — still not built, since no reporting/aggregation view exists yet (see [feature-map.md](./feature-map.md#reports)). When first needed (likely: enrollment trend over time, or revenue trend from Invoice/Payment data), adopt a single charting library system-wide (recommend `recharts` — React-native, themeable via the same CSS tokens, good default accessibility) rather than reaching for whatever's convenient per-feature. Chart color series should draw from the module accent palette (§4.1), never arbitrary hex values.

---

## 6. Responsive & device strategy

### 6.1 Mobile
Parent-facing and lightweight admin checks. Single-column layouts, sidebar collapses to the existing `MobileSidebar` sheet (keep), tables collapse to stacked card rows below `sm` (each row becomes a mini-card showing the 2-3 most important fields, not a horizontally-scrolling table).

### 6.2 Tablet optimization (the priority device — teachers, front desk)
This is the operationally critical form factor per the product vision ("teachers complete tasks with one hand"):
- Minimum touch target **44×44px** for any teacher-facing action (check-in, attendance mark, quick note) — larger than the general 40px desktop button spec in §5.1.
- Prefer selection over typing: large tap targets (child photo grid for check-in, not a searchable dropdown), toggle/segmented controls over free-text where the value is one of a known few.
- Sticky action bar at the bottom of the viewport for the primary action on task-oriented screens (future Attendance check-in screen is the canonical example) — keeps the thumb-reachable zone (bottom third of a tablet held one-handed) as the action zone.
- Avoid modal dialogs that require precise small-target dismissal on a tablet in motion; prefer full-screen or bottom-sheet-style drawers for anything teacher-facing.

---

## 7. Accessibility standards

Target **WCAG 2.1 AA** as the baseline for every screen, not an aspiration:

- Color contrast: body text ≥ 4.5:1 against its background, large text/icons ≥ 3:1. Every token pair in §4.1 must be checked against this before being shipped as a default (the soft-color palette needs verification once actual oklch values are finalized in code — flag as a follow-up check at implementation time, not assumed from the spec alone).
- Every interactive element reachable and operable by keyboard alone; visible focus ring (`--ring`, currently generic — should follow the new `--primary` hue) on every focusable element, never `outline: none` without a replacement.
- Every icon-only control has an `aria-label`. Every form input has an associated `<label>` (already the pattern in this codebase — keep it, it's correct).
- Every destructive action requires explicit confirmation (already true via `ConfirmDialog` — keep enforcing it for every new module).
- Status conveyed by color is always paired with text or an icon shape difference (§5.7 badges use both color and label text already — keep that pairing as a hard rule, never color-only status dots without a text label nearby).
- Motion: respect `prefers-reduced-motion` for any transition/animation introduced (drawers, toasts, skeleton pulses).

---

## 8. RTL & internationalization

Zero RTL/i18n exists today (no `dir` attribute handling, no i18n library, hardcoded `lang="en"` in `app/layout.tsx`, no translated strings). Given Egypt/GCC is the named primary market, this needs to be foundational, not retrofitted:

- **Adopt logical CSS properties from the start of any new component work**: `ms-*`/`me-*` (margin-inline-start/end) instead of `ml-*`/`mr-*`, `ps-*`/`pe-*` instead of `pl-*`/`pr-*`, `text-start`/`text-end` instead of `text-left`/`text-right`. Tailwind supports all of these natively — this is a discipline/convention decision, not a tooling gap.
- **`dir` attribute** driven by the active locale, set on `<html>` alongside `lang` (currently hardcoded to `"en"` — needs to become dynamic once a locale/tenant-language setting exists).
- **Icons that imply direction** (chevrons, arrows, the breadcrumb separator) must flip automatically under `dir="rtl"` — use CSS logical transforms (`rtl:scale-x-[-1]` or equivalent) rather than swapping icon assets.
- **Drawers/Sheets** (§5.13) slide from the *inline-end* edge, not a hardcoded "right" — right in LTR, left in RTL.
- **i18n library**: adopt `next-intl` (best-fit for Next.js App Router, active maintenance, supports the route-based locale pattern this app would need) when the first Arabic strings are needed. Don't hand-roll a translation dictionary.
- **Numbers/dates**: Arabic-Indic numerals are a locale *preference*, not a hard requirement for launch — default to Western Arabic numerals (٠١٢... vs 0123...) unless customer research says otherwise; but dates should respect locale formatting (day/month order) via `Intl.DateTimeFormat`, not hand-built date strings (current `.toLocaleDateString()` usage in `staff/mapper.ts` etc. is already the right primitive — keep using `Intl`/`toLocaleDateString` everywhere, never hand-formatted date strings).
- **Payment method strings** (Cash, Vodafone Cash, InstaPay, Bank Transfer) are prime early translation targets given the product brief — plan the Invoices/Payments module's copy to go through the i18n layer from day one rather than hardcoded English.

---

## 9. Component naming conventions

Current conventions (confirmed from the codebase) are good and should simply be continued, not changed:

- **Files**: kebab-case (`staff-detail.tsx`, `payroll-form.tsx`, `classroom-staff-section.tsx`).
- **Components**: PascalCase matching the file's primary export (`StaffDetail`, `PayrollForm`).
- **Directories**: one directory per feature/module under `components/`, named after the domain noun (`components/staff/`, `components/payroll/`), mirrored by `lib/<module>/{queries,mutations,schema,mapper}.ts` and `app/dashboard/<module>/...` routes. New modules must follow this exact four-way mirror (contracts → api endpoint → lib feature layer → components → routes) — it's already been applied consistently across Children/Guardians/Classrooms/Enrollment/Staff/Payroll and should remain the template.
- **Shared/reusable primitives** live in `components/ui/` (shadcn primitives) or `components/common/` (app-specific but cross-module: `DataTable`, `PaginationControls`, `ConfirmDialog`). New system-wide components from this spec (`Card`, `Badge`, `EmptyState`, `Skeleton`, `Toast`, `DatePicker`) belong in `components/common/`, not duplicated per module.
- **Hooks**: `use<Noun><Verb?>` (`useStaffList`, `useStaffMember`, `useStaffDirectory`) — already consistent, continue it.
- **Mappers**: pure formatting functions named `format<Field>` (`formatHireDate`, `formatPayRate`) or `<entity><Field>` for composite labels (`staffFullName`) — already consistent, continue it.

---

## 10. Reusable page patterns

### 10.1 Entity Detail page pattern (target spec)

Replace the current bare `PageTitle` + `<dl>` with this consistent anatomy on every detail page (Child, Guardian, Classroom, Staff, Payroll, and any future entity):

1. **Entity header** (new shared component): avatar/initial-circle (module accent color background) + entity name (Page title style) + 1-3 compact stat chips relevant to that entity (e.g. Classroom: "18/20 occupied"; Staff: membership status badge) + primary actions (Edit/Remove) aligned to the trailing edge.
2. **Primary fields card**: the entity's own scalar fields, in a `Card` (§5.5), label/value pairs but with more breathing room and a two-or-three-column responsive grid instead of a fixed two-column `<dl>`.
3. **Related-data sections**: each embedded cross-module section (Enrollment, Guardians, Classroom's Children/Staff) becomes its own `Card` with a section heading, keeping the current embedding pattern (this part is *already right* — just needs the visual card treatment and a "N total" count in the section header).
4. **Danger zone**: destructive actions (Remove/Delete) visually separated (e.g. a top border, or moved to a dropdown "..." menu on the entity header) rather than sitting as a plain button next to "Edit" — reduces accidental clicks.

### 10.2 List page pattern (target spec)

1. Header row: entity plural name as page title + total count (e.g. "Staff · 24") + primary "Add X" action trailing-aligned.
2. Filter row: one consistent search input (placeholder always "Search by name…" pattern unless the entity has no name field) + any additional filters as a `Select` (§5.3), never a second free-text box (fixes the Guardians name+email dual-box inconsistency, §13 rule 1) — combine into one smart search that matches name OR email server-side if needed, rather than two separate inputs.
3. Table (§5.6) with sortable headers, using module accent color sparingly (e.g. a thin left border on the active/selected row).
4. Empty state (§5.8) inside the table area when zero results.
5. Pagination footer (§5.6/current `PaginationControls`, upgraded to show "X–Y of Z" text, not just page number links).

### 10.3 Form page pattern (target spec)

1. Same page title as the entity it creates/edits ("Add Staff" / "Edit Staff"), breadcrumbed correctly (§5.15 fix).
2. Fields grouped logically in `Card` sections when a form has more than ~5 fields or spans multiple concerns (e.g. Payroll's "which staff" concern vs. "compensation" concern could become two cards) — current single flat `<form className="max-w-md flex-col gap-4">` pattern is fine for small forms (Classroom, Guardian) and should only split into sections once a form grows past that.
3. Every enum field uses Select (§5.3), never raw `<select>` or free text for closed vocabularies.
4. Submit button pinned to the same position across all forms (bottom, full-width on mobile, trailing-aligned on desktop), label pattern `Save changes` (edit) / `Add <Entity>` (create) — already the exact current convention, keep it verbatim.
5. Inline field errors (current `fieldErrors` pattern) stay inline, not toasts (§5.11) — validation errors are not transient notifications, they're persistent until fixed.

---

## 11. Navigation & information architecture

**Target sidebar structure** (grouped, replacing the current flat list):

```
Overview                        (ungrouped, top-level)

PEOPLE
  Children
  Guardians
  Staff
  Payroll

OPERATIONS
  Classrooms
  Enrollment            ← currently has no standalone list page at all;
                            add one once a capacity/waitlist view is built (§16)

Settings                        (ungrouped, bottom)
```

As future modules land, they slot into these existing groups rather than growing the flat list further:
- **PEOPLE** eventually also holds Scheduling, Recruitment, Leave Management.
- **OPERATIONS** eventually also holds Attendance, Daily Reports, Medical, Meals.
- A future **FINANCE** group holds Invoices, Payments, Expenses, Accounting.
- A future **ENGAGEMENT** group holds Messaging, Parent App content, Marketing CRM, Admissions.

**Cross-module discoverability rule:** any entity that has a *meaningful, single* related entity elsewhere (Staff↔Payroll, Child↔primary Classroom) gets a quick-link chip or button on its entity header (§10.1) pointing to that related entity — this satisfies the "everything should feel connected" principle without violating deliberate module separation (Payroll stays a fully separate module/route/permission boundary; the link is pure UI convenience, not a data coupling).

**Breadcrumbs** always resolve to the entity's display name, never a raw ID (current defect, §13/§15).

---

## 12. Dashboard vision

The dashboard replaces `PagePlaceholder` and becomes the literal "control center" — answering *what's happening, what needs attention, what to do next* using only data already available from existing modules (no new backend required for v1; this is the cheapest, highest-impact single change available today):

**Layout (top to bottom):**
1. **Quick actions row** — Add Child / Add Staff / Add Payroll Record / (future) Check In, as prominent buttons.
2. **Stat cards row** (§5.16) — Active children count, Waitlisted count, Staff headcount, Classrooms near/at capacity.
3. **Attention list** (§5.16 alert list) — anything requiring action: classrooms over capacity, staff with no payroll record, staff with no portal access (from existing Staff/Payroll/Membership data).
4. **Two-column lower section**: Recent activity (new Children/Guardians/Staff, from `createdAt`) alongside Birthdays this week/month (from `Child.dateOfBirth`).

**Future-ready:** Attendance has shipped — its "children present today" should become the single most important stat card and move to position #1 whenever Dashboard v1 itself is built (Dashboard remains a `PagePlaceholder` today, per UXD-3; the data to power this stat card already exists via `GET /attendance`). Invoices has also shipped — "overdue invoices" should become a top-priority attention-list item whenever Dashboard v1 is built; the data already exists via `GET /invoices` filtered to `status=OVERDUE` (derived at read time, per the domain model). The dashboard's layout is designed to accept new stat cards and attention-list items without restructuring — it is a *composition* of independent widgets, not a bespoke one-off page.

---

## 13. Cross-module consistency rules

Binding rules for all current and future modules, derived from the inconsistencies found in §14:

1. **One search box per list**, matching against every human-searchable field server-side (name, and email where relevant) — never two separate boxes for the same list (fixes Guardians).
2. **Enum fields always use Select**, never free text — Gender, and every future closed-vocabulary field (fixes Children's Gender field).
3. **Never render a raw internal ID** as visible UI text — not in breadcrumbs, not in detail pages (fixes Guardian Detail's `userId` leak and every breadcrumb).
4. **Every list row shows at least one piece of cross-module context** where it's cheap to compute (e.g. Children list could show current classroom via the same directory-hook pattern already used elsewhere) — detail-only context is a last resort, not the default.
5. **Status is always a Badge** (§5.7), never bare text.
6. **Every destructive action goes through `ConfirmDialog`** — no exceptions, no second confirmation pattern invented.
7. **Pickers share one implementation** — consolidate the current 5 near-duplicate picker components (Guardian/Child/Classroom/Membership/Staff) into a single generic `EntityPicker` component parameterized by directory hook + display formatter + table columns, now that a 6th and 7th picker are inevitable as more modules ship.
8. **Every new list endpoint's `sortBy` support gets a sortable-header UI** at the same time it's built — no more "backend supports it, frontend ignores it" gaps.

---

## 14. Module-by-module audit against this system

Factual current state (verified against source) compared to the target spec above.

### Children
- List: Name/DOB/Gender columns, single name-only search ✅ (matches rule 1). Gender is free text ❌ (violates rule 2). No classroom shown in row ❌ (violates rule 4). No avatar/photo shown despite `photoUrl` existing ❌ (§5.16/§10.1 entity header not yet built).
- Detail: bare `<dl>`, no entity header, no stat chips ❌ (§10.1 not yet built). Embedded Enrollment + Guardians sections ✅ (correct pattern, just needs Card treatment).
- Form: no Select for Gender ❌.

### Guardians
- List: **two search boxes** (name, email) ❌ (violates rule 1 directly). No linked-children count in row or list ❌ (rule 4).
- Detail: **leaks raw `userId`** ❌ (direct violation of rule 3) — highest-priority fix of any single item in this audit, it's a correctness/security-adjacent defect, not just polish.

### Classrooms
- Detail: Capacity only, no occupancy/staff-count stat chips ❌ (§10.1). `ClassroomChildrenSection`/`ClassroomStaffSection` are unpaginated read-only lists ⚠️ (fine today, breaks at enterprise scale per §17).
- List: single name search ✅.

### Enrollment
- No standalone list/waitlist view exists at all ❌ (§11 notes this; needed before a real capacity dashboard widget is meaningful).
- Status shown as bare text in the history table ❌ (violates rule 5 — Badge needed).
- Otherwise the best-structured workflow in the app (state-machine-driven Enroll/Transfer/Withdraw) — no structural changes needed, only the Badge/visual pass.

### Staff
- List/Detail: real name display now correct (post this-session's work). Membership status shown as bare text ❌ (rule 5). No avatar ❌.
- 5 independent picker implementations, Staff's own (`MembershipPicker`, and now `StaffPicker` for Payroll) among them ❌ (rule 7 — consolidation candidate now more urgent with a 5th/6th picker in the codebase).

### Payroll
- Correctly, deliberately isolated from Staff per explicit product decision — this is *not* a violation of rule 4, it's an intentional boundary. Rule 4's cross-module-context guidance applies to *display*, not *data coupling*: a quick-link chip from Staff Detail to "View Payroll" (§11) would satisfy discoverability without violating the isolation.
- Pay type/frequency shown as bare text on detail/list ❌ (rule 5 — Badge candidate, though arguably lower priority than status enums since these aren't "state," just categorical facts — use judgement here, a Badge is optional for non-state categorical fields).

### Attendance
- First module built *after* this document existed, and the first to actually consume several of §5's target-spec components rather than the pre-existing plain-text/bare-`<dl>` patterns: `Badge` for status ✅ (rule 5), `Card` on the correction/detail page ✅ (§10.1, partial — no entity header yet), `EmptyState` ✅ (§5.8), `Skeleton` loading rows via `DataTable` ✅ (§5.9/§5.10), a new `Select` primitive for its status/classroom filters ✅ (§5.3, rule 2), and real `Sheet` usage for the first time in the product — `side="bottom"` for the tablet check-in/check-out/mark-absent action sheet (§6.2's canonical example) and `side="right"` for the classroom picker (§5.13).
- Two distinct screens by design: a tablet-first daily roster (`ClassroomAttendanceRoster`, classroom-scoped, today only, 44px touch targets throughout) separate from a desktop-first audit/history list + detail + OWNER/ADMIN correction form (`AttendanceList`/`AttendanceDetail`/`AttendanceCorrectionForm`) — matching design-system §6's device-strategy split rather than forcing one `DataTable`-based screen to serve both a teacher's one-handed daily task and an admin's audit/correction workflow.
- `AttendanceList` was the first list in the product with working sortable headers (rule 8); `InvoiceList` has since shipped with the same capability (sorts by `totalAmount`) — `DataTable` itself now supports `sortKey`, but Children/Guardians/Classrooms/Staff/Payroll haven't been wired up to use it yet (tracked as UXD-4a, not a new gap introduced here).
- No entity header/stat chips (§10.1 not applied) ❌, no module accent color assigned in §4.1's table (Attendance has none — reasonable, since unlike Children/Staff/Guardians it has no natural "owns a color" identity of its own; revisit if/when the Dashboard's "children present today" stat card, §12, wants one).
- "Today" is computed from the browser's local date, not a tenant-timezone endpoint (none exists on the API yet) — an accepted, documented approximation correct for the on-site-tablet deployment model, not a spec violation, but worth knowing about before assuming it as a precedent for a remote-access scenario.

### Billing / Payments (Invoice)
- Second module built *after* this document existed, and consumes the broadest slice yet of §5's target-spec components: `Card` for Details/Line items/Payments sections on Invoice Detail ✅ (§10.1, partial — no entity header yet, same gap as Attendance), `Badge` for status ✅ (rule 5, `DRAFT`/`ISSUED`/`PARTIALLY_PAID`/`PAID`/`OVERDUE`/`VOID`), `EmptyState` ✅ (§5.8, three separate usages — list, line items, payments), `Skeleton` loading rows via `DataTable` ✅ (§5.9/§5.10), sortable `DataTable` headers ✅ (rule 8 — `InvoiceList` is the second list in the product to comply, after Attendance), and `Sheet side="right"` for the Record Payment quick-create-from-detail-page drawer ✅ (§5.13 — the first realization of that section's own named target scenario).
- `InvoiceList`'s columns show both Child and Billed-to-guardian names ✅ — satisfies rule 4 (cross-module context in list rows) on first build, unlike several pre-existing lists that need retrofitting.
- Reuses the existing `ChildPicker`/`GuardianPicker` components in `invoice-form.tsx` rather than building new one-off pickers ✅ — keeps the picker-consolidation problem (rule 7) at its current size instead of adding an 8th implementation.
- Breadcrumbs render the raw invoice UUID on Invoice Detail ❌ — same pre-existing defect as every other module (§15), not new here.
- No entity header/stat chips (§10.1 not applied) ❌, no module accent color assigned in §4.1's table — Billing/Payments conceptually falls under the existing `--accent-finance` ("Payroll / Finance") token, but no Invoice component references it yet, same gap as Payroll itself.
- All monetary amounts render through a single hardcoded tenant-default currency constant (`EGP`) rather than a per-record or per-tenant currency field — an accepted, documented interim decision, not a spec violation (see [enterprise-roadmap.md §4](./enterprise-roadmap.md#4-regional-localization)).

---

## 15. Current UX debt (consolidated)

Ranked by how directly each violates a rule in §13 vs. pure polish:

| Debt | Severity | Rule violated |
|---|---|---|
| Guardian Detail renders raw `userId` | High — data hygiene defect | Rule 3 |
| Breadcrumbs render raw UUIDs everywhere | High — affects every module | Rule 3 |
| Dashboard/Settings are placeholders | High — named as the core vision gap | §12 |
| Guardians list has two search boxes | Medium | Rule 1 |
| Children's Gender is free text | Medium | Rule 2 |
| No entity header/stat chips anywhere | Medium — affects every detail page | §10.1 |
| Status fields shown as bare text, not Badges | Medium — affects Enrollment, Staff/Membership | Rule 5 |
| 5 independent picker implementations | Medium — maintenance risk, not user-visible yet | Rule 7 |
| No sortable table headers on Children/Guardians/Classrooms/Staff/Payroll (capability now exists in `DataTable`, wired up only for Attendance and Invoice) | Medium | §5.6, UXD-4a |
| Zero color/visual identity (pure grayscale) | Medium — brand/perception, not functional | §4.1 |
| No avatars/photos anywhere | Low-medium | §5.16/§10.1 |
| No RTL/i18n foundation | Structural — compounds over time | §8 |
| DataTable has no bulk actions | Low today, high at enterprise scale | §17 |
| Directory hooks capped at 100 records | Low today, high at enterprise scale | §17 |

---

## 16. Prioritized UX improvement backlog

Ordered by impact-to-effort, assuming the design tokens (§4) and core components (§5) are implemented as a foundational pass first (item 1 below) — everything after depends on that foundation existing, per the "design once, don't reskin twice" principle already established in this document.

1. **Foundational design-system implementation** — **partially shipped**, as a byproduct of Attendance and then Billing/Payments rather than as its own separate pass (the sequencing this item calls for — "nothing else should start before this lands" — was not followed strictly; it turned out fine both times because each module needed exactly the subset of primitives that already existed or needed adding, but is a real risk to watch on the *next* new-module task, since not every future module will happen to need the remaining pieces first). Done: `Card`, `Badge`, `EmptyState`, `Skeleton`, sortable `DataTable`, a new `Select` primitive, real `Sheet` usage, and the `--success`/`--warning`/`--info` status tokens in `globals.css` — Attendance shipped the first consumer of each, Invoice shipped the second (validating these aren't one-off Attendance-specific components). Still outstanding: the full §4 palette/type-scale/spacing/radius/shadow rollout (only the status-token slice of §4 shipped), `Toast`, the entity-header component, and consolidated `EntityPicker`. Retrofitting the now-built primitives onto Children/Guardians/Classrooms/Staff/Payroll (items 4-6 below) still needs to happen — they don't get it for free just because the primitives now exist.
2. **Fix the two correctness/hygiene defects**: Guardian Detail's raw `userId` leak, and breadcrumbs rendering raw UUIDs. Small effort, real defects, not just taste.
3. **Dashboard v1** (§12) — highest visible impact, zero backend risk, directly closes the vision doc's named gap.
4. **Entity Detail page pattern rollout** (§10.1) across Children/Guardians/Classrooms/Staff/Payroll/Enrollment — one component built once, applied everywhere.
5. **List page pattern rollout** (§10.2) — fixes Guardians' dual search box, adds sortable headers everywhere, adds "N total" counts.
6. **Status → Badge conversion** across Enrollment/Staff/Membership/Payroll.
7. **Cross-module quick-links** (Staff→Payroll, classroom occupancy/staff stat chips) — §11.
8. **Sidebar grouping** (§11) — do this once, before 2+ more modules ship flat into the nav.
9. **RTL/Arabic foundation** — logical CSS properties as a written convention (§8) should be treated as already-in-effect starting now (i.e., don't wait for item 9 to *start* using `ms-`/`me-` in new code — that's a zero-cost habit change); the heavier lift (i18n library integration, translated strings, `dir` plumbing) is sequenced here so it lands on top of the already-stabilized shared components from items 1 and 4-5, not before.
10. **Enterprise scaling fixes** (§17) — sortable/bulk `DataTable`, directory pageSize ceiling — addressed when a real customer's roster approaches the current 100-record ceiling, not speculatively before then.

---

## 17. Future enterprise considerations

- **Directory hook scaling**: every `use<Entity>Directory` hook (Classroom, Staff, Membership) is capped at the API's max page size (100). This is an explicit, documented tradeoff today (see `docs/SESSION_CHECKPOINT.md`), but it directly collides with the product's own "100+ children enterprise nursery" tier once staff/classroom counts exceed it. Needs a real solution (server-side search-as-you-type instead of client-side filtering over a bulk-fetched directory) before an enterprise customer's roster crosses that line — not urgent today, but should not be forgotten.
- **Bulk operations**: `DataTable` has zero selection/bulk-action scaffolding. An enterprise nursery director will expect bulk-enroll, bulk-message, bulk-export at minimum. Build the selection-state capability into `DataTable` once (§5.6) even if the first bulk action isn't shipped immediately, so it's additive later rather than a rearchitecture.
- **Multi-branch / multi-tenant switching**: today's frontend implicitly assumes one tenant per logged-in session (matches the current backend design — one active `TenantMembership` per user, per the domain model). The product roadmap names Multi-Branch and Franchises explicitly. When that lands, `TopNav` (§5.15) needs a tenant/branch switcher — reserve visual space for it now (e.g. don't design the `UserMenu` area assuming it will always be a single tight cluster) so it's additive rather than disruptive later.
- **Dashboard at scale**: the v1 dashboard (§12) aggregates over full lists client-side, which is fine at current scale. An enterprise nursery chain's dashboard will eventually need server-side aggregation endpoints rather than "fetch everything and count in the browser" — flag this as a backend consideration for whenever Analytics/multi-branch dashboards are scoped, not something to solve in v1.
- **Charting**: defer until real trend data exists (§5.17), but when adopted, pick one library system-wide rather than per-feature, to avoid bundle bloat and visual inconsistency across an eventual Analytics/AI Reports module.

---

## 18. Document maintenance

- This document is updated **whenever**: a new module ships (add its §14 audit + fold new patterns into §5/§10), a design token changes, or a cross-module rule is added/relaxed (§13).
- Anyone implementing a new screen should treat a "I need something not covered here" moment as a signal to *update this document first*, then build — not the other way around.
- Keep §15 (current UX debt) and §16 (backlog) in sync with reality: when a backlog item ships, move it out of §15 and mark it done in §16 rather than deleting the history, so the document also reads as a changelog of the product's design maturity over time.
