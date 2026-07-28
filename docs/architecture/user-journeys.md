# Nursery OS — User Journeys

**Status:** Living document — Part of the Nursery OS Product Bible. These journeys describe the *intended* end-to-end experience for each persona, using the current architecture and feature map as ground truth for what exists today versus what's planned. Cross-references: [feature-map.md](./feature-map.md) for feature tiering, [design-system.md](./design-system.md) for the concrete page patterns each journey moves through, [vision.md](./vision.md) for the personas' place in the buyer/user model.

Each journey below is written as the *target* experience once the relevant [roadmap.md](./roadmap.md) phase ships — where the current product already supports a step, it's marked ✅; where it's planned but not yet built, it's marked ⬜, so this document stays honest as the product matures rather than describing an aspirational fiction.

---

## Owner

**Who they are:** The economic buyer, especially at the small/medium nursery tier (see [vision.md](./vision.md)). Often also the hands-on operator at the small end, or a step removed from daily operations at the medium/enterprise end, checking in on the business rather than running it minute-to-minute.

**Goals:**
- Know the health of the business at a glance: occupancy, revenue, staffing, without asking anyone.
- Make confident decisions about capacity, hiring, and pricing.
- Trust that the numbers (enrollment, revenue, payroll cost) are accurate without personally reconciling them.

**Daily workflow (target state):**
1. Opens the dashboard first thing ⬜ (currently a placeholder — see [feature-map.md](./feature-map.md#analytics)) — sees occupancy, revenue-at-a-glance, anything flagged as needing attention.
2. Reviews the attention list: near-capacity classrooms, overdue invoices, staff without a payroll record ⬜.
3. Spot-checks Staff ✅ and Payroll ✅ for headcount and cost sanity.
4. Approves or reviews anything requiring OWNER-level sign-off (role/membership changes, payroll changes — both OWNER/ADMIN-gated today) ✅.
5. Occasionally drills into Children ✅ / Guardians ✅ / Classrooms ✅ / Enrollment ✅ to answer a specific question (e.g. "why is this classroom over capacity").

**Pain points (today):**
- No dashboard exists — every "how's the business doing" question requires opening multiple modules and mentally aggregating.
- Billing/Payments now has a frontend (Invoice list/detail, overdue status visible per-record) — but there is still no dashboard aggregating revenue/overdue-count across invoices; an Owner must open the Invoices list and read it row by row rather than seeing one glanceable number.
- No cross-branch visibility (single-tenant assumption) — irrelevant for a single-site owner today, but a real gap once Multi-Branch matters.

**Main screens:** Dashboard (once built) ⬜, Staff list/detail ✅, Payroll list/detail ✅, Classrooms list/detail ✅ (occupancy visible once the stat-chip work in [design-system.md §10.1](./design-system.md#101-entity-detail-page-pattern-target-spec) ships), Invoices list/detail ✅, Settings (once built) ⬜.

**Navigation flow:** Login → Dashboard (control center) → drill into a flagged item (e.g. a near-capacity classroom) → Classroom Detail → (if a staffing question) Staff Detail → (if a compensation question) the linked Payroll record via the quick-link chip described in [design-system.md §11](./design-system.md#11-navigation--information-architecture).

---

## Manager / Director

**Who they are:** The daily operational owner at medium/enterprise nurseries — hired or delegated to run day-to-day operations so the Owner doesn't have to. The heaviest user of cross-module data, and the persona most affected by the current lack of a real dashboard.

**Goals:**
- Keep every classroom staffed, within capacity, and running smoothly today.
- Resolve parent issues before they escalate.
- Manage staff performance, scheduling, and enrollment decisions day to day.

**Daily workflow (target state):**
1. Morning: checks who's present (Attendance) ✅, per classroom or via the history list's filters — a single cross-classroom "who's present right now" glance still doesn't exist until Dashboard v1's "children present today" stat card ships (§12) — and which classrooms are short-staffed.
2. Reviews the admissions/waitlist pipeline ⬜ for decisions needed today (a family touring, a waitlist slot opening up).
3. Handles escalations: an incident report ⬜, a billing dispute ✅ (Invoice Void + a new correct invoice covers the straightforward case; no dedicated dispute/adjustment workflow beyond that yet), a guardian complaint.
4. Manages Staff ✅ day-to-day: assigns classrooms, updates positions, links portal access for a new hire.
5. Reviews Enrollment ✅ transfers/withdrawals as they come in from teachers/front-desk.

**Pain points (today):**
- No single cross-classroom "who's present today" view — Attendance itself is built, but a Manager checking overall presence must go classroom-by-classroom or use the history list's filters rather than one glance (resolved once Dashboard v1 ships, §12).
- No standalone Enrollment/waitlist list view (noted in [design-system.md §11](./design-system.md#11-navigation--information-architecture) and [feature-map.md](./feature-map.md#admissions)) — must open each child individually to check placement status.
- Classroom Detail doesn't show occupancy or staff-count at a glance yet (flagged in [ux-debt.md](./ux-debt.md)).

**Main screens:** Classroom Detail ✅ (with Children/Staff sections), Staff list/detail ✅, Enrollment actions embedded in Child Detail ✅, Attendance (daily roster + history) ✅, a future Admissions pipeline view ⬜.

**Navigation flow:** Login → Dashboard (attention list surfaces today's issues) ⬜ → Classroom Detail (check staffing/occupancy) → Staff Detail (reassign if short-staffed) → Child Detail (handle a specific enrollment/withdrawal action) → back to Dashboard.

---

## Teacher

**Who they are:** The highest-frequency daily user of any part of the system, and the persona with the least patience for friction — standing in a classroom, often holding a child, using the classroom's shared iPad. They sign in to operate **Classroom Workspace** ([design-system.md §11.3](./design-system.md#113-classroom-workspace-navigation)) for their shift; the classroom's state carries over unchanged to whoever signs in next. See [design-system.md §6.2](./design-system.md#62-tablet-optimization-the-priority-device--teachers-front-desk) and [product-principles.md](./product-principles.md) principles 3, 21, 22 for the standing design commitments this journey depends on.

**Goals:**
- Complete required daily record-keeping (attendance) with minimal typing, minimal taps, minimal time away from the children.
- Know which children are assigned to their classroom today and who's authorized to pick each one up.
- Communicate a quick update to a parent without leaving the classroom.

**Daily workflow (target state):**
1. Signs in on the classroom's iPad, sees Classroom Workspace's roster ✅ (via Staff's classroom assignment + Classroom's children section).
2. Checks in each child as they arrive ✅ (tablet-optimized, 44px touch targets, bottom-sheet action drawer per [design-system.md §6.2](./design-system.md#62-tablet-optimization-the-priority-device--teachers-front-desk)).
3. Checks out each child at end of day ✅, confirming pickup authorization (`ChildGuardian.canPickup`) as part of the same check-out action — not a separate lookup.
4. Activity/meal/nap logging ⬜ remains a future daily-record-keeping gap — Activities/Meals modules not started (see [feature-map.md](./feature-map.md#activities)); Classroom Workspace gets a second screen only once that capability actually exists.

**Pain points (today):**
- Classroom Workspace is designed ([design-system.md §11.3](./design-system.md#113-classroom-workspace-navigation)) but not yet built — Attendance's roster is fully built and tablet-optimized, but it's still reachable only via the same general nav every role uses, not wired as this role's default landing.
- No activity/meal logging yet — attendance is solved, but this remains a second major daily-record-keeping gap for this persona.
- Current forms use raw native `<select>`/free-text inputs (§13 rule 2 in [design-system.md](./design-system.md#13-cross-module-consistency-rules)) rather than the large, tap-friendly selection controls this persona specifically needs — Attendance itself avoids this (selection-first roster, no typing required for the common path), but other modules haven't been retrofitted.

**Main screens (target):** Classroom Workspace's roster ⬜ (Attendance's roster ✅ covers the *screen*, but not yet as the role-locked default landing, and not yet separated from Admin Workspace's navigation shell) — check-in, check-out with pickup-authorization confirmation, mark-absent. No other screens exist in this workspace until a second real capability (e.g. Activities) is built.

**Navigation flow:** Sign in on the classroom iPad → Classroom Workspace roster (default landing for this role, no dashboard first) → per-child check-in/check-out → done. No navigation depth beyond this.

---

## Accountant / Bookkeeper

**Who they are:** Responsible for billing, payments, and payroll accuracy — may be a dedicated hire at medium/enterprise nurseries, or the Owner wearing this hat at the small end. See [feature-map.md](./feature-map.md#billing) and [feature-map.md](./feature-map.md#payroll).

**Goals:**
- Get every family billed correctly and on time.
- Reconcile payments (cash, Vodafone Cash, InstaPay, bank transfer) against invoices without manual spreadsheet work.
- Run payroll accurately and on schedule.

**Daily/weekly workflow (target state):**
1. Reviews outstanding invoices and overdue accounts ✅ — Invoice list, filterable by status, `OVERDUE` shown as a derived Badge.
2. Records payments as they come in, across whichever method the parent actually used ✅ — cash, mobile wallet, bank transfer, card, or check, all first-class per [vision.md](./vision.md), via the Record Payment drawer on Invoice Detail.
3. Reviews/updates Payroll records ✅ for new hires, raises, or rate changes.
4. Runs period-end reports (revenue, outstanding balances, payroll cost) ⬜ — no reporting frontend exists yet (see [feature-map.md](./feature-map.md#reports)); today this means manually paging through the Invoice list rather than one summary view.

**Pain points (today):**
- No local payment-method integrations (Vodafone Cash, InstaPay) — payment recording is manual entry, not reconciled automatically (Professional-tier work, see [feature-map.md](./feature-map.md#payments)).
- No reporting/aggregation view — this persona can now do the core recording job, but "how much revenue this month" or "which accounts are overdue in total" still requires manually reading the Invoice list rather than a summary screen.
- Payroll is a single mutable record (no history) by deliberate current design — an accountant needing "what did we pay this person last quarter" cannot get that from the system yet (flagged in [feature-map.md](./feature-map.md#payroll) as a revisit candidate).
- All amounts display in a single hardcoded tenant-default currency (EGP) — correct for the current single-region target market, but not yet a per-tenant setting (see [enterprise-roadmap.md §4](./enterprise-roadmap.md#4-regional-localization)).

**Main screens (target):** Invoice list/detail ✅, Payment recording flow ✅ (Record Payment drawer), Payroll list/detail ✅, a future Reports module ⬜.

**Navigation flow:** Login → Invoices (reachable via the general nav today, not yet under a dedicated **Finance** sidebar group per [design-system.md §11](./design-system.md#11-navigation--information-architecture)) → Guardian Detail (to check billing history/contact before following up) → back to an Invoice to record a payment → Payroll for staff compensation tasks.

---

## Parent

**Who they are:** The end customer's customer — not the buyer, but the person whose trust drives the paying customer's (Owner's) retention. Currently has **no dedicated experience at all** in Nursery OS (see [feature-map.md](./feature-map.md#parent-app)).

**Goals:**
- Know their child is safe, cared for, and learning.
- Understand what they owe and pay it easily, in a method they actually use.
- Communicate with the nursery/teacher without friction.

**Daily/weekly workflow (target state):**
1. Receives a WhatsApp update about their child's day ⬜ (per [vision.md](./vision.md)'s WhatsApp-first communication strategy).
2. Logs into a parent portal ⬜ to view their child's profile, attendance, and any activity updates.
3. Views and pays an outstanding invoice ⬜, using cash/Vodafone Cash/InstaPay/bank transfer.
4. Messages a teacher or the front desk with a question ⬜.

**Pain points (today):**
- No parent-facing surface exists whatsoever — everything described above is currently handled informally outside the product (WhatsApp groups, verbal updates, manual payment collection), which is precisely the fragmentation problem named in [vision.md](./vision.md).
- The backend already supports an optional Guardian→User portal link, but there is no actual login screen, no portal UI, and no data surfaced to a parent anywhere yet.

**Main screens (target):** Parent portal login ⬜, Child summary view ⬜, Invoice/payment view ⬜, Messaging ⬜.

**Navigation flow (target):** Parent-specific login (separate from the staff admin app, likely a distinct route/subdomain) → Child summary (single or multi-child switcher) → drill into Attendance history / Activity feed / Billing, each as its own simple tab, not a general-purpose admin UI repurposed for parents.

---

## Receptionist / Front Desk

**Who they are:** The first point of contact for prospective and current families — handles inquiries, tours, and day-to-day check-in coverage at nurseries large enough to have a dedicated front-desk role. See [feature-map.md](./feature-map.md#admissions).

**Goals:**
- Capture every inquiry so nothing falls through the cracks.
- Give prospective families a good first impression quickly.
- Support daily check-in/check-out and handle walk-in questions.

**Daily workflow (target state):**
1. Logs a new inquiry (name, contact, child age, interest) ⬜ — no Admissions module exists yet.
2. Schedules a tour ⬜.
3. Answers current-family questions by quickly looking up a Child ✅ or Guardian ✅ record.
4. Covers Attendance check-in/out at the front entrance during peak drop-off/pickup times ✅, verifying pickup authorization (`ChildGuardian.canPickup`, backend-tracked) ✅.

**Pain points (today):**
- No Admissions/inquiry-tracking capability exists — inquiries are presumably tracked outside the product entirely today.
- Verifying "is this person authorized to pick up this child" today requires opening the Child Detail page and scrolling to the Guardians section — not the fast, glanceable check a front-desk moment under time pressure needs. (Attendance's own check-out flow doesn't surface this either — a natural next integration point, not currently linked.)

**Main screens (target):** Admissions inquiry log ⬜, Child/Guardian quick-lookup ✅ (existing list search), Attendance check-in/out ✅, a fast pickup-authorization check screen ⬜.

**Navigation flow:** Login → Admissions inquiry log (default landing for this role during business hours) ⬜ → switches to Child/Guardian lookup for an existing-family question → switches to Attendance check-in/out during drop-off/pickup windows.

---

## Cross-journey observations

- **Attendance has shipped** (backend + frontend) and directly resolves the daily-workflow gap for three of the four journeys that depended on it — Manager, Teacher, Receptionist can all now check in/out/mark absent and see the results. **Parent remains blocked**, not by Attendance itself but by the entirely separate, still-unbuilt Parent portal ([feature-map.md](./feature-map.md#parent-app)) — the data now exists to eventually surface an "Attendance history" tab there (see the Parent journey above), but nothing about Attendance shipping unblocks a Parent until that portal itself is built.
- **No persona currently has a task-optimized entry point** — every role lands on the same general admin app today. Admin Workspace's Dashboard (Owner/Manager), Classroom Workspace's roster (Teacher), and a genuinely separate Parent portal are all distinct surfaces this product needs, not variations of one generic screen.
- **Billing/Payments has shipped** and directly resolves the Accountant's core daily job (invoice review, payment recording) — the second, larger of the two personas this gap named. **Parent remains blocked**, same as with Attendance, not by Billing/Payments itself but by the still-unbuilt Parent portal ([feature-map.md](./feature-map.md#parent-app)) — the data now exists to eventually surface an "Invoices" tab there, but nothing about Billing/Payments shipping unblocks a Parent until that portal is built.
