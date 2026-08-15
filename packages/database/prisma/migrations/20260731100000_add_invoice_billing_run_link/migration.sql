-- Resolves the "SCHEMA GAP 1" found while verifying BillingRunService:
-- Invoice had no linkage to a billing period or BillingRun at all, which
-- blocked idempotent regeneration (no query could answer "does an invoice
-- already exist for child X covering period Y"), locating a run's invoices,
-- and BillingRunConflictError's "already fully ISSUED" check. See
-- docs/SESSION_CHECKPOINT.md for the full verification trail.
--
-- Minimal fix: one nullable FK, not a duplicated periodStart/periodEnd pair
-- on Invoice - BillingRun already owns the period, this just references it.
-- Nullable because manually-created invoices (already-shipped, and any
-- future ad-hoc InvoiceService.create call) have no run to point to.

ALTER TABLE "invoices" ADD COLUMN "billing_run_id" UUID;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billing_run_id_fkey"
  FOREIGN KEY ("billing_run_id") REFERENCES "billing_runs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "invoices_billing_run_id_idx" ON "invoices"("billing_run_id");

-- At most one invoice per child per billing run - the DB-level backstop for
-- regenerateInvoiceForChild's find-or-create idempotency, same TOCTOU-safe
-- "unique index, not check-then-insert" pattern already used for BillingRun
-- itself and every other one-row-per-key invariant in this schema. Rows
-- with billing_run_id IS NULL (manually-created invoices) are never
-- constrained against each other - standard SQL NULL-vs-NULL semantics in a
-- unique index, not a special case written into this predicate.
CREATE UNIQUE INDEX "invoices_billing_run_child_unique" ON "invoices"("billing_run_id", "child_id") WHERE "deleted_at" IS NULL;
