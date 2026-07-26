# ADR-0009: Regional Payment Methods Are First-Class, Not a Card-First Afterthought

- **Status:** Accepted
- **Date:** 2026-07-19
- **Related:** [vision.md](../vision.md), [product-principles.md](../product-principles.md) principle 29, [pricing-strategy.md](../pricing-strategy.md), [feature-map.md — Payments](../feature-map.md#payments), [enterprise-roadmap.md §4](../enterprise-roadmap.md#4-regional-localization)

## Context

Every named incumbent competitor (Brightwheel, Procare, Kangarootime, Illumine — [vision.md](../vision.md)) assumes card-on-file billing as the default payment model, because that reflects their home markets' (US, India/APAC) dominant payment behavior. In Nursery OS's primary market (Egypt/GCC), the dominant real-world payment behaviors for a nursery are cash, mobile wallets (Vodafone Cash), and instant bank transfer (InstaPay) — card-on-file is not how most families or nursery businesses in this market actually pay or expect to pay.

## Problem

If Nursery OS built its billing/payments data model and UI around card-on-file as the default, with regional methods bolted on as secondary "other" options, it would reproduce the same market mismatch [vision.md](../vision.md) explicitly names as the reason incumbents underserve this market — and would specifically fail principle 5's "defaults should anticipate the common case," since for the actual target customer, cash/wallet/bank-transfer *is* the common case, not the edge case.

## Decision

**Cash, Vodafone Cash, InstaPay, and bank transfer are first-class payment methods in the product's data model and UI from the start** — not a generic "other" bucket bolted onto a card-first flow ([product-principles.md](../product-principles.md) principle 29). This shapes the `Payment` model itself (`paymentMethod` as an open, extensible value set rather than a card-shaped schema with a miscellaneous fallback) and the pricing model directly: [pricing-strategy.md](../pricing-strategy.md) design principle 3 states plainly, "Local payment methods are never a paywall" — cash, Vodafone Cash, InstaPay, and bank transfer are available on **every** plan including Starter, with only the *integration* layer (automatic reconciliation via Vodafone Cash/InstaPay APIs, as opposed to manual recording of the same methods) gated to the Professional tier ([feature-map.md — Payments](../feature-map.md#payments)).

## Alternatives considered

1. **Card-on-file as the default payment model, with regional methods as a secondary/manual fallback.** Rejected outright — this is the exact incumbent pattern [vision.md](../vision.md) names as the competitive gap Nursery OS exists to close; adopting it would mean building a product that fits its own stated market worse than a from-scratch competitor could.
2. **Treat regional payment methods as a paid add-on or higher-tier feature**, reasoning that card processing is the "standard" expectation and regional methods are a premium localization. Rejected explicitly in [pricing-strategy.md](../pricing-strategy.md) design principle 3 — gating the market's *actual* dominant payment behavior behind a paywall would directly contradict principle 2 ("every plan must feel complete for its target customer, not artificially crippled"), since a Starter-tier home daycare's real-world payment method would then be treated as a premium feature.
3. **Build a generic, unopinionated "payment method" free-text field** rather than naming specific first-class methods. Rejected: an open free-text field provides no structure for reporting ("who paid by InstaPay this month"), no basis for the Professional-tier integration work (Vodafone Cash/InstaPay APIs need a known, stable method identifier to hook into), and undermines the deliberate signal that these are named, supported, first-class methods rather than an unstructured catch-all.

## Consequences

**Positive:**
- The product can honestly market itself as built *for* how this market actually pays, not retrofitted to accommodate it — directly reinforcing [vision.md](../vision.md)'s positioning statement ("architected... around a market those platforms treat as secondary at best").
- Every pricing tier, including the entry-level Starter plan targeting the smallest, most cash-oriented segment, is immediately usable without an artificial "upgrade to actually record how you get paid" friction point.
- Reporting and future Accounting/Analytics work (per [feature-map.md](../feature-map.md)) can query and break down revenue by a known, stable set of payment methods from day one, rather than needing a data-migration/normalization pass later to make sense of free-text history.

**Trade-offs accepted:**
- The Vodafone Cash/InstaPay *integrations* (as opposed to manual recording of the same methods) still require real third-party API integration work, gated to Professional tier ([feature-map.md — Payments](../feature-map.md#payments)) — Starter-tier customers get first-class manual recording, not automatic reconciliation, a deliberate and accepted scope boundary, not a contradiction of "never a paywall" (the *method* isn't paywalled; the *automation* is).
- A fixed, named set of payment methods requires a deliberate extension process when the product expands into new regions with different dominant payment behaviors (e.g. a future M-Pesa integration for East African expansion, already anticipated in [enterprise-roadmap.md §4](../enterprise-roadmap.md#4-regional-localization)) — an accepted, bounded cost versus the alternative (an unstructured field) rejected above.

## Future implications

- [enterprise-roadmap.md §4](../enterprise-roadmap.md#4-regional-localization) already establishes the extension pattern: new regional payment methods slot into the same extensible method list as the product expands geographically, never requiring a new payment data model per region.
- Card/online payment gateway integration is explicitly Enterprise-tier, sequenced *after* the region-specific methods are solid ([pricing-strategy.md](../pricing-strategy.md) plan comparison) — a deliberate inversion of the incumbent-default order, and future roadmap decisions should preserve that inversion rather than quietly re-prioritizing card support back to the top once it's requested by a larger customer.
- Any future government/subsidy billing integration ([feature-map.md — Billing](../feature-map.md#billing), Future tier) should follow the same "first-class regional reality, not a bolted-on afterthought" discipline this ADR establishes for payment methods.
