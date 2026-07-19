-- Row Level Security: tenant_memberships is the only identity table that
-- carries tenant-owned rows requiring isolation (tenants IS the tenant
-- boundary; users and roles are cross-tenant/global by design).

ALTER TABLE "tenant_memberships" ENABLE ROW LEVEL SECURITY;

-- FORCE so RLS also applies to the table owner, not just other roles.
-- Superusers and BYPASSRLS roles still bypass regardless of FORCE - the
-- application's database role must be neither.
ALTER TABLE "tenant_memberships" FORCE ROW LEVEL SECURITY;

-- Fail-closed: current_setting(..., true) returns NULL rather than raising
-- when app.tenant_id was never set, and an explicit IS NOT NULL check (rather
-- than relying on NULL propagation through the equality comparison alone)
-- makes the deny-when-missing behavior self-evident.
CREATE POLICY "tenant_isolation" ON "tenant_memberships"
  USING (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  );
