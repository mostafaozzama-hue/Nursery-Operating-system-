-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "due_date" DATE;

-- CreateConstraint (financial invariants, matching the app-vs-constraint split used elsewhere)
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_total_amount_non_negative" CHECK ("total_amount" >= 0);
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_amounts_non_negative" CHECK ("unit_amount" >= 0 AND "total_amount" >= 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0);
