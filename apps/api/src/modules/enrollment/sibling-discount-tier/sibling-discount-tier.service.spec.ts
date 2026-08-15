import { ConflictException } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { SiblingDiscountTierConflictError } from './sibling-discount-tier-conflict.error';
import { SiblingDiscountTierRepository } from './sibling-discount-tier.repository';
import { SiblingDiscountTierService } from './sibling-discount-tier.service';

describe('SiblingDiscountTierService', () => {
  let repository: jest.Mocked<SiblingDiscountTierRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: SiblingDiscountTierService;

  beforeEach(() => {
    repository = {
      setTier: jest.fn(),
      findMany: jest.fn(),
      findEffective: jest.fn(),
    } as unknown as jest.Mocked<SiblingDiscountTierRepository>;

    currentTenant = {
      getTenantId: jest.fn().mockReturnValue('tenant-1'),
    } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new SiblingDiscountTierService(repository, currentTenant, currentUser);
  });

  describe('setTier', () => {
    it('passes the resolved tenant, dto, and user to the repository', async () => {
      const dto = { siblingCountThreshold: 2, discountPercentage: 10, effectiveFrom: '2026-09-01' };
      repository.setTier.mockResolvedValue({ id: 'tier-1' } as never);

      const result = await service.setTier(dto);

      expect(repository.setTier).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
      expect(result).toEqual({ id: 'tier-1' });
    });

    it('translates a SiblingDiscountTierConflictError into a 409', async () => {
      repository.setTier.mockRejectedValue(
        new SiblingDiscountTierConflictError("effectiveFrom must be after the current tier period's own effectiveFrom"),
      );
      await expect(
        service.setTier({ siblingCountThreshold: 2, discountPercentage: 10, effectiveFrom: '2020-01-01' } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('translates a lost close-race conflict into a 409', async () => {
      repository.setTier.mockRejectedValue(new SiblingDiscountTierConflictError('This tier was changed concurrently - please retry'));
      await expect(
        service.setTier({ siblingCountThreshold: 2, discountPercentage: 10, effectiveFrom: '2026-09-01' } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('translates a raw unique-constraint violation (brand-new-threshold race) into a 409', async () => {
      repository.setTier.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );
      await expect(
        service.setTier({ siblingCountThreshold: 4, discountPercentage: 25, effectiveFrom: '2026-09-01' } as never),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({
        items: [{ id: 'tier-1' }, { id: 'tier-2' }],
        total: 2,
      } as never);

      const result = await service.findAll({
        page: 1,
        pageSize: 20,
        sortBy: 'effectiveFrom',
        sortOrder: 'desc',
      } as never);

      expect(repository.findMany).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ page: 1 }));
      expect(result).toEqual({
        data: [{ id: 'tier-1' }, { id: 'tier-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });
  });

  describe('findEffective', () => {
    it('passes through with an explicit tenantId, never resolving via CurrentTenantProvider', async () => {
      repository.findEffective.mockResolvedValue([{ id: 'tier-1' }, { id: 'tier-2' }] as never);

      const result = await service.findEffective('tenant-x', '2026-09-15');

      expect(repository.findEffective).toHaveBeenCalledWith('tenant-x', '2026-09-15', undefined);
      expect(currentTenant.getTenantId).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: 'tier-1' }, { id: 'tier-2' }]);
    });

    it('returns an empty array cleanly when no tiers are configured', async () => {
      repository.findEffective.mockResolvedValue([] as never);
      await expect(service.findEffective('tenant-1', '2026-09-15')).resolves.toEqual([]);
    });
  });
});
