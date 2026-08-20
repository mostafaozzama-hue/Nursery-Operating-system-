import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { PaymentAllocationError } from '../payment-allocation/payment-allocation.error';
import { PaymentAllocationService } from '../payment-allocation/payment-allocation.service';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let repository: jest.Mocked<PaymentRepository>;
  let paymentAllocation: jest.Mocked<PaymentAllocationService>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: PaymentService;

  beforeEach(() => {
    repository = {
      runInTransaction: jest.fn().mockImplementation((tenantId, fn) => fn('tx' as never)),
      createComposable: jest.fn(),
      findForGuardian: jest.fn(),
      getSummary: jest.fn(),
    } as unknown as jest.Mocked<PaymentRepository>;

    paymentAllocation = {
      allocate: jest.fn(),
    } as unknown as jest.Mocked<PaymentAllocationService>;

    currentTenant = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new PaymentService(repository, paymentAllocation, currentTenant, currentUser);
  });

  describe('record', () => {
    it('creates the Payment then allocates it, inside one transaction', async () => {
      const dto = { amount: 250, paymentMethod: 'CASH' as const };
      repository.createComposable.mockResolvedValue({ id: 'payment-1', amount: new Prisma.Decimal(250) } as never);
      paymentAllocation.allocate.mockResolvedValue([] as never);

      const result = await service.record('guardian-1', dto);

      expect(repository.createComposable).toHaveBeenCalledWith('tx', 'tenant-1', 'guardian-1', dto, 'user-1');
      expect(paymentAllocation.allocate).toHaveBeenCalledWith('tx', 'tenant-1', 'payment-1', 'guardian-1', '250', 'user-1');
      expect(result).toEqual({ id: 'payment-1', amount: new Prisma.Decimal(250) });
    });

    it('translates a not-found guardian into a 404', async () => {
      repository.createComposable.mockRejectedValue(new EntityNotFoundError('Guardian', 'guardian-1'));
      await expect(
        service.record('guardian-1', { amount: 100, paymentMethod: 'CASH' as const }),
      ).rejects.toThrow(NotFoundException);
    });

    it('translates a PaymentAllocationError into a 409', async () => {
      repository.createComposable.mockResolvedValue({ id: 'payment-1', amount: new Prisma.Decimal(100) } as never);
      paymentAllocation.allocate.mockRejectedValue(new PaymentAllocationError('over-allocated'));
      await expect(
        service.record('guardian-1', { amount: 100, paymentMethod: 'CASH' as const }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findForGuardian', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findForGuardian.mockResolvedValue({
        items: [{ id: 'payment-1' }],
        total: 1,
      } as never);

      const result = await service.findForGuardian('guardian-1', {
        page: 1,
        pageSize: 20,
        sortBy: 'paidAt',
        sortOrder: 'desc',
      } as never);

      expect(repository.findForGuardian).toHaveBeenCalledWith('tenant-1', 'guardian-1', expect.objectContaining({ page: 1 }));
      expect(result).toEqual({
        data: [{ id: 'payment-1' }],
        meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      });
    });

    it('translates a not-found guardian into a 404', async () => {
      repository.findForGuardian.mockRejectedValue(new EntityNotFoundError('Guardian', 'guardian-1'));
      await expect(
        service.findForGuardian('guardian-1', { page: 1, pageSize: 20, sortBy: 'paidAt', sortOrder: 'desc' } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSummary', () => {
    it('passes the resolved tenant and query through to the repository', async () => {
      const query = { from: '2026-08-01', to: '2026-09-01' };
      repository.getSummary.mockResolvedValue({ collectedAmount: '500' } as never);

      const result = await service.getSummary(query);

      expect(repository.getSummary).toHaveBeenCalledWith('tenant-1', query);
      expect(result).toEqual({ collectedAmount: '500' });
    });
  });
});
