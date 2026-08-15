# ADR-0014: AI Is Deliberately Sequenced Last

- **Status:** Accepted
- **Date:** 2026-07-25 (roadmap.md), consistent with the technical ADR-0001's original AI non-goal
- **Related:** [vision.md](../vision.md), [roadmap.md Phase 5](../roadmap.md#phase-5--ai-platform), [feature-map.md — AI](../feature-map.md#ai), [technical ADR-0001](../../adr/0001-core-platform-architecture.md)

## Context

[vision.md](../vision.md)'s long-term vision names an explicit, ambitious AI-assisted end state: "a system that proactively tells an owner what needs attention today, drafts a parent update from a teacher's three-word note, flags a capacity problem before it becomes a waitlist crisis, and reconciles payments without anyone opening a spreadsheet." This is a genuine part of the product's stated destination, not an afterthought. AI is also explicitly named as a non-goal in the original technical architecture ADR ("Explicit non-goals (for now)... AI features... These may be introduced later, each as its own decision once there is a concrete, validated requirement — not built ahead of need").

## Problem

AI-assisted features (an AI Assistant answering "who hasn't paid this month," AI Lesson Planning, AI-drafted parent updates) are only as good as the structured, trustworthy data they operate over. Building any of these before the domains they depend on — Billing/Payments (for the payment-reconciliation example), Learning (for lesson planning), Activities (for the "teacher's three-word note" example) — actually exist and are mature would mean building against data models that don't exist yet, or against early, still-changing versions of them.

## Decision

**AI is Phase 5 — the last phase in [roadmap.md](../roadmap.md), sequenced after MVP (Phase 1), Growth (Phase 2), Professional (Phase 3), and Enterprise (Phase 4) are complete.** The roadmap's own sequencing rationale states this plainly: "every AI feature scoped in Phase 5 depends on clean, mature data from an earlier phase (AI Reports needs Phase 4's analytics; AI Lesson Planning needs Phase 4's Learning module) — building AI earlier would mean building it against data models that don't exist yet." [feature-map.md — AI](../feature-map.md#ai) reinforces this: "AI is a Phase 5 capability, not gated into the first three tiers" — not included at Starter, Professional, or Enterprise pricing at all, pending its own future pricing/plan decision once scoped.

## Alternatives considered

1. **Build a narrow AI feature early** (e.g. an AI-drafted parent update, since Communication/WhatsApp is already a named Phase 2 priority) to demonstrate the vision sooner. Rejected: the specific example named in the vision document — "drafts a parent update from a teacher's three-word note" — explicitly depends on Phase 3's Activities/Teacher App logging existing first as the source material; building the AI layer before that source data exists would mean either fabricating a demo against no real data, or building a one-off data-collection mechanism just to feed the AI feature, duplicating work Phase 3 already plans to do properly.
2. **Design a general "AI-ready" data/event infrastructure now, ahead of any concrete AI feature**, so future AI work has less to retrofit. Rejected as premature: this is the same reasoning the technical ADR already applied to a related concern (explicitly naming "event bus / cross-context async messaging" as a current non-goal) — speculative infrastructure for a capability with no concrete, validated feature request yet is the exact anti-pattern the technical ADR's non-goals section was written to prevent, and [ADR-0006](./0006-mvp-for-small-nurseries-enterprise-compatible.md)'s "don't build speculatively" reasoning applies equally here.
3. **Price and market AI capability today, delivering it progressively later.** Rejected: [pricing-strategy.md](../pricing-strategy.md)'s open pricing questions explicitly leave "whether Phase 5 AI capabilities become a fourth 'AI' plan tier or an add-on" as an undecided, deferred GTM question — committing to AI in pricing/marketing before the underlying phases exist would create a customer-facing promise the product can't yet honor, and would pressure the roadmap to skip ahead of the very data-maturity dependency this ADR exists to respect.

## Consequences

**Positive:**
- Every AI feature, when eventually built, operates over genuinely mature, validated data models (a stable Learning module's curriculum data, Phase 4's analytics aggregates) rather than early, still-shifting versions — reducing the risk of building an AI feature that has to be substantially reworked when its underlying data model changes.
- The product's near-term roadmap stays honest and deliverable: Phases 1–4 are scoped around already-validated customer needs (attendance, billing, staffing, multi-branch), not diluted by speculative AI work competing for the same engineering capacity.
- Protects the credibility of the AI vision itself — shipping a shallow, unreliable AI feature early (built against immature data) risks undermining trust in the eventual, properly-sequenced AI Platform more than not having AI yet does.

**Trade-offs accepted:**
- The product's most differentiated long-term vision (an "AI-assisted operating layer") is not visible or demonstrable to prospective customers or investors until Phase 5 — a real, accepted cost, weighed against the alternative of shipping something premature under that banner.
- Competitors who ship shallower AI features earlier (regardless of whether their underlying data supports them well) may appear more "innovative" in the near term — an accepted trade-off in favor of building the capability on a foundation that will actually support it well once it ships.

## Future implications

- Phase 5's AI Assistant, AI Reports, AI Lesson Planning, and AI Parent Communication features ([feature-map.md — AI](../feature-map.md#ai)) should each be re-validated against this ADR's core test at the time they're actually scoped: does the data model this feature depends on already exist, and is it mature? If a proposed Phase 5 AI feature's dependency isn't actually done yet, it should slip further, not be started against an incomplete foundation.
- The open pricing question (fourth "AI" plan tier vs. Enterprise add-on vs. universal upgrade — [pricing-strategy.md](../pricing-strategy.md)) should be revisited once Phase 4 is substantially complete and Phase 5 scoping actually begins — not resolved speculatively now.
- If a genuinely compelling, narrow AI opportunity emerges before Phase 5 that does *not* depend on later-phase data (e.g. something purely inferential over already-mature Phase 1 data), it should be evaluated on its own merits as a deliberate, explicit exception — with its own new ADR justifying the deviation — rather than treated as license to generally start pulling AI work forward.
