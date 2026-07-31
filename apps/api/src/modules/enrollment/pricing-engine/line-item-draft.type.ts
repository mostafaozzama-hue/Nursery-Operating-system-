export const LINE_ITEM_DRAFT_SOURCE_TYPES = ['PLAN_TUITION', 'FEE', 'DISCOUNT', 'WAIVER'] as const;
export type LineItemDraftSourceType = (typeof LINE_ITEM_DRAFT_SOURCE_TYPES)[number];

/**
 * PROVISIONAL - internal type only, no consumer exists yet. Neither frozen
 * document defines LineItemDraft's shape anywhere; this mirrors
 * InvoiceLineItem's eventual insertable columns minus tenantId/invoiceId
 * (added later by whatever writes it). Expect this to change, possibly
 * substantially, once InvoiceService.replaceGeneratedLines (its actual first
 * consumer, built at build-order step 6) exists and imposes real
 * requirements on it. Money fields are strings, not numbers - internal
 * arithmetic uses Prisma.Decimal throughout, converted to string only here.
 */
export interface LineItemDraft {
  sourceType: LineItemDraftSourceType;
  description: string;
  quantity: string;
  unitAmount: string;
  totalAmount: string;
  planPriceId?: string;
}
