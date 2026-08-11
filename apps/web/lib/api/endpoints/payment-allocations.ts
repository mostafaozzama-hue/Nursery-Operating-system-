import type { AvailableCreditResponse } from '@nursery-os/contracts';
import { get } from '../client';

/** PaymentAllocation itself has no direct write endpoint - system-internal, always a side effect of payments.record (see endpoints/payments.ts). The only route this module has is the guardian's computed available credit. */
export const paymentAllocations = {
  getAvailableCredit: (guardianId: string) =>
    get<AvailableCreditResponse>(`/guardians/${guardianId}/credit`),
};
