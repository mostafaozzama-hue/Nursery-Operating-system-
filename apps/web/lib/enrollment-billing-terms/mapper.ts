import type { DepositRefundPolicy } from '@nursery-os/contracts';

export const DEPOSIT_REFUND_POLICY_LABEL: Record<DepositRefundPolicy, string> = {
  FORFEIT: 'Forfeit (not returned)',
  APPLY_TO_FINAL: 'Apply to final invoice',
  NON_REFUNDABLE: 'Non-refundable',
};
