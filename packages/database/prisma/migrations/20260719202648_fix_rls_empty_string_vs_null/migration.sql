-- Fixes a real defect found by the Identity e2e test suite: PostgreSQL's
-- SET LOCAL / set_config(name, value, true) rolls a custom GUC back to an
-- EMPTY STRING (not NULL) at transaction end, once that GUC has been set at
-- least once on the connection. tenant_memberships has two OR'd policies
-- (tenant_isolation via app.tenant_id, self_access via app.user_id) - a
-- request that sets only one of them leaves the other's stale placeholder
-- at '' on a reused pooled connection. The old `current_setting(...) IS NOT
-- NULL` guard treats '' as "set" and then fails casting '' to uuid, turning
-- a should-be-clean "no access" into a hard error.
--
-- Fix: NULLIF(current_setting(...), '') converts both the "never set" (NULL)
-- and "reset to empty string after rollback" cases to NULL uniformly before
-- casting. Casting NULL::uuid is always safely NULL, and comparing a column
-- to NULL evaluates to NULL (excluded, not an error) - fail-closed without
-- crashing. This also removes the need for a separate IS NOT NULL check.

DROP POLICY "tenant_isolation" ON "tenant_memberships";
CREATE POLICY "tenant_isolation" ON "tenant_memberships"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY "self_access" ON "tenant_memberships";
CREATE POLICY "self_access" ON "tenant_memberships"
  USING ("user_id" = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK ("user_id" = NULLIF(current_setting('app.user_id', true), '')::uuid);

DROP POLICY "tenant_isolation" ON "classrooms";
CREATE POLICY "tenant_isolation" ON "classrooms"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY "tenant_isolation" ON "children";
CREATE POLICY "tenant_isolation" ON "children"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY "tenant_isolation" ON "enrollments";
CREATE POLICY "tenant_isolation" ON "enrollments"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY "tenant_isolation" ON "guardians";
CREATE POLICY "tenant_isolation" ON "guardians"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY "tenant_isolation" ON "child_guardians";
CREATE POLICY "tenant_isolation" ON "child_guardians"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY "tenant_isolation" ON "staff";
CREATE POLICY "tenant_isolation" ON "staff"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY "tenant_isolation" ON "attendance";
CREATE POLICY "tenant_isolation" ON "attendance"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY "tenant_isolation" ON "invoices";
CREATE POLICY "tenant_isolation" ON "invoices"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY "tenant_isolation" ON "invoice_line_items";
CREATE POLICY "tenant_isolation" ON "invoice_line_items"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY "tenant_isolation" ON "payments";
CREATE POLICY "tenant_isolation" ON "payments"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
