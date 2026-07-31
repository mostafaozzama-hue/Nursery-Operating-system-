-- Fixes a conflict between domain-model.md's Configuration Engine design and
-- the pre-existing invoice_line_items_amounts_non_negative constraint.
--
-- Context: invoice_line_items_amounts_non_negative was added in migration
-- 20260721121307_add_billing_constraints, before InvoiceLineItem.sourceType
-- existed and before any negative-amount line item was ever conceived - at
-- that point every line item was a plain, manually-entered positive charge,
-- and an unconditional non-negative check was a reasonable invariant for
-- that scope.
--
-- domain-model.md's later, approved Configuration Engine extension explicitly
-- requires the opposite for two specific line types: "Discount and Waiver
-- reductions always materialize as their own InvoiceLineItem rows with a
-- negative totalAmount - never netted directly into the tuition line,
-- specifically so 'how much was waived/discounted this year' is a SUM
-- query." InvoiceRepository.recomputeTotal (already-shipped, pre-dates this
-- migration) already reconciles Invoice.totalAmount via a plain
-- SUM(InvoiceLineItem.totalAmount) aggregate - it relies on signed amounts
-- to net out correctly, exactly as domain-model.md's Business invariants
-- section describes ("Invoice.totalAmount should reconcile with
-- SUM(InvoiceLineItem.totalAmount)"). Nothing about the sum mechanism
-- changes here - only the constraint that was never updated to allow it.
--
-- Fix: replace the unconditional non-negative check with one conditioned on
-- sourceType. DISCOUNT/WAIVER-sourced lines (a negative reduction) must be
-- non-positive; every other line - PLAN_TUITION, FEE, ONE_TIME_CHARGE, and
-- the nullable legacy case (pre-Configuration-Engine manually-entered lines,
-- which were never negative and should not become so) - keeps the original
-- non-negative requirement unchanged.

ALTER TABLE "invoice_line_items" DROP CONSTRAINT "invoice_line_items_amounts_non_negative";

-- Written as CASE, not a plain OR of two AND-groups: an OR-of-ANDs form here
-- (source_type IN (...) AND ... <= 0) OR ((source_type IS NULL OR source_type
-- NOT IN (...)) AND ... >= 0) has a real bug when source_type IS NULL - the
-- first branch's "source_type IN (...)" evaluates to NULL (not FALSE) for a
-- NULL source_type, so "NULL AND anything" is NULL, and "NULL OR FALSE" is
-- NULL - which Postgres CHECK constraints treat as satisfied, silently
-- allowing a legacy (NULL sourceType) row with a negative amount through.
-- Confirmed by testing this exact case before settling on the CASE form
-- below, which does not have the same NULL-handling gap: a WHEN condition
-- that evaluates to NULL/unknown falls through to ELSE, so every source_type
-- value - including NULL - resolves to a definite, non-NULL boolean branch.
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_amounts_valid_by_source_type" CHECK (
  CASE
    WHEN "source_type" IN ('DISCOUNT', 'WAIVER') THEN "unit_amount" <= 0 AND "total_amount" <= 0
    ELSE "unit_amount" >= 0 AND "total_amount" >= 0
  END
);
