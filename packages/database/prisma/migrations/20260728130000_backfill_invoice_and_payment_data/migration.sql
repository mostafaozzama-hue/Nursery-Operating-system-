-- The two Configuration Engine changes ADR-0017 explicitly names as
-- touching already-shipped data (not purely additive design), backfilled
-- then tightened to NOT NULL in one migration:
--   1. Invoice.invoiceNumber - sequential, tenant-scoped, human-readable.
--   2. Payment.guardianId - derived from the invoice it was recorded
--      against; every pre-existing row had a required invoice_id.
-- See docs/architecture/domain-model.md and ADR-0017's Consequences section.

-- Backfill: INV-<year>-<6-digit-sequence>, sequenced per tenant by created_at.
WITH numbered AS (
  SELECT
    id,
    'INV-' || EXTRACT(YEAR FROM "created_at")::text || '-' ||
      LPAD(ROW_NUMBER() OVER (PARTITION BY "tenant_id" ORDER BY "created_at")::text, 6, '0') AS generated_number
  FROM "invoices"
  WHERE "invoice_number" IS NULL
)
UPDATE "invoices"
SET "invoice_number" = numbered.generated_number
FROM numbered
WHERE "invoices"."id" = numbered.id;

-- Backfill: guardian_id derived from the linked invoice's billing party.
UPDATE "payments"
SET "guardian_id" = "invoices"."billed_to_guardian_id"
FROM "invoices"
WHERE "payments"."invoice_id" = "invoices"."id"
  AND "payments"."guardian_id" IS NULL;

-- AlterTable: every row now has a value - tighten to NOT NULL.
ALTER TABLE "invoices" ALTER COLUMN "invoice_number" SET NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "guardian_id" SET NOT NULL;

-- CreateIndex: sequential document numbering, same convention as
-- CreditNote.creditNoteNumber.
CREATE UNIQUE INDEX "invoices_tenant_id_invoice_number_key" ON "invoices"("tenant_id", "invoice_number");
