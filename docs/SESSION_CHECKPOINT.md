# Session Checkpoint

- **Saved:** 2026-07-20
- **Purpose:** Resume point for the next session. Read this before continuing Identity/Classroom work.

## Git commit history

Branch `main`, 13 commits ahead of `origin/main` (nothing pushed yet). Working tree is clean — nothing staged, nothing modified.

```
56bb63e test(api): add Identity unit and e2e test suite
cada321 feat(api): retrofit Classroom with real auth guards and createdBy/updatedBy
4254948 feat(api): implement Identity authentication (JWT login, refresh rotation, guards, RBAC)
747cda7 fix(database): apply RLS policy migration
aef0f7c feat(database): add self-access RLS policy for tenant_memberships login lookup
10be6f3 feat(api): implement Classroom module as reference multi-tenant CRUD pattern
97a526c feat(database): enable RLS on remaining tenant-owned domain tables
16e4095 feat(database): implement initial nursery domain model
9894170 Setup NestJS API and database package
0fa0bbc chore(database): add least-privilege nursery_app application role
cb24315 feat(database): add row level security policies
5425312 feat(database): add initial identity Prisma schema
385b6dc chore: add local Postgres dev environment for Sprint 2
```

Note: `apps/api/package.json`'s diff (in the `4254948` commit) bundles both Identity's runtime dependencies (jwt/passport/argon2/cookie-parser) and the test tooling (jest/supertest/ts-jest) — split by file wasn't practical, so the test commit (`56bb63e`) only adds new files, no `package.json` changes.

## Working tree status

Clean. `git status --porcelain` returns nothing. Postgres (`docker-compose`) is up and healthy. No stray `node` processes running. No leftover e2e test data in the database (tenants/users/classrooms matching the e2e test naming pattern all confirmed at 0 rows).

## Completed backend features

**Database:** full MVP domain model (10 tables: Classroom, Child, Enrollment, Guardian, ChildGuardian, Staff, Attendance, Invoice, InvoiceLineItem, Payment) plus Identity's 6 tables. RLS enabled and forced on every tenant-owned table, including a self-access policy on `tenant_memberships` for pre-tenant-context login lookups. `nursery_app` least-privilege role in place.

**Identity module** (`apps/api/src/modules/identity/`): `POST /auth/login` (argon2 verify, membership resolution, RS256 JWT + opaque refresh token via httpOnly cookies), `POST /auth/refresh` (rotation + reuse detection + whole-chain revocation), `GET /auth/me`. `JwtAuthGuard`, `RolesGuard` → `AuthorizationService` (role-based, swappable for permissions later). `@CurrentUser`/`@CurrentTenant` decorators. `CurrentTenantProvider` swapped from the dev `FixedTenantProvider` stopgap to a real JWT-derived `JwtTenantProvider` (Classroom's own code didn't change, only the DI binding — the design worked as intended). New `CurrentUserProvider`/`JwtUserProvider` populate audit fields.

**Classroom module:** retrofitted with real `JwtAuthGuard`/`RolesGuard` protection (`OWNER`/`ADMIN` required for writes) and real `createdBy`/`updatedBy` from `CurrentUserProvider` (previously `null` placeholders).

**Test suite:** 45 unit tests (all passing) covering `AuthService`, `AuthorizationService`, `TokenService`, `RolesGuard`, `parseDurationMs`, `JwtTenantProvider`, `JwtUserProvider`. E2E suite written (`auth.e2e-spec.ts`, `authorization.e2e-spec.ts`, `rls-tenant-isolation.e2e-spec.ts`) covering login success/invalid/unknown-user, `/auth/me` with missing/malformed/wrong-key/expired tokens, refresh rotation + reuse detection + chain revocation, role-based authorization via Classroom, RLS tenant isolation via Classroom, and multiple active memberships.

**Real bugs found and fixed via testing** (not hypothetical — both confirmed root-caused):
1. Refresh reuse-detection was unreachable — a rotated-out token's `revokedAt` was caught by the generic "invalid" check before the `replacedByTokenId` reuse check ever ran. Fixed by reordering the checks in `AuthService.refresh`.
2. RLS defect: `SET LOCAL`/`set_config(..., true)` rolls a custom GUC back to an **empty string** (not `NULL`) after commit, once that GUC has been touched at least once on a connection. Since `tenant_memberships` has two OR'd policies (`tenant_isolation` via `app.tenant_id`, `self_access` via `app.user_id`), a request setting only one left the other's stale placeholder at `''` on a reused pooled connection, and casting `''::uuid` threw instead of cleanly excluding the row. Fixed every RLS policy (all 12, across 11 tables) to use `NULLIF(current_setting(...), '')::uuid`, which treats "never set" and "reset to empty string" identically and fails closed without erroring.

## Pending verification

**The e2e suite has not been confirmed passing after the empty-string RLS fix.** The re-run was interrupted mid-command before this checkpoint was requested. Before this session, the interleaving bug (finding #2 above) was reproduced and fixed, and confirmed via a standalone script (login → classroom op → login → classroom op → login, alternating context types, 5x in a row, all succeeded). The full `jest --config ./test/jest-e2e.json --runInBand` run itself has **not** been re-executed since the fix — that's the immediate unfinished item.

## Database migration status

```
6 migrations found in prisma/migrations
Database schema is up to date!
```

All 6 migrations applied, in order:
1. `20260719125200_init_identity_schema`
2. `20260719131543_add_rls_policies`
3. `20260719180905_add_domain_model`
4. `20260719182944_add_domain_rls_policies`
5. `20260719191622_add_membership_self_access_policy`
6. `20260719202648_fix_rls_empty_string_vs_null`

## Next recommended step

Re-run the full e2e suite (`cd apps/api && npx jest --config ./test/jest-e2e.json --runInBand`) to confirm the empty-string RLS fix actually resolves all three previously-failing tests (`rls-tenant-isolation.e2e-spec.ts` and the affected cases in `authorization.e2e-spec.ts`), and that nothing else regressed. Once that's green, produce the final coverage report and summary — the two deliverables still open from the "Identity test suite" task before moving on to the Child module.
