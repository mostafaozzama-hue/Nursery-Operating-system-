-- Row Level Security for the remaining tenant-owned domain tables, mirroring
-- the exact pattern already implemented and verified for tenant_memberships:
-- FORCE so the table owner is subject to RLS too (superusers/BYPASSRLS roles
-- still bypass regardless - the app must connect as nursery_app, never the
-- nursery owner/superuser), and a fail-closed policy where a missing
-- app.tenant_id denies all rows rather than allowing them.

ALTER TABLE "classrooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "classrooms" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "classrooms"
  USING (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  );

ALTER TABLE "children" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "children" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "children"
  USING (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  );

ALTER TABLE "enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enrollments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "enrollments"
  USING (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  );

ALTER TABLE "guardians" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "guardians" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "guardians"
  USING (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  );

ALTER TABLE "child_guardians" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "child_guardians" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "child_guardians"
  USING (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  );

ALTER TABLE "staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "staff"
  USING (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  );

ALTER TABLE "attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "attendance"
  USING (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  );

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "invoices"
  USING (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  );

ALTER TABLE "invoice_line_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_line_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "invoice_line_items"
  USING (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  );

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "payments"
  USING (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NOT NULL
    AND "tenant_id" = current_setting('app.tenant_id', true)::uuid
  );
