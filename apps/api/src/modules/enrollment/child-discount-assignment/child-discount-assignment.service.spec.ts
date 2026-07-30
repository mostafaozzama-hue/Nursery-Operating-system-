import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { ChildDiscountAssignmentConflictError } from './child-discount-assignment-conflict.error';
import { ChildDiscountAssignmentRepository } from './child-discount-assignment.repository';
import { ChildDiscountAssignmentService } from './child-discount-assignment.service';

describe('ChildDiscountAssignmentService', () => {
  let repository: jest.Mocked<ChildDiscountAssignmentRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: ChildDiscountAssignmentService;

  beforeEach(() => {
    repository = {
      assign: jest.fn(),
      expire: jest.fn(),
      findForChild: jest.fn(),
      findEffectiveForPeriod: jest.fn(),
    } as unknown as jest.Mocked<ChildDiscountAssignmentRepository>;

    currentTenant = {
      getTenantId: jest.fn().mockReturnValue('tenant-1'),
    } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new ChildDiscountAssignmentService(repository, currentTenant, currentUser);
  });

  describe('assign', () => {
    it('passes the resolved tenant, childId, discountId, dto, and user to the repository', async () => {
      const dto = { effectiveFrom: '2026-09-01' };
      repository.assign.mockResolvedValue({ id: 'assignment-1' } as never);

      const result = await service.assign('child-1', 'discount-1', dto);

      expect(repository.assign).toHaveBeenCalledWith(
        'tenant-1',
        'child-1',
        { discountId: 'discount-1', effectiveFrom: '2026-09-01' },
        'user-1',
      );
      expect(result).toEqual({ id: 'assignment-1' });
    });

    it('passes an optional effectiveTo through when supplied (bounded promo)', async () => {
      repository.assign.mockResolvedValue({ id: 'assignment-1' } as never);

      await service.assign('child-1', 'discount-1', { effectiveFrom: '2026-09-01', effectiveTo: '2026-12-01' });

      expect(repository.assign).toHaveBeenCalledWith(
        'tenant-1',
        'child-1',
        { discountId: 'discount-1', effectiveFrom: '2026-09-01', effectiveTo: '2026-12-01' },
        'user-1',
      );
    });

    it('translates a ChildDiscountAssignmentConflictError into a 409', async () => {
      repository.assign.mockRejectedValue(
        new ChildDiscountAssignmentConflictError('This Discount is already assigned to this Child'),
      );
      await expect(service.assign('child-1', 'discount-1', { effectiveFrom: '2026-09-01' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('translates a missing Child or Discount into a 404', async () => {
      repository.assign.mockRejectedValue(new EntityNotFoundError('Discount', 'discount-1'));
      await expect(service.assign('child-1', 'discount-1', { effectiveFrom: '2026-09-01' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('expire', () => {
    it('passes tenant, childId, discountId, effectiveTo, and user to the repository', async () => {
      repository.expire.mockResolvedValue(undefined as never);
      await service.expire('child-1', 'discount-1', { effectiveTo: '2026-12-01' });
      expect(repository.expire).toHaveBeenCalledWith('tenant-1', 'child-1', 'discount-1', '2026-12-01', 'user-1');
    });

    it('translates a ChildDiscountAssignmentConflictError into a 409', async () => {
      repository.expire.mockRejectedValue(
        new ChildDiscountAssignmentConflictError('This Discount is not currently assigned to this Child'),
      );
      await expect(service.expire('child-1', 'discount-1', { effectiveTo: '2026-12-01' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findForChild', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findForChild.mockResolvedValue({
        items: [{ id: 'assignment-1' }, { id: 'assignment-2' }],
        total: 2,
      } as never);

      const result = await service.findForChild('child-1', {
        page: 1,
        pageSize: 20,
        sortBy: 'effectiveFrom',
        sortOrder: 'desc',
      } as never);

      expect(repository.findForChild).toHaveBeenCalledWith('tenant-1', 'child-1', expect.objectContaining({ page: 1 }));
      expect(result).toEqual({
        data: [{ id: 'assignment-1' }, { id: 'assignment-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });

    it('translates a missing Child into a 404', async () => {
      repository.findForChild.mockRejectedValue(new EntityNotFoundError('Child', 'child-1'));
      await expect(
        service.findForChild('child-1', { page: 1, pageSize: 20, sortBy: 'effectiveFrom', sortOrder: 'desc' } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findEffectiveForPeriod', () => {
    it('passes through with an explicit tenantId, never resolving via CurrentTenantProvider', async () => {
      repository.findEffectiveForPeriod.mockResolvedValue([{ id: 'assignment-1' }] as never);

      const result = await service.findEffectiveForPeriod('tenant-x', 'child-1', '2026-09-01', '2026-09-30');

      expect(repository.findEffectiveForPeriod).toHaveBeenCalledWith(
        'tenant-x',
        'child-1',
        '2026-09-01',
        '2026-09-30',
        undefined,
      );
      expect(currentTenant.getTenantId).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: 'assignment-1' }]);
    });

    it('returns an empty array cleanly when no discounts are assigned', async () => {
      repository.findEffectiveForPeriod.mockResolvedValue([] as never);
      await expect(
        service.findEffectiveForPeriod('tenant-1', 'child-1', '2026-09-01', '2026-09-30'),
      ).resolves.toEqual([]);
    });
  });
});
