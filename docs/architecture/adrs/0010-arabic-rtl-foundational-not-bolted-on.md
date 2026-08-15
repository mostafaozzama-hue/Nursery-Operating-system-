# ADR-0010: Arabic and RTL Are Foundational, Not a Bolted-On Localization Layer

- **Status:** Accepted
- **Date:** 2026-07-19 (vision), convention formalized in [design-system.md §8](../design-system.md#8-rtl--internationalization)
- **Related:** [vision.md](../vision.md), [product-principles.md](../product-principles.md) principle 28, [design-system.md §8](../design-system.md#8-rtl--internationalization), [enterprise-roadmap.md §3](../enterprise-roadmap.md#3-multi-language), [roadmap.md Phase 4](../roadmap.md#phase-4--enterprise)

## Context

Nursery OS's primary market is Egypt and the wider GCC/MENA region, where Arabic is the dominant language and reads right-to-left. As of the design system's own audit ([design-system.md §2](../design-system.md#2-current-product-assessment)), zero RTL/i18n infrastructure exists today: `lang="en"` is hardcoded, no `dir` attribute handling exists, and every user-facing string is an inline English literal.

## Problem

RTL support is not a CSS toggle applied at the end of a project — it is a layout discipline (logical vs. physical CSS properties, icon-flip behavior, drawer-slide-direction) that, if ignored during initial component construction, requires touching nearly every component a second time to retrofit. A product whose named primary market is Arabic-speaking cannot treat this as a late-stage feature without materially undermining its own stated market-fit thesis.

## Decision

**Arabic and English are equal first-class citizens, not a primary language plus a translation layer** ([product-principles.md](../product-principles.md) principle 28) — but this decision splits into two distinct commitments with two different timelines, and both are made explicit specifically to avoid the two being conflated:

1. **The RTL-safe *convention* starts immediately, as a zero-cost habit in all new code**, regardless of when Arabic strings actually ship: logical CSS properties (`ms-*`/`me-*`, `ps-*`/`pe-*`, `text-start`/`text-end`) instead of physical ones (`ml-*`/`mr-*`, `text-left`/`text-right`) from the very first component written, direction-aware icon handling, and drawers/sheets that slide from the *inline-end* edge rather than a hardcoded "right" ([design-system.md §8](../design-system.md#8-rtl--internationalization)).
2. **The heavier lift — actual translated strings, an i18n library (`next-intl`), dynamic `dir`/`lang` switching, and a per-tenant language setting — ships as real, shipped localization in Phase 4** ([roadmap.md](../roadmap.md)), deliberately sequenced *after* the design-system foundation and component rollout are stable, so the i18n work lands on top of already-settled shared components rather than fighting a moving target.

## Alternatives considered

1. **Defer all RTL/i18n consideration entirely until Phase 4**, including the layout convention. Rejected: this is precisely the "retrofit" scenario the decision is designed to avoid — every component built between now and Phase 4 using physical CSS properties (`ml-4`, `text-left`) would need to be individually re-audited and fixed once RTL actually ships, a far larger and more error-prone undertaking than adopting the logical-property convention from the start at effectively zero marginal cost.
2. **Ship full Arabic translation and RTL support immediately, ahead of the design-system foundation.** Rejected: [design-system.md §8](../design-system.md#8-rtl--internationalization) explicitly sequences the heavier i18n-library/translated-strings work *after* the shared component foundation ([ADR-0008](./0008-design-system-before-dashboard.md)) precisely so translation work happens once, against stable components — building it earlier risks the same "reskin twice" problem that motivated foundation-before-Dashboard sequencing, applied here to translation instead of visual tokens.
3. **Treat Arabic as a "translation pass" applied to an English-first product**, the pattern named in [vision.md](../vision.md) as the typical incumbent default ("English-first, translation bolted on"). Rejected outright as the specific anti-pattern this ADR and principle 28 exist to avoid — a bolted-on translation layer notoriously produces broken layouts (text overflow, mirrored-but-misaligned icons) precisely because the underlying layout was never built to flex in the first place.

## Consequences

**Positive:**
- No future "RTL migration project" is required — by the time Phase 4's translated strings and `dir` switching ship, the layout underneath is already RTL-safe by construction, because every component built in the meantime followed the logical-property convention.
- Payment method strings (Cash, Vodafone Cash, InstaPay, Bank Transfer — [ADR-0009](./0009-regional-payment-methods-first-class.md)) and other early translation targets are explicitly flagged to go through the i18n layer from day one once Invoices/Payments UI is built, rather than being hardcoded English literals that need a second pass later.
- Reinforces the same "structural advantage, not a localization afterthought" positioning [vision.md](../vision.md) claims against incumbents — the claim is only true if the convention is actually followed from the first component onward, which this ADR makes an explicit, ongoing discipline rather than an aspirational statement.

**Trade-offs accepted:**
- Every component author must actively apply the logical-property convention correctly, with no tooling currently enforcing it (no lint rule catches a stray `ml-4`) — an accepted, currently-manual discipline, reviewed the same way as any other code-review convention until/unless tooling is added.
- Arabic-speaking users get no actual translated UI or RTL layout until Phase 4 ships — the convention protects the *foundation* for that work, it does not pull the user-facing localization itself earlier than the roadmap's stated sequencing.

## Future implications

- [enterprise-roadmap.md §3](../enterprise-roadmap.md#3-multi-language) already specifies the concrete Phase 4 implementation: adopt `next-intl`, extract every current user-facing string in one mechanical pass (not incrementally per-module, to avoid a long half-translated period), dynamic `dir`/`lang` on `<html>`, and a per-tenant default-language setting (the domain model's already-deferred `Tenant.locale` field is the natural home for it).
- Arabic-Indic numerals are explicitly a locale *preference*, not a launch requirement — default to Western Arabic numerals unless customer research says otherwise ([design-system.md §8](../design-system.md#8-rtl--internationalization)); this should not be silently upgraded to a hard requirement without that research actually happening.
- Any future expansion into a market with its own distinct script/direction/formatting needs should extend this same "convention now, full localization when validated" pattern, rather than each new market inventing its own localization-timing decision from scratch.
