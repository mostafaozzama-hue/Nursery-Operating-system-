# Backend Services Design Freeze

- **Status:** Frozen
- **Approved:** 2026-07-29
- **Scope:** the Backend Services architecture for the Configuration Engine — the service layer sitting between the committed Configuration Engine database foundation (`686e189`) and the REST controllers that will eventually expose it. Full detail lives in [configuration-engine-backend-services.md](./configuration-engine-backend-services.md), reviewed and revised this same date — not duplicated here.

## Architecture review — summary

A full architecture review was run against the design document before implementation, checking: Single Responsibility, service boundaries, circular dependencies, transaction boundaries, repository responsibilities, business-rule ownership, testability, future maintainability, duplicated business logic, and over-engineering.

The review found **five issues serious enough to fix before implementation**, all connective — how already-agreed services call each other — not structural: the tiering, entity coverage, and overall approach held up. It also found a number of smaller, non-blocking items (a tier-boundary callout on `WaiverService.applyRetroactively`, a shared historization helper, an undefined `Tx` type, a Tier C testing-strategy note, a `PaymentMethod`/`refundedVia` vocabulary-reuse note, a missing `Attendance`→`ManualOverride` diagram edge, and two unassigned `ManualOverride.overrideType` values) — deliberately left open as optional polish, not architectural defects, since none blocked starting implementation.

## Architectural corrections — summary

All five must-fix issues were corrected in the design document itself (see its §14 for full reasoning; not restated here):

1. **Removed an automatic `InvoiceService.issue() → PaymentAllocationService.reallocateCredit` trigger** — the source of a real circular dependency between the two services, and a capability the domain model never actually required (credit is described as computed, not auto-applied).
2. **Gave `CapacityService` its own minimal, direct read** instead of routing through `EnrollmentRepository` — removed a second circular dependency (`CapacityService` ↔ `EnrollmentService`).
3. **Named `EnrollmentBillingTermsService.countEligibleSiblings`** as the single owner of sibling-count resolution — a required computation the original design left unassigned to any method.
4. **Named a single shared regeneration primitive** — `InvoiceService.replaceGeneratedLines`/`addExceptionLineItem`, and `BillingRunService.regenerateInvoiceForChild` built on top of it — closing both a repository-boundary gap (nobody had a defined way to write into `Invoice`'s data) and a duplicated-logic risk (`BillingRunService` and `WaiverService.applyRetroactively` independently reimplementing the same "recompute a DRAFT invoice" operation).
5. **Resolved a signature/description contradiction** on `PricingEngineService.computeChargesForPeriod`'s `tx` parameter (now optional, last, matching every other Tier A/B `find*(..., tx?)` method).

No entity, field, business rule, or service was added or removed by these corrections. The Domain Model and the committed database schema were not touched at any point in the design, review, or correction passes.

## Final service architecture

19 services across three tiers, every one mapping directly onto an entity or business rule already approved in [domain-model.md](./domain-model.md) and [ADR-0017](./adrs/0017-configuration-before-operations.md); two existing services are extended, not replaced.

**Tier A — configuration definitions (tenant-wide setup, no per-child state):** `PlanService`, `PlanPriceService`, `FeeService`, `PlanFeeService`, `DiscountService`, `SiblingDiscountTierService`, `HolidayService`.

**Tier B — per-child / per-enrollment assignment:** `EnrollmentBillingTermsService`, `ChildFeeAssignmentService`, `ChildDiscountAssignmentService`, `WaiverService`.

**Tier C — cross-cutting computation / orchestration:** `CapacityService`, `PricingEngineService`, `BillingRunService`, `PaymentService`, `PaymentAllocationService`, `ManualOverrideService`, `OneTimeChargeService`, `CreditNoteService`.

**Extended existing services:** `EnrollmentService`/`EnrollmentRepository` (capacity check delegated to `CapacityService`; `EnrollmentBillingTerms` created/closed in lockstep with `Enrollment`) and `InvoiceService`/`InvoiceRepository` (`Payment` extracted out to `PaymentService`/`PaymentAllocationService`; gains the two new composable methods named in correction 4 above).

Full per-service responsibilities, public method signatures, the dependency graph, transaction-boundary rules, validation/error-handling/authorization conventions, and the REST resource mapping are all recorded in [configuration-engine-backend-services.md](./configuration-engine-backend-services.md) and are not restated here.

## Build order

As recommended in the design document's §13, unchanged by the review — not a commitment, the order the dependency graph implies is buildable-and-testable incrementally:

1. **Tier A, leaf-first:** `PlanService` → `PlanPriceService` → `FeeService` → `PlanFeeService` → `DiscountService` → `SiblingDiscountTierService` → `HolidayService`.
2. **`CapacityService`**, extracted from `EnrollmentRepository`'s existing inline check, given its own minimal direct read.
3. **`EnrollmentBillingTermsService`**, wired into `EnrollmentService`'s existing create/close transaction.
4. **Tier B assignment services:** `ChildFeeAssignmentService`, `ChildDiscountAssignmentService`, `WaiverService` (create/expire only — `applyRetroactively` deferred to step 6).
5. **`PricingEngineService`**.
6. **`BillingRunService`** (including the two new `InvoiceService` methods it depends on), then `WaiverService.applyRetroactively`, then the remaining Tier C services (`PaymentService`, `PaymentAllocationService`, `ManualOverrideService`, `CreditNoteService`, `OneTimeChargeService`).

## Statement of freeze

The Backend Services architecture for the Configuration Engine — as recorded in [configuration-engine-backend-services.md](./configuration-engine-backend-services.md), following its architecture review and the corrections above — is **approved and frozen for implementation**. Per the same standing rule already governing the domain model, Information Architecture, and wireframes: this design is not revisited unless implementation exposes a concrete, specific problem that cannot be solved without touching it. The next phase is implementation, starting with `PlanService`.
