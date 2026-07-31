import { Prisma } from '@nursery-os/database';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { InvoiceService } from '../invoice/invoice.service';
import { PaymentAllocationRepository } from './payment-allocation.repository';
import { PaymentAllocationService } from './payment-allocation.service';

describe('PaymentAllocationService', () => {
  let repository: jest.Mocked<PaymentAllocationRepository>;
  let invoiceService: jest.Mocked<InvoiceService>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let service: PaymentAllocationService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      sumAppliedForInvoice: jest.fn(),
      findOutstandingForGuardian: jest.fn(),
      getAvailableCredit: jest.fn(),
    } as unknown as jest.Mocked<PaymentAllocationRepository>;

    invoiceService = {
      recomputePaymentState: jest.fn(),
    } as unknown as jest.Mocked<InvoiceService>;

    currentTenant = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as unknown as jest.Mocked<CurrentTenantProvider>;

    service = new PaymentAllocationService(repository, invoiceService, currentTenant);
  });

  describe('allocate', () => {
    it('fully allocates a payment to a single outstanding invoice that covers it', async () => {
      repository.findOutstandingForGuardian.mockResolvedValue([
        { id: 'invoice-1', totalAmount: new Prisma.Decimal(500) },
      ] as never);
      repository.sumAppliedForInvoice.mockResolvedValue(new Prisma.Decimal(0));
      repository.create.mockResolvedValue({ id: 'allocation-1', amountApplied: new Prisma.Decimal(500) } as never);

      const result = await service.allocate('tx' as never, 'tenant-1', 'payment-1', 'guardian-1', '500', 'user-1');

      expect(repository.create).toHaveBeenCalledWith(
        'tx',
        'tenant-1',
        { paymentId: 'payment-1', invoiceId: 'invoice-1', amountApplied: expect.any(Prisma.Decimal) },
        'user-1',
      );
      expect(invoiceService.recomputePaymentState).toHaveBeenCalledWith('tx', 'tenant-1', 'invoice-1', 'user-1');
      expect(result).toEqual([{ id: 'allocation-1', amountApplied: new Prisma.Decimal(500) }]);
    });

    it('spills across multiple invoices oldest-first when one invoice cannot absorb the full amount', async () => {
      repository.findOutstandingForGuardian.mockResolvedValue([
        { id: 'invoice-1', totalAmount: new Prisma.Decimal(300) },
        { id: 'invoice-2', totalAmount: new Prisma.Decimal(400) },
      ] as never);
      repository.sumAppliedForInvoice.mockResolvedValue(new Prisma.Decimal(0));
      repository.create
        .mockResolvedValueOnce({ id: 'allocation-1', amountApplied: new Prisma.Decimal(300) } as never)
        .mockResolvedValueOnce({ id: 'allocation-2', amountApplied: new Prisma.Decimal(200) } as never);

      const result = await service.allocate('tx' as never, 'tenant-1', 'payment-1', 'guardian-1', '500', 'user-1');

      expect(repository.create).toHaveBeenNthCalledWith(
        1,
        'tx',
        'tenant-1',
        expect.objectContaining({ invoiceId: 'invoice-1' }),
        'user-1',
      );
      expect(repository.create).toHaveBeenNthCalledWith(
        2,
        'tx',
        'tenant-1',
        expect.objectContaining({ invoiceId: 'invoice-2' }),
        'user-1',
      );
      expect(invoiceService.recomputePaymentState).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('leaves any remainder unallocated as credit once outstanding invoices are exhausted - not an error', async () => {
      repository.findOutstandingForGuardian.mockResolvedValue([
        { id: 'invoice-1', totalAmount: new Prisma.Decimal(100) },
      ] as never);
      repository.sumAppliedForInvoice.mockResolvedValue(new Prisma.Decimal(0));
      repository.create.mockResolvedValue({ id: 'allocation-1', amountApplied: new Prisma.Decimal(100) } as never);

      const result = await service.allocate('tx' as never, 'tenant-1', 'payment-1', 'guardian-1', '500', 'user-1');

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    it('returns no allocations when the guardian has no outstanding invoices - the whole amount becomes credit', async () => {
      repository.findOutstandingForGuardian.mockResolvedValue([]);

      const result = await service.allocate('tx' as never, 'tenant-1', 'payment-1', 'guardian-1', '500', 'user-1');

      expect(repository.create).not.toHaveBeenCalled();
      expect(invoiceService.recomputePaymentState).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getAvailableCredit', () => {
    it('resolves tenantId and delegates to the repository', async () => {
      repository.getAvailableCredit.mockResolvedValue('150.00');
      const result = await service.getAvailableCredit('guardian-1');
      expect(repository.getAvailableCredit).toHaveBeenCalledWith('tenant-1', 'guardian-1');
      expect(result).toBe('150.00');
    });
  });
});
