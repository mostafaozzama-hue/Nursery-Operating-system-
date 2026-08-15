# ADR-0005: Parent Communication Prioritizes WhatsApp

- **Status:** Accepted
- **Date:** 2026-07-19 (vision), scheduled for Phase 2 build ([roadmap.md](../roadmap.md))
- **Related:** [vision.md](../vision.md), [product-principles.md](../product-principles.md) principle 30, [feature-map.md — Communication](../feature-map.md#communication), [feature-map.md — Parent App](../feature-map.md#parent-app), [roadmap.md Phase 2](../roadmap.md#phase-2--growth)

## Context

Nursery OS's primary target market is Egypt and the wider GCC/MENA region ([vision.md](../vision.md)). In that market, WhatsApp penetration among parents and small businesses "dwarfs" both push notifications and email as a trusted, actually-checked communication channel. Today, the product's parent-communication reality (per [vision.md](../vision.md) problem #3 and [user-journeys.md — Parent](../user-journeys.md#parent)) is entirely informal: overworked teachers sending updates through personal WhatsApp groups, with no record, no scale past a handful of children per teacher, and no connection to the system of record.

## Problem

Every incumbent competitor named in the competitive frame (Brightwheel, Procare, Kangarootime — US-market-built; Illumine — India/APAC) defaults to in-app messaging or push notifications as the parent-communication channel, because that's what their home markets' parents actually check. Copying that default in Nursery OS's primary market would mean building a communication feature parents don't trust or open, while the *actual* channel they already live in (WhatsApp) stays outside the product — recreating exactly the "trust erosion" and "fragmented tools" problems the product exists to solve.

## Decision

**Parent-facing notifications and updates are WhatsApp-first**, not in-app-messaging-first or push-notification-first, for the primary market. This is explicit in [product-principles.md](../product-principles.md) principle 30 ("Parent communication meets parents where they already are") and shapes the Communication domain's build sequencing: WhatsApp-integrated broadcast messaging is pulled into **Phase 2** ([roadmap.md](../roadmap.md)) — ahead of where its Professional-tier pricing placement would otherwise put it — specifically because it's a named, market-specific differentiator, not a generic nice-to-have feature competing for priority on pure feature-value grounds alone.

The Parent App's own notification delivery (Professional tier, [feature-map.md — Parent App](../feature-map.md#parent-app)) is explicitly scoped as "WhatsApp-first notification delivery," and Attendance-absence-to-guardian-notification automation ([feature-map.md — Automation](../feature-map.md#automation)) is designed to ride the same channel once built.

## Alternatives considered

1. **In-app messaging as the primary channel** (the incumbent default). Rejected: requires a parent to install/open a dedicated app and check it regularly — exactly the adoption friction the vision document names as the reason incumbents underserve this market. A message a parent never opens delivers zero trust value regardless of how well-built the in-app inbox is.
2. **Push notifications as the primary channel.** Rejected for the same underlying reason: push notifications assume a native app with granted notification permissions is already part of the parent's daily habit — an assumption the vision document explicitly identifies as a Western-market default that doesn't transfer to this market's actual behavior.
3. **Email as the primary channel.** Rejected: lower open rates and slower response expectations than WhatsApp in this market; also a poor fit for the "quick update from a teacher's three-word note" use case ([vision.md](../vision.md) long-term AI vision) that WhatsApp's message-based, always-open UX suits far better.
4. **Build a channel-agnostic notification abstraction from day one** (WhatsApp, email, push, in-app all pluggable equally). Rejected as premature: [feature-map.md — Communication](../feature-map.md#communication) explicitly defers "an in-app notification center unifying WhatsApp, email, and in-app channels with per-guardian preference" to **Future** tier, after WhatsApp-first delivery is validated — building the abstraction before the single channel that actually matters is proven risks the generic-framework trap noted in [ADR-0004](./0004-module-separation-over-monolithic-entity-pages.md).

## Consequences

**Positive:**
- Directly targets [vision.md](../vision.md)'s named differentiation wedge against incumbents — this is positioned as a structural advantage, not a localization afterthought, and pulling it into Phase 2 (ahead of the rest of Professional-tier work) protects that positioning from being diluted by generic feature-parity sequencing.
- Unblocks two personas' core journeys simultaneously: Parent (who currently has no experience in the product at all) and Teacher (who currently sends these updates manually, off-system, per [user-journeys.md](../user-journeys.md)).
- Aligns with the product's broader "meet the market as it actually behaves" thesis, the same reasoning behind [ADR-0009](./0009-regional-payment-methods-first-class.md)'s payment-method decision and [ADR-0016](./0016-android-tablet-priority-device.md)'s device-target decision — these three decisions reinforce, rather than compete with, each other as one coherent regional-fit strategy.

**Trade-offs accepted:**
- Depends on WhatsApp Business API integration, a third-party platform dependency outside the product's own control (rate limits, template-message approval processes, API changes) — an accepted cost of meeting the market where it is, versus building a fully self-hosted in-app channel with no external dependency.
- International expansion beyond MENA ([vision.md](../vision.md) long-term vision) will eventually require the channel-agnostic abstraction explicitly deferred above, since WhatsApp is not universally dominant in every future target market — this decision is scoped to the *current* primary market, not a permanent architectural commitment to WhatsApp as the only channel forever.

## Future implications

- The eventual two-way threaded messaging capability ([feature-map.md — Communication](../feature-map.md#communication), Enterprise tier, explicitly *not* a naive 1:1 chat since a thread about one child typically involves multiple guardians and staff) should be designed to work over WhatsApp as a transport where possible, preserving this channel decision rather than quietly reverting to in-app-only once the feature gets more sophisticated.
- When Nursery OS expands beyond MENA ([vision.md](../vision.md)), this ADR should be revisited per-region rather than assumed — the "meet parents where they are" *principle* is permanent; the specific channel (WhatsApp) is a MENA-market instantiation of it, not the principle itself.
- AI Parent Communication (Phase 5, [feature-map.md — AI](../feature-map.md#ai) — "drafting parent updates from a teacher's three-word note") is designed against this channel from the start; any future channel addition should extend, not replace, the WhatsApp delivery path this ADR establishes as primary.
