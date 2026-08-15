import { ConflictException } from '@nestjs/common';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { InvoiceService } from '../invoice/invoice.service';
import { ManualOverrideService } from '../manual-override/manual-override.service';
import { OneTimeChargeConflictError } from './one-time-charge-conflict.error';
import { OneTimeChargeRepository } from './one-time-charge.repository';
import { OneTimeChargeService } from './one-time-charge.service';

describe('OneTimeChargeService', () => {
  let repository: jest.Mocked<OneTimeChargeRepository>;
  let invoice: jest.Mocked<InvoiceService>;
  let manualOverride: jest.Mocked<ManualOverrideService>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: OneTimeChargeService;

  const lineItem = { id: 'line-1', description: 'Late pickup', unitAmount: '25', totalAmount: '25' };

  beforeEach(() => {
    repository = {
      runInTransaction: jest.fn().mockImplementation((_tenantId, fn) => fn('tx' as never)),
    } as unknown as jest.Mocked<OneTimeChargeRepository>;

    invoice = {
      addExceptionLineItem: jest.fn().mockResolvedValue({ lineItem, invoice: { status: 'DRAFT' } }),
    } as unknown as jest.Mocked<InvoiceService>;

    manualOverride = {
      record: jest.fn().mockResolvedValue({ id: 'override-1' }),
    } as unknown as jest.Mocked<ManualOverrideService>;

    currentTenant = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new OneTimeChargeService(repository, invoice, manualOverride, currentTenant, currentUser);
  });

  const dto = { description: 'Late pickup', quantity: 1, unitAmount: 25, chargeCategory: 'LATE_PICKUP' as const };

  it('adds the line item and does not record a ManualOverride when the invoice is DRAFT', async () => {
    const result = await service.add('invoice-1', dto);

    expect(invoice.addExceptionLineItem).toHaveBeenCalledWith(
      'tx',
      'tenant-1',
      'invoice-1',
      { description: 'Late pickup', quantity: 1, unitAmount: 25, chargeCategory: 'LATE_PICKUP' },
      'user-1',
    );
    expect(manualOverride.record).not.toHaveBeenCalled();
    expect(result).toEqual(lineItem);
  });

  it('records a ManualOverride when the invoice is not DRAFT and reasonCode is supplied', async () => {
    invoice.addExceptionLineItem.mockResolvedValue({ lineItem, invoice: { status: 'ISSUED' } } as never);

    await service.add('invoice-1', { ...dto, reasonCode: 'GOODWILL' });

    expect(manualOverride.record).toHaveBeenCalledWith(
      'tx',
      'tenant-1',
      expect.objectContaining({
        overrideType: 'ONE_TIME_CHARGE',
        reasonCode: 'GOODWILL',
        relatedEntityType: 'InvoiceLineItem',
        relatedEntityId: 'line-1',
        previousValue: null,
      }),
      'user-1',
    );
  });

  it('throws a 409 when the invoice is not DRAFT and no reasonCode is supplied', async () => {
    invoice.addExceptionLineItem.mockResolvedValue({ lineItem, invoice: { status: 'ISSUED' } } as never);

    await expect(service.add('invoice-1', dto)).rejects.toThrow(ConflictException);
    expect(manualOverride.record).not.toHaveBeenCalled();
  });

  it('translates OneTimeChargeConflictError from the transaction into a 409', async () => {
    repository.runInTransaction.mockRejectedValue(new OneTimeChargeConflictError('reasonCode is required'));
    await expect(service.add('invoice-1', dto)).rejects.toThrow(ConflictException);
  });
});
