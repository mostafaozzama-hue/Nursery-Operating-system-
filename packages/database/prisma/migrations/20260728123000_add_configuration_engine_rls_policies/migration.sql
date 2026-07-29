-- Row Level Security for the Configuration Engine extension's tenant-owned
-- tables. Uses the corrected policy pattern established in
-- 20260719202648_fix_rls_empty_string_vs_null (NULLIF(current_setting(...),
-- '')::uuid, not the superseded `IS NOT NULL AND ...::uuid` form): SET
-- LOCAL / set_config(name, value, true) rolls a custom GUC back to an EMPTY
-- STRING (not NULL) at transaction end once it's been set at least once on
-- a reused pooled connection, so the naive IS NOT NULL guard can fail-open
-- into a cast error instead of failing closed. FORCE so the table owner is
-- subject to RLS too (the app connects as nursery_app, never nursery).
--
-- Includes enrollment_billing_terms, which domain-model.md's RLS
-- implications list omits by oversight - it is a tenant-owned table exactly
-- like every other table in this migration (carries its own tenant_id) and
-- the document's own general rule ("every new tenant-owned table needs its
-- own policy migration, no exceptions") already covers it without needing a
-- design decision. See docs/architecture/domain-model.md.

ALTER TABLE "enrollment_billing_terms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enrollment_billing_terms" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "enrollment_billing_terms"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plans" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "plans"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "plan_prices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_prices" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "plan_prices"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "fees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fees" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "fees"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "plan_fees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_fees" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "plan_fees"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "child_fee_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "child_fee_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "child_fee_assignments"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "discounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "discounts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "discounts"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "child_discount_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "child_discount_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "child_discount_assignments"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "sibling_discount_tiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sibling_discount_tiers" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "sibling_discount_tiers"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "waivers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waivers" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "waivers"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "holidays" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "holidays" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "holidays"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "billing_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_runs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "billing_runs"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "payment_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_allocations" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "payment_allocations"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "manual_overrides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "manual_overrides" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "manual_overrides"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "credit_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_notes" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "credit_notes"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
