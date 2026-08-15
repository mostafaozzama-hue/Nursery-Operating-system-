import { NotFoundException } from '@nestjs/common';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { PlanRepository } from './plan.repository';
import { PlanService } from './plan.service';

describe('PlanService', () => {
  let repository: jest.Mocked<PlanRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: PlanService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOneOrThrow: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as unknown as jest.Mocked<PlanRepository>;

    currentTenant = {
      getTenantId: jest.fn().mockReturnValue('tenant-1'),
    } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new PlanService(repository, currentTenant, currentUser);
  });

  describe('create', () => {
    it('passes the resolved tenant, dto, and user to the repository', async () => {
      const dto = { name: 'Full Time', billingCycle: 'MONTHLY', scheduleDaysOfWeek: ['MON', 'TUE'] } as never;
      repository.create.mockResolvedValue({ id: 'plan-1' } as never);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
      expect(result).toEqual({ id: 'plan-1' });
    });
  });

  describe('findAll', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({
        items: [{ id: 'plan-1' }, { id: 'plan-2' }],
        total: 2,
      } as never);

      const result = await service.findAll({
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      } as never);

      expect(repository.findMany).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ page: 1 }));
      expect(result).toEqual({
        data: [{ id: 'plan-1' }, { id: 'plan-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('returns the plan when found', async () => {
      repository.findOneOrThrow.mockResolvedValue({ id: 'plan-1' } as never);
      await expect(service.findOne('plan-1')).resolves.toEqual({ id: 'plan-1' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.findOneOrThrow.mockRejectedValue(new EntityNotFoundError('Plan', 'plan-1'));
      await expect(service.findOne('plan-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('passes tenant, id, dto, and user to the repository', async () => {
      repository.update.mockResolvedValue({ id: 'plan-1', name: 'Half Time' } as never);

      const result = await service.update('plan-1', { name: 'Half Time' });

      expect(repository.update).toHaveBeenCalledWith('tenant-1', 'plan-1', { name: 'Half Time' }, 'user-1');
      expect(result).toEqual({ id: 'plan-1', name: 'Half Time' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.update.mockRejectedValue(new EntityNotFoundError('Plan', 'plan-1'));
      await expect(service.update('plan-1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('setActive', () => {
    it('passes tenant, id, isActive, and user to the repository', async () => {
      repository.setActive.mockResolvedValue({ id: 'plan-1', isActive: false } as never);

      const result = await service.setActive('plan-1', false);

      expect(repository.setActive).toHaveBeenCalledWith('tenant-1', 'plan-1', false, 'user-1');
      expect(result).toEqual({ id: 'plan-1', isActive: false });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.setActive.mockRejectedValue(new EntityNotFoundError('Plan', 'plan-1'));
      await expect(service.setActive('plan-1', true)).rejects.toThrow(NotFoundException);
    });
  });
});
