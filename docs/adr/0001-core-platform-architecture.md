# ADR-0001: Core Platform Architecture — Monorepo, Multi-Tenancy, and Module Boundaries

- **Status:** Accepted
- **Date:** 2026-07-18

## Context

Nursery Operating System is a greenfield, international, multi-tenant SaaS product. At the time of this decision the repository contains no code — only this documentation is being added. The product must eventually support a web application, a REST API, AI-assisted features, multiple tenants (nursery organizations), and multiple locales, with mobile support deferred until after MVP.

The architecture needed to satisfy:
- Clean Architecture and Domain-Driven Design where appropriate, without over-investing in structure the team hasn't yet validated with real requirements.
- TypeScript throughout.
- A path to add mobile, billing, messaging, AI, and other capabilities later without a foundational rewrite.
- A multi-tenancy model that is safe by default and does not depend solely on developers remembering to filter by tenant.

## Decision

### Technology stack

- **Turborepo** — monorepo build/task orchestration.
- **Next.js** — web application (PWA), deployed first.
- **NestJS** — REST API, hosts all server-side business logic.
- **PostgreSQL** — primary datastore.
- **Prisma** — ORM, used exclusively by the API.
- **TypeScript** — across the entire stack.

### Deployment target

- Web (PWA) ships first.
- Mobile (React Native / Expo) is deferred until after MVP. Shared contracts are kept API-friendly so a future mobile client can be added without renegotiating the API surface.

### Multi-tenancy

- Single shared PostgreSQL database. Tenant-owned tables carry a `tenant_id` column.
- PostgreSQL Row Level Security (RLS) enforces tenant isolation at the database layer.
- Defense in depth: RLS is the backstop, not the only guard — application-layer queries also filter explicitly by `tenant_id`. Neither mechanism is relied on alone.

### Data access boundary

1. `apps/web` **never** imports the Prisma client.
2. `apps/web` **never** talks directly to PostgreSQL.
3. All business logic lives in `apps/api`.
4. `packages/database` (the Prisma schema and generated client) is a dependency of `apps/api` only.

`apps/web` obtains all data exclusively through calls to `apps/api`. This keeps tenant-context enforcement (RLS session variables + explicit filtering) on a single, auditable code path. A second, ungoverned path from the web app directly into Postgres would defeat the isolation model this ADR establishes.

### Identity as a first-class module

`identity` is a core API module, not a deferred feature. It is responsible for:
- Authentication
- Authorization
- Roles
- JWT issuance and validation
- Tenant resolution (mapping an authenticated request to a `tenant_id`)

Every other module that needs to know "who is making this request, for which tenant, with what permissions" depends on `identity`. Its request-context resolution is a prerequisite for implementing `tenancy`'s tenant-scoping interceptor.

### Repository structure

```
apps/
  web/
  api/

packages/
  contracts/
  shared/
  database/
```

Inside `apps/api`:

```
src/
  modules/
    identity/
    tenancy/
    enrollment/
    attendance/
```

### Explicit non-goals (for now)

The following are intentionally excluded from the current architecture and are not being designed for speculatively:

- Billing
- Messaging
- AI features
- Event bus / cross-context async messaging
- Shared cross-platform design system
- Terraform / infrastructure-as-code
- React Native / mobile app
- Microservices split

These may be introduced later, each as its own decision once there is a concrete, validated requirement — not built ahead of need.

## Consequences

**Positive:**
- A single, centrally enforced data-access path makes the tenant-isolation guarantee auditable rather than dependent on convention.
- Treating `identity` as foundational avoids retrofitting authentication/tenant-resolution logic into `tenancy`, `enrollment`, and `attendance` after they've already made assumptions about the request/session model.
- Scope is deliberately small (4 modules, 2 apps, 3 packages), matching current validated requirements rather than anticipated ones.

**Trade-offs accepted:**
- Turborepo does not enforce package import boundaries at lint time (unlike Nx). The rule "`apps/web` never imports `packages/database`" is a convention that must be maintained by code review, not a build-time guarantee, until/unless tooling is added later.
- A shared PostgreSQL database with RLS means all tenants share fault domain and performance characteristics. This is accepted as the right trade-off for MVP scale; revisiting it is a deliberate future decision, not a design left open now.
- Mobile, billing, messaging, AI, and event-bus capabilities are out of scope. Adding any of them later may require new modules and new ADRs, but does not require restructuring `identity`, `tenancy`, `enrollment`, or `attendance`.

**Follow-ups required before implementation begins:**
- Design `identity`'s tenant-resolution mechanism (JWT claim vs. session lookup) before implementing `tenancy`'s RLS-context-setting interceptor, since `enrollment` and `attendance` will build directly on top of it.
