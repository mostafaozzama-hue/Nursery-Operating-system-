# ADR-0016: Inexpensive Android Tablet Is the Priority Device, Not iPad

- **Status:** Accepted
- **Date:** 2026-07-19 (vision), formalized in [design-system.md §6.2](../design-system.md#62-tablet-optimization-the-priority-device--teachers-front-desk)
- **Related:** [vision.md](../vision.md), [product-principles.md](../product-principles.md) principles 21–22, [design-system.md §6.2](../design-system.md#62-tablet-optimization-the-priority-device--teachers-front-desk), [user-journeys.md — Teacher](../user-journeys.md#teacher)

## Context

The highest-frequency daily user of Nursery OS is a Teacher, standing in a classroom, typically holding a child in one arm, using a shared classroom tablet to check in children, log attendance, and record quick activity notes ([user-journeys.md — Teacher](../user-journeys.md#teacher)). Every named incumbent competitor ([vision.md](../vision.md)'s competitive frame) designs and tests primarily against iPad as the reference tablet — a reasonable default for their home markets, but a real mismatch for this product's stated target market, where hardware budget is a genuine operating constraint for a small or medium nursery.

## Problem

Optimizing UI/UX exclusively against a flagship iPad's specs (high-resolution display, generous RAM, smooth touch latency, predictable browser/WebView behavior) risks shipping a product that looks and feels correct in development and demos, but performs poorly — sluggish, laggy, touch-target-mismatched — on the actual, lower-spec Android hardware that a cost-conscious nursery in the target market will realistically buy and put in a teacher's hands.

## Decision

**Every screen must work well on an inexpensive Android tablet, not just a flagship iPad** — [product-principles.md](../product-principles.md) principle 21 states this as "a real constraint on the target market's hardware budget, not a nice-to-have." This shapes concrete, specific design commitments in [design-system.md §6.2](../design-system.md#62-tablet-optimization-the-priority-device--teachers-front-desk): a minimum 44×44px touch target for any teacher-facing action (larger than the general 40px desktop button spec), selection-over-typing as the default interaction (a photo grid for check-in rather than a searchable dropdown), a sticky bottom action bar keeping the primary action in the thumb-reachable zone for one-handed operation, and avoiding modal dialogs that require precise small-target dismissal on a tablet in motion — preferring full-screen or bottom-sheet drawers instead.

This pairs directly with [product-principles.md](../product-principles.md) principle 22 ("every teacher-facing action must be operable one-handed, because the other hand is often holding a child") and principle 3 ("selection beats typing, always") — none of these are independent nice-to-haves, they are three facets of the same underlying device-and-persona reality.

## Alternatives considered

1. **Design against iPad as the reference device, matching every named competitor's default.** Rejected: this directly contradicts [vision.md](../vision.md)'s explicit market-fit thesis — the product's differentiation rests partly on serving exactly the device economics incumbents ignore; copying their device assumption would quietly undo one of the product's own named advantages.
2. **Design a device-agnostic responsive layout with no particular priority device**, treating desktop, iPad, and Android tablet as equally weighted targets. Rejected: [design-system.md §6.2](../design-system.md#62-tablet-optimization-the-priority-device--teachers-front-desk) explicitly names tablet as "the priority device" for the teacher/front-desk persona specifically — a genuinely equal-weighting approach would dilute the specific commitments (44px touch targets, bottom-sheet drawers) that only make sense once one device/persona combination is named as the design's primary constraint.
3. **Build a native Android app optimized for low-end hardware, rather than a responsive web app.** Not rejected outright, but explicitly deferred: [technical ADR-0001](../../adr/0001-core-platform-architecture.md) already establishes the web (PWA) as shipping first, with mobile (React Native/Expo) deferred until after MVP — the low-end-Android-tablet commitment in *this* ADR is about how the responsive web app behaves on that hardware today, not a decision to build native software instead; a future Teacher App ([feature-map.md — Teacher App](../feature-map.md#teacher-app)) may eventually revisit the native-vs-web question, but that is a separate decision from this one.

## Consequences

**Positive:**
- Directly reinforces [vision.md](../vision.md)'s stated differentiation against incumbents ("explicitly designed and tested for inexpensive Android tablets" vs. their "iPad-first" default) — this is a genuine, testable product commitment, not just a marketing claim, once §6.2's concrete specs (44px targets, bottom action bars) are actually implemented and verified on real low-end hardware.
- The one-handed, selection-over-typing interaction model this decision drives directly serves the Teacher persona's single biggest named pain point ([user-journeys.md — Teacher](../user-journeys.md#teacher)): "the highest-frequency daily user... with the least patience for friction."
- Forces genuinely good UX discipline (large touch targets, minimal typing, thumb-reachable primary actions) that also benefits every *other* device and persona using the same shared component set — a tablet-first constraint tends to produce components that are simply easier to use everywhere, not a narrow optimization that trades off against desktop/mobile quality.

**Trade-offs accepted:**
- Components must be verified against real low-end Android hardware, not just simulated/responsive-mode testing in a desktop browser — a real, ongoing testing discipline cost that a purely "responsive CSS" approach could otherwise skip.
- Some visual density trade-offs follow from 44px-minimum touch targets (less can fit on screen at once than a denser, mouse-optimized desktop layout would allow) — an accepted cost for the priority device and persona, not applied uniformly to every screen (desktop-oriented Owner/Manager screens retain the smaller 40px general spec).

## Future implications

- The forthcoming Attendance check-in/out frontend ([feature-map.md — Attendance](../feature-map.md#attendance)) is explicitly named in [design-system.md §6.2](../design-system.md#62-tablet-optimization-the-priority-device--teachers-front-desk) as "the canonical example" this device/interaction commitment was written for — it should be the first real, concrete test of whether these specs hold up in practice, not just Payroll/Staff's desktop-oriented admin screens.
- The future dedicated **Teacher App** ([feature-map.md — Teacher App](../feature-map.md#teacher-app)) inherits this device commitment as its starting baseline, not a fresh design question — classroom-roster-default-landing, quick activity/meal/nap logging, and one-handed interaction design are all already specified in terms of this same low-end-Android-tablet target.
- If the product ever expands into a market segment where the dominant device reality is meaningfully different (e.g. a future market where desktop-based front-desk staff dominate over tablet-holding teachers), this ADR's *device* conclusion should be revisited for that context — while the underlying *principle* (design for the real hardware/context your highest-frequency user actually has, not an aspirational flagship device) should carry forward regardless of market.
