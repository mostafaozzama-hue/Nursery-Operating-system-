-- Partial unique indexes and CHECK constraints the Configuration Engine
-- extension calls for that Prisma DSL can't express, same pattern as
-- 20260720125319_add_enrollment_constraints / 20260721121307_add_billing_constraints.
-- See docs/architecture/domain-model.md's Business Invariants section.

-- CreateIndex (partial: at most one open-ended price per plan, same shape as
-- enrollments_child_id_open_unique)
CREATE UNIQUE INDEX "plan_prices_plan_id_open_unique" ON "plan_prices"("plan_id") WHERE "effective_to" IS NULL AND "deleted_at" IS NULL;

-- CreateIndex (partial: exactly one EnrollmentBillingTerms per Enrollment among live rows - 1:1, created/closed in lockstep)
CREATE UNIQUE INDEX "enrollment_billing_terms_enrollment_id_unique_active" ON "enrollment_billing_terms"("enrollment_id") WHERE "deleted_at" IS NULL;

-- CreateIndex (partial: at most one open-ended tier per threshold, identical shape/reasoning to plan_prices_plan_id_open_unique)
CREATE UNIQUE INDEX "sibling_discount_tiers_threshold_open_unique" ON "sibling_discount_tiers"("tenant_id", "sibling_count_threshold") WHERE "effective_to" IS NULL AND "deleted_at" IS NULL;

-- CreateConstraint (conditional-required fields, per domain-model.md's explicit "required if" invariants)
ALTER TABLE "enrollment_billing_terms" ADD CONSTRAINT "enrollment_billing_terms_custom_rate_reason_required" CHECK ("custom_rate_amount" IS NULL OR "custom_rate_reason" IS NOT NULL);
ALTER TABLE "waivers" ADD CONSTRAINT "waivers_review_or_expiry_required" CHECK ("effective_to" IS NOT NULL OR "review_annually" = true);
ALTER TABLE "manual_overrides" ADD CONSTRAINT "manual_overrides_reason_note_required_for_other" CHECK ("reason_code" != 'OTHER' OR "reason_note" IS NOT NULL);
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_applied_to_invoice_required" CHECK ("status" != 'APPLIED' OR "applied_to_invoice_id" IS NOT NULL);
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_refunded_via_required" CHECK ("status" != 'REFUNDED' OR "refunded_via" IS NOT NULL);

-- CreateConstraint (financial invariants, matching the app-vs-constraint split used in add_billing_constraints)
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_amount_non_negative" CHECK ("amount" >= 0);
ALTER TABLE "fees" ADD CONSTRAINT "fees_amount_non_negative" CHECK ("amount" >= 0);
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_amount_non_negative" CHECK ("amount" >= 0);
ALTER TABLE "child_fee_assignments" ADD CONSTRAINT "child_fee_assignments_snapshot_amount_non_negative" CHECK ("snapshot_amount" >= 0);
ALTER TABLE "child_discount_assignments" ADD CONSTRAINT "child_discount_assignments_snapshot_amount_non_negative" CHECK ("snapshot_amount" >= 0);
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_amount_applied_positive" CHECK ("amount_applied" > 0);
ALTER TABLE "enrollment_billing_terms" ADD CONSTRAINT "enrollment_billing_terms_custom_rate_amount_non_negative" CHECK ("custom_rate_amount" IS NULL OR "custom_rate_amount" >= 0);
ALTER TABLE "enrollment_billing_terms" ADD CONSTRAINT "enrollment_billing_terms_deposit_amount_non_negative" CHECK ("deposit_amount" IS NULL OR "deposit_amount" >= 0);
ALTER TABLE "sibling_discount_tiers" ADD CONSTRAINT "sibling_discount_tiers_percentage_valid_range" CHECK ("discount_percentage" >= 0 AND "discount_percentage" <= 100);
ALTER TABLE "waivers" ADD CONSTRAINT "waivers_percentage_valid_range" CHECK ("percentage" >= 0 AND "percentage" <= 100);

-- CreateConstraint (Tenant.billingAnchorDay explicitly documented as 1-28; billingLeadTimeDays can't be negative)
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_billing_anchor_day_valid_range" CHECK ("billing_anchor_day" >= 1 AND "billing_anchor_day" <= 28);
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_billing_lead_time_days_non_negative" CHECK ("billing_lead_time_days" >= 0);
