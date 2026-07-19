-- tenant_memberships has two legitimate access patterns, per the original
-- Identity design: (1) tenant-scoped, via app.tenant_id, for normal
-- per-tenant queries; (2) self-scoped, via app.user_id, for the one case
-- where a tenant isn't known yet - resolving which membership(s) a user has
-- immediately after password verification at login, before any tenant
-- context exists to set.
--
-- Multiple PERMISSIVE policies (the default kind) on the same table for the
-- same command are combined with OR, so this is purely additive: it does
-- not weaken the existing tenant_isolation policy for ordinary tenant-scoped
-- queries, it only adds a second, narrower way in.

CREATE POLICY "self_access" ON "tenant_memberships"
  USING (
    current_setting('app.user_id', true) IS NOT NULL
    AND "user_id" = current_setting('app.user_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.user_id', true) IS NOT NULL
    AND "user_id" = current_setting('app.user_id', true)::uuid
  );
