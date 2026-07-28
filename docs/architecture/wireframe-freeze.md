# Wireframe Freeze

- **Status:** Frozen
- **Approved:** 2026-07-28
- **Scope:** 10 low-fidelity MVP screens, built strictly on the frozen [Information Architecture](./ia-freeze.md) and [domain model](./domain-model.md) — no new entities, modules, or workflows introduced during the wireframe phase.

## Approved screens

**Admin Workspace (9):** Dashboard, Children List, Child Detail, Enrollment Flow, Attendance, Invoices, Payments, Tuition Plans, Settings.
**Classroom Workspace (1):** Classroom Roster.

Full per-screen detail (purpose, primary tasks, key UX decisions, deferred capabilities, alignment confirmation) is recorded in the Wireframe Approval Report reviewed and approved this same date — not duplicated here.

## Owner review — summary

One round of operational feedback from a nursery-owner perspective, covering all 10 screens. Every item was classified before any change was made: existing capability needing better surfacing, genuine UX improvement, new business capability requiring deferral, or a conflict with a frozen principle.

- **Applied (UX layer only):** enrollment-end-date column and clickable rows on Children List; a prominent photo affordance and dedicated pickup-authorization section on Child Detail; a schedule preview, fee opt-ins, and pickup confirmation surfaced within Enrollment Flow; explicit classroom scoping on Attendance; invoice date, print, and WhatsApp-share on Invoices; a find-by-child entry path on Payments; clarified labeling on Tuition Plans and Settings.
- **Deferred (new capability, no backing entity):** operational reminders and expense tracking on the Dashboard; a full health/medical record and free-text reminders on Child Detail; a stored payment-method preference and a documents checklist on Enrollment Flow; a classroom-to-management note on Classroom Workspace.
- **Rejected:** a raw internal child ID on invoices — conflicts with the standing "never expose internal IDs" principle.
- **One item briefly reopened, then reverted:** a minimal `Child.allergyNotes`/`healthNotes` operational health summary was authorized, implemented (schema, migration, docs), and then explicitly reverted — one round of wireframe feedback was judged insufficient grounds to reopen the frozen domain model on its own. Child Detail shows this as a clearly-marked, non-persisted placeholder.

## Consistency review — summary

A full pass across all 10 screens after the owner-review changes landed, checking cross-screen consistency, terminology, navigation, workflow, SaaS-first simplicity, progressive disclosure, and alignment with the frozen domain model and IA. Nine real fixes applied: labeled the previously-unlabeled Child Detail "Details" fields; simplified reviewer-facing language out of simulated UI copy; repaired a cross-screen reference (Enrollment Flow's discount pointer now resolves to a real affordance on Child Detail); standardized search-box wording across Payments and Invoices; unified "Fees"/"Tuition Plan" terminology between Enrollment Flow and their respective screens; introduced a genuine warning-vs-neutral semantic color distinction (previously Overdue/Suspended/over-capacity looked identical to Draft/Waitlisted); replaced emoji action icons with the text-label convention used everywhere else; added a "By" column to Attendance history, relevant given Classroom Workspace's shift-based framing. Several suspected inconsistencies were checked and confirmed correct as designed (documented in the Approval Report), not changed.

## Deferred capabilities (consolidated)

- Operational reminders/tasks (trips, medication, appointments, mark-complete/snooze/overdue) — no `Reminder`/`Task` entity.
- Expense tracking and utility-bill reminders — named in `feature-map.md` under future Accounting, not yet built.
- Inventory alerts — not named anywhere in the product scope today.
- Health/medical information beyond the reverted placeholder — `MedicalRecord` remains an unscoped future module.
- Free-text notes/messages (child-level "important reminders," classroom-to-management notes) — no `Note`/`Message` entity; `Conversation`/`Message` is an explicitly deferred future messaging module.
- Stored payment-method preference — no field exists ahead of an actual payment.
- Required-documents checklist — no `Document` entity.
- Automated WhatsApp sending (vs. the share-link affordance that was built) — needs the real WhatsApp Business API, already named as a future capability in `vision.md`.
- A human-readable child reference number (analogous to `Invoice.invoiceNumber`) — doesn't exist.

## Remaining assumptions

- **Health & Allergies is a placeholder pending its own decision.** Before that specific card is built, either a deliberate domain-model change must be authorized on its own merits, or the placeholder is dropped from build scope. Does not block the other 9 screens.
- **Discounts, Guardian Detail, and Invoice Detail are referenced but not themselves wireframed.** Plans and Child Detail link to Discounts; Payments is scoped inside a Guardian's page without a full Guardian Detail wireframe; Invoices' actions imply a possible future Invoice Detail page. A follow-up wireframe pass is assumed before those specific links are implemented.
- **RTL/Arabic layout is unvalidated.** These wireframes are LTR only; `design-system.md §8` commits to RTL as foundational. Assumed to be addressed in the high-fidelity/implementation pass, not before.
- **Low-fidelity only.** No responsive breakpoints, no token-based visual design, no component-level detail — assumed to be resolved during implementation against the existing design-system spec, not a wireframe-phase defect.

## Statement of freeze

The 10 screens above are approved and frozen. Per the same standing rule already governing the domain model and Information Architecture: wireframes, UX, and IA are not revisited unless implementation exposes a concrete, specific usability problem that cannot be solved without touching them. The next phase is implementation — starting with backend services — not further wireframe or design work.
