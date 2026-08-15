import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { PlanPriceConflictError } from './plan-price-conflict.error';
import { PlanPriceRepository } from './plan-price.repository';
import { PlanPriceService } from './plan-price.service';

describe('PlanPriceService', () => {
  let repository: jest.Mocked<PlanPriceRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: PlanPriceService;

  beforeEach(() => {
    repository = {
      setPrice: jest.fn(),
      findMany: jest.fn(),
      findEffective: jest.fn(),
    } as unknown as jest.Mocked<PlanPriceRepository>;

    currentTenant = {
      getTenantId: jest.fn().mockReturnValue('tenant-1'),
    } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new PlanPriceService(repository, currentTenant, currentUser);
  });

  describe('setPrice', () => {
    it('passes the resolved tenant, planId, dto, and user to the repository', async () => {
      const dto = { amount: 4500, effectiveFrom: '2026-09-01' };
      repository.setPrice.mockResolvedValue({ id: 'price-1' } as never);

      const result = await service.setPrice('plan-1', dto);

      expect(repository.setPrice).toHaveBeenCalledWith('tenant-1', 'plan-1', dto, 'user-1');
      expect(result).toEqual({ id: 'price-1' });
    });

    it('translates a PlanPriceConflictError into a 409', async () => {
      repository.setPrice.mockRejectedValue(
        new PlanPriceConflictError("effectiveFrom must be after the current price period's own effectiveFrom"),
      );
      await expect(
        service.setPrice('plan-1', { amount: 100, effectiveFrom: '2020-01-01' } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('translates a not-found plan into a 404', async () => {
      repository.setPrice.mockRejectedValue(new EntityNotFoundError('Plan', 'plan-1'));
      await expect(
        service.setPrice('plan-1', { amount: 100, effectiveFrom: '2026-09-01' } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findHistory', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({
        items: [{ id: 'price-1' }, { id: 'price-2' }],
        total: 2,
      } as never);

      const result = await service.findHistory('plan-1', {
        page: 1,
        pageSize: 20,
        sortBy: 'effectiveFrom',
        sortOrder: 'desc',
      } as never);

      expect(repository.findMany).toHaveBeenCalledWith('tenant-1', 'plan-1', expect.objectContaining({ page: 1 }));
      expect(result).toEqual({
        data: [{ id: 'price-1' }, { id: 'price-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });

    it('translates a not-found plan into a 404', async () => {
      repository.findMany.mockRejectedValue(new EntityNotFoundError('Plan', 'plan-1'));
      await expect(
        service.findHistory('plan-1', { page: 1, pageSize: 20, sortBy: 'effectiveFrom', sortOrder: 'desc' } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findEffective', () => {
    it('passes through with an explicit tenantId, never resolving via CurrentTenantProvider', async () => {
      repository.findEffective.mockResolvedValue({ id: 'price-1' } as never);

      const result = await service.findEffective('tenant-x', 'plan-1', '2026-09-15');

      expect(repository.findEffective).toHaveBeenCalledWith('tenant-x', 'plan-1', '2026-09-15', undefined);
      expect(currentTenant.getTenantId).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'price-1' });
    });
  });
});
